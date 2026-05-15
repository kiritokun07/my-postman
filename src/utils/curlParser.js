/**
 * Parse a curl command into its request components
 */
export function parseCurl(curlStr) {
  // Normalize multiline curl (backslash line continuations)
  const cleaned = curlStr
    .replace(/\\\r\n/g, ' ')
    .replace(/\\\n/g, ' ')
    .replace(/\r\n/g, ' ')
    .trim()

  const result = {
    method: 'GET',
    url: '',
    headers: {},
    body: '',
    bodyType: 'none',
  }

  const tokens = tokenize(cleaned)
  if (!tokens.length) return result

  let i = tokens[0].toLowerCase() === 'curl' ? 1 : 0

  while (i < tokens.length) {
    const tok = tokens[i]

    if (tok === '-X' || tok === '--request') {
      result.method = (tokens[++i] || 'GET').toUpperCase()
    } else if (tok === '-H' || tok === '--header') {
      const raw = tokens[++i] || ''
      const colon = raw.indexOf(':')
      if (colon > 0) {
        const k = raw.slice(0, colon).trim()
        const v = raw.slice(colon + 1).trim()
        result.headers[k] = v
      }
    } else if (
      tok === '-d' ||
      tok === '--data' ||
      tok === '--data-raw' ||
      tok === '--data-binary'
    ) {
      result.body = tokens[++i] || ''
      if (result.method === 'GET') result.method = 'POST'
    } else if (tok === '--data-urlencode') {
      const part = tokens[++i] || ''
      result.body = result.body ? result.body + '&' + part : part
      if (result.method === 'GET') result.method = 'POST'
      result.bodyType = 'urlencoded'
    } else if (tok === '-u' || tok === '--user') {
      const up = tokens[++i] || ''
      result.headers['Authorization'] = 'Basic ' + btoa(up)
    } else if (tok === '-b' || tok === '--cookie') {
      result.headers['Cookie'] = tokens[++i] || ''
    } else if (tok === '-A' || tok === '--user-agent') {
      result.headers['User-Agent'] = tokens[++i] || ''
    } else if (tok === '--compressed') {
      result.headers['Accept-Encoding'] = result.headers['Accept-Encoding'] || 'gzip, deflate, br'
    } else if (
      tok === '-L' || tok === '--location' ||
      tok === '-s' || tok === '--silent' ||
      tok === '-v' || tok === '--verbose' ||
      tok === '-k' || tok === '--insecure' ||
      tok === '-i' || tok === '--include' ||
      tok === '--no-keepalive'
    ) {
      // skip flag-only options
    } else if (!tok.startsWith('-')) {
      // Could be the URL
      if (!result.url) {
        result.url = tok.replace(/^['"]|['"]$/g, '')
      }
    }

    i++
  }

  // Determine body type from Content-Type header
  if (result.body) {
    const ct = (
      result.headers['Content-Type'] ||
      result.headers['content-type'] ||
      ''
    ).toLowerCase()

    if (ct.includes('application/json')) {
      result.bodyType = 'json'
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      result.bodyType = 'urlencoded'
    } else {
      result.bodyType = result.bodyType === 'urlencoded' ? 'urlencoded' : 'raw'
    }
  }

  return result
}

/**
 * Generate a curl command string from request parts
 */
export function generateCurl({ method, url, headers = {}, body = '' }) {
  const lines = [`curl -X ${method} '${url}'`]
  Object.entries(headers).forEach(([k, v]) => {
    lines.push(`  -H '${k}: ${v}'`)
  })
  if (body) {
    // Escape single quotes in body
    const safeBody = body.replace(/'/g, "'\\''")
    lines.push(`  -d '${safeBody}'`)
  }
  return lines.join(' \\\n')
}

// --------------- tokenizer ---------------
function tokenize(str) {
  const tokens = []
  let cur = ''
  let inSingle = false
  let inDouble = false
  let i = 0

  while (i < str.length) {
    const ch = str[i]

    if (ch === '\\' && inDouble && i + 1 < str.length) {
      cur += str[i + 1]
      i += 2
      continue
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
      i++
      continue
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
      i++
      continue
    }
    if ((ch === ' ' || ch === '\t') && !inSingle && !inDouble) {
      if (cur) { tokens.push(cur); cur = '' }
      i++
      continue
    }
    cur += ch
    i++
  }

  if (cur) tokens.push(cur)
  return tokens
}
