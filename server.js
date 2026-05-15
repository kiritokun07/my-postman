const express = require('express')
const axios = require('axios')
const cors = require('cors')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Proxy endpoint - forwards requests to avoid browser CORS
app.post('/api/proxy', async (req, res) => {
  const { method, url, headers, body } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    const startTime = Date.now()

    const axiosConfig = {
      method: (method || 'GET').toUpperCase(),
      url,
      headers: headers || {},
      validateStatus: () => true, // Don't throw on any HTTP status
      responseType: 'arraybuffer',
      timeout: 60000,
      maxRedirects: 5,
    }

    // Attach body for non-GET requests
    if (body !== undefined && body !== null && body !== '') {
      axiosConfig.data = body
    }

    const response = await axios(axiosConfig)
    const duration = Date.now() - startTime

    // Collect response headers
    const responseHeaders = {}
    Object.entries(response.headers || {}).forEach(([key, value]) => {
      responseHeaders[key] = value
    })

    const contentType = (response.headers['content-type'] || '').toLowerCase()
    const isText =
      contentType.includes('application/json') ||
      contentType.includes('text/') ||
      contentType.includes('application/xml') ||
      contentType.includes('application/javascript') ||
      contentType.includes('application/x-www-form-urlencoded')

    let responseBody
    let isBase64 = false

    if (isText) {
      responseBody = Buffer.from(response.data).toString('utf-8')
    } else {
      responseBody = Buffer.from(response.data).toString('base64')
      isBase64 = true
    }

    // Compute response size
    const size = response.data.length

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      duration,
      size,
      isBase64,
    })
  } catch (err) {
    const errInfo = {
      error: err.message,
      code: err.code,
    }
    if (err.code === 'ECONNREFUSED') {
      errInfo.error = `Connection refused: ${url}`
    } else if (err.code === 'ENOTFOUND') {
      errInfo.error = `Host not found: ${url}`
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      errInfo.error = `Request timed out: ${url}`
    }
    res.status(502).json(errInfo)
  }
})

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`\x1b[32m✓\x1b[0m Proxy server running at \x1b[36mhttp://localhost:${PORT}\x1b[0m`)
})
