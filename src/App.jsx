import React, { useState, useEffect, useRef } from 'react'
import { parseCurl, generateCurl } from './utils/curlParser'
import { saveToHistory, getHistory, clearHistory } from './utils/storage'
import { proxyRequest } from './utils/proxy'
import { insertAtCursor } from './utils/editor'
import HeadersEditor from './components/HeadersEditor'
import BodyEditor from './components/BodyEditor'
import ResponsePanel from './components/ResponsePanel'
import HistoryPanel from './components/HistoryPanel'
import CsvBatch from './components/CsvBatch'
import ThemeToggle from './components/ThemeToggle'
import { getThemeMode, setThemeMode, watchSystemTheme } from './utils/theme'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const EMPTY_HEADER = () => ({ key: '', value: '', enabled: true })

export default function App() {
  // ─── Request state ────────────────────────────────────────────────────────
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState([EMPTY_HEADER()])
  const [body, setBody] = useState('')
  const [bodyType, setBodyType] = useState('none')

  // ─── Response / loading state ─────────────────────────────────────────────
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('headers')
  const [showSidebar, setShowSidebar] = useState(true)
  const [showCurlModal, setShowCurlModal] = useState(false)
  const [curlInput, setCurlInput] = useState('')
  const [curlError, setCurlError] = useState('')
  const [showCurlOutput, setShowCurlOutput] = useState(false)
  const [toast, setToast] = useState(null)
  const [themeMode, setThemeModeState] = useState(getThemeMode)

  // ─── History ──────────────────────────────────────────────────────────────
  const [history, setHistory] = useState([])

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  useEffect(() => {
    return watchSystemTheme(() => setThemeModeState(getThemeMode()))
  }, [])

  const handleThemeChange = (mode) => {
    setThemeMode(mode)
    setThemeModeState(mode)
  }

  // ─── Drag-to-resize: request panel height ────────────────────────────────
  const [reqPanelHeight, setReqPanelHeight] = useState(280)
  const isDraggingRef = useRef(false)
  const dragStartYRef = useRef(0)
  const dragStartHeightRef = useRef(0)
  const urlInputRef = useRef(null)
  const bodyTextareaRef = useRef(null)
  const lastFocusedRef = useRef('url')

  const onResizeMouseDown = (e) => {
    isDraggingRef.current = true
    dragStartYRef.current = e.clientY
    dragStartHeightRef.current = reqPanelHeight
    e.preventDefault()
  }

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return
      const delta = e.clientY - dragStartYRef.current
      const next = Math.max(80, Math.min(680, dragStartHeightRef.current + delta))
      setReqPanelHeight(next)
    }
    const onMouseUp = () => { isDraggingRef.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // ─── Computed: active header count ────────────────────────────────────────
  const activeHeaderCount = headers.filter((h) => h.key && h.enabled !== false).length

  // ─── Send request ─────────────────────────────────────────────────────────
  const sendRequest = async () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    setIsLoading(true)
    setError(null)
    setResponse(null)

    // Build headers object
    const headersObj = {}
    headers.forEach(({ key, value, enabled }) => {
      if (key && enabled !== false) headersObj[key] = value
    })

    // Auto Content-Type
    if (body && bodyType !== 'none') {
      if (!headersObj['Content-Type']) {
        if (bodyType === 'json') headersObj['Content-Type'] = 'application/json'
        else if (bodyType === 'urlencoded') headersObj['Content-Type'] = 'application/x-www-form-urlencoded'
      }
    }

    const requestBody = {
      method,
      url: trimmedUrl,
      headers: headersObj,
      body: bodyType !== 'none' && body ? body : undefined,
    }

    try {
      const data = await proxyRequest(requestBody)

      setResponse(data)

      // Persist to history
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        method,
        url: trimmedUrl,
        headers: headersObj,
        body: bodyType !== 'none' ? body : '',
        response: data,
      }
      const updated = saveToHistory(record)
      setHistory(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Import cURL ──────────────────────────────────────────────────────────
  const importCurl = () => {
    if (!curlInput.trim()) return
    try {
      const parsed = parseCurl(curlInput)
      if (!parsed.url) {
        setCurlError('Could not extract a URL from the cURL command.')
        return
      }
      setMethod(parsed.method)
      setUrl(parsed.url)

      const newHeaders = Object.entries(parsed.headers).map(([key, value]) => ({
        key, value, enabled: true,
      }))
      setHeaders(newHeaders.length ? [...newHeaders, EMPTY_HEADER()] : [EMPTY_HEADER()])
      setBody(parsed.body || '')
      setBodyType(parsed.body ? (parsed.bodyType || 'raw') : 'none')

      setShowCurlModal(false)
      setCurlInput('')
      setCurlError('')
      showToast('cURL imported successfully')
    } catch (e) {
      setCurlError('Failed to parse cURL: ' + e.message)
    }
  }

  // ─── Load history item ────────────────────────────────────────────────────
  const loadFromHistory = (record) => {
    setMethod(record.method || 'GET')
    setUrl(record.url || '')
    const h = Object.entries(record.headers || {}).map(([key, value]) => ({
      key, value, enabled: true,
    }))
    setHeaders(h.length ? [...h, EMPTY_HEADER()] : [EMPTY_HEADER()])
    setBody(record.body || '')
    setBodyType(record.body ? 'raw' : 'none')
    setResponse(record.response || null)
    setError(null)
  }

  // ─── Clear request inputs ─────────────────────────────────────────────────
  const clearInputs = () => {
    setHeaders([EMPTY_HEADER()])
    setBody('')
    setBodyType('none')
    showToast('Headers and body cleared')
  }

  const insertParam = (col) => {
    const ph = `{{${col}}}`
    if (lastFocusedRef.current === 'body') {
      insertAtCursor(bodyTextareaRef.current, ph, () => body, setBody)
    } else {
      insertAtCursor(urlInputRef.current, ph, () => url, setUrl)
    }
  }

  // ─── Copy cURL ────────────────────────────────────────────────────────────
  const copyAsCurl = () => {
    const headersObj = {}
    headers.forEach(({ key, value, enabled }) => {
      if (key && enabled !== false) headersObj[key] = value
    })
    const curl = generateCurl({ method, url, headers: headersObj, body: bodyType !== 'none' ? body : '' })
    navigator.clipboard.writeText(curl)
    showToast('cURL copied to clipboard')
  }

  // ─── Toast helper ─────────────────────────────────────────────────────────
  const toastTimer = useRef(null)
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1800)
  }

  // ─── Keyboard shortcut: Ctrl+Enter to send ────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendRequest()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [url, method, headers, body, bodyType])

  // ─── Current cURL output ──────────────────────────────────────────────────
  const showResponse = activeTab !== 'csv'

  const curlOutput = (() => {
    const headersObj = {}
    headers.forEach(({ key, value, enabled }) => {
      if (key && enabled !== false) headersObj[key] = value
    })
    return generateCurl({ method, url, headers: headersObj, body: bodyType !== 'none' ? body : '' })
  })()

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">My Postman</span>
        </div>
        <div className="header-actions">
          <ThemeToggle mode={themeMode} onChange={handleThemeChange} />
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
            onClick={() => setShowCurlOutput(!showCurlOutput)}
            title="View current request as cURL"
          >
            {'{ }'} cURL
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12 }}
            onClick={() => { setShowCurlModal(true); setCurlError('') }}
          >
            ↑ Import cURL
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="app-body">
        {/* Sidebar */}
        {showSidebar && (
          <HistoryPanel
            history={history}
            onLoad={loadFromHistory}
            onClear={() => { clearHistory(); setHistory([]) }}
            onDelete={(updated) => setHistory(updated)}
          />
        )}

        {/* Main content */}
        <main className="main-content">
          {/* URL Bar */}
          <div className="url-bar">
            <button
              className="sidebar-toggle"
              onClick={() => setShowSidebar(!showSidebar)}
              title="Toggle history"
            >
              ☰
            </button>

            <select
              className="method-select"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <input
              ref={urlInputRef}
              className="url-input"
              type="text"
              placeholder="https://api.example.com/endpoint"
              value={url}
              onFocus={() => { lastFocusedRef.current = 'url' }}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
            />

            <div className="url-bar-btns">
              <button
                className="btn btn-ghost btn-icon"
                title="Copy as cURL (Ctrl+Enter to send)"
                onClick={copyAsCurl}
              >
                📋
              </button>
              <button
                className={`btn btn-send${isLoading ? ' sending' : ''}`}
                onClick={sendRequest}
                disabled={isLoading || !url.trim()}
                title="Send request (Ctrl+Enter)"
              >
                {isLoading ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>

          {/* Request tabs */}
          <div
            className="request-section"
            style={showResponse ? { height: reqPanelHeight } : { flex: 1, minHeight: 0 }}
          >
            <div className="tab-bar">
              <button
                className={`tab-btn${activeTab === 'headers' ? ' active' : ''}`}
                onClick={() => setActiveTab('headers')}
              >
                Headers
                {activeHeaderCount > 0 && (
                  <span className="tab-badge">{activeHeaderCount}</span>
                )}
              </button>
              <button
                className={`tab-btn${activeTab === 'body' ? ' active' : ''}`}
                onClick={() => setActiveTab('body')}
              >
                Body
                {bodyType !== 'none' && body && (
                  <span className="tab-badge" style={{ background: 'var(--peach)' }}>●</span>
                )}
              </button>
              <button
                className={`tab-btn${activeTab === 'csv' ? ' active' : ''}`}
                onClick={() => setActiveTab('csv')}
              >
                CSV Batch
              </button>
              <button
                className="btn btn-ghost"
                style={{ marginLeft: 'auto', fontSize: 11, alignSelf: 'center' }}
                onClick={clearInputs}
                title="Clear headers and body"
              >
                ✕ Clear
              </button>
            </div>

            <div className="tab-content">
              {/* Always mounted — visibility toggled so state is preserved on tab switch */}
              <div style={{ display: activeTab === 'headers' ? 'block' : 'none' }}>
                <HeadersEditor headers={headers} onChange={setHeaders} />
              </div>
              <div style={{ display: activeTab === 'body' ? 'block' : 'none' }}>
                <BodyEditor
                  body={body}
                  bodyType={bodyType}
                  onBodyChange={setBody}
                  onTypeChange={setBodyType}
                  textareaRef={bodyTextareaRef}
                  onTextareaFocus={() => { lastFocusedRef.current = 'body' }}
                />
              </div>
              <div style={{ display: activeTab === 'csv' ? 'block' : 'none' }}>
                <CsvBatch
                  method={method}
                  url={url}
                  body={body}
                  bodyType={bodyType}
                  headers={headers}
                  onInsertParam={insertParam}
                />
              </div>
            </div>
          </div>

          {showResponse && (
            <>
              {/* Drag resize handle */}
              <div className="resize-handle" onMouseDown={onResizeMouseDown} title="Drag to resize" />

              {/* Response */}
              <ResponsePanel response={response} error={error} isLoading={isLoading} />
            </>
          )}
        </main>
      </div>

      {/* ── Import cURL Modal ──────────────────────────────────────────── */}
      {showCurlModal && (
        <div className="modal-overlay" onClick={() => setShowCurlModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import cURL</h3>
              <button className="modal-close" onClick={() => setShowCurlModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">
                Paste a cURL command below. Supports -X, -H, -d, --data-raw, -u, -b, etc.
              </p>
              <textarea
                className="body-textarea"
                style={{ minHeight: 140, maxHeight: 300, fontFamily: 'Courier New, monospace', fontSize: 12 }}
                placeholder={'curl -X POST https://api.example.com/data \\\n  -H \'Content-Type: application/json\' \\\n  -d \'{"key": "value"}\''}
                value={curlInput}
                onChange={(e) => { setCurlInput(e.target.value); setCurlError('') }}
                spellCheck={false}
                autoFocus
              />
              {curlError && (
                <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>
                  ✕ {curlError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCurlModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={importCurl} disabled={!curlInput.trim()}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── cURL output Modal ─────────────────────────────────────────── */}
      {showCurlOutput && (
        <div className="modal-overlay" onClick={() => setShowCurlOutput(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Current Request as cURL</h3>
              <button className="modal-close" onClick={() => setShowCurlOutput(false)}>✕</button>
            </div>
            <div className="modal-body">
              <pre style={{
                background: 'var(--bg-surface0)',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'Courier New, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                color: 'var(--text)',
              }}>
                {curlOutput || '(Enter a URL first)'}
              </pre>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(curlOutput)
                  showToast('Copied!')
                  setShowCurlOutput(false)
                }}
              >
                📋 Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && <div className="copy-toast">✓ {toast}</div>}
    </div>
  )
}
