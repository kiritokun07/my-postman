import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import { proxyRequest } from '../utils/proxy'

// ── helpers ──────────────────────────────────────────────────────────────────

function substitute(template, row) {
  if (!template) return ''
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    row[key] !== undefined ? row[key] : `{{${key}}}`
  )
}

function statusClass(status) {
  if (!status) return 'status-err'
  if (status < 300) return 'status-2xx'
  if (status < 400) return 'status-3xx'
  if (status < 500) return 'status-4xx'
  return 'status-5xx'
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function tryPrettyJson(str) {
  try { return JSON.stringify(JSON.parse(str), null, 2) } catch { return str }
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetailModal({ result, onClose }) {
  if (!result) return null
  const reqBody = result.resolvedBody
  const resBody = result.responseBody || result.preview || ''
  const resBodyPretty = tryPrettyJson(resBody)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 'min(780px, 95vw)', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`method-badge method-${result.method}`}>{result.method}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--subtext1)', wordBreak: 'break-all' }}>
              {result.url}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Body — two columns: Request | Response */}
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16 }}>

          {/* ── Request ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="detail-section-title">Request</div>

            {/* Headers */}
            <div>
              <div className="detail-label">Headers</div>
              {Object.keys(result.requestHeaders || {}).length === 0 ? (
                <div style={{ color: 'var(--overlay0)', fontSize: 12 }}>— none —</div>
              ) : (
                <div className="detail-kv-list">
                  {Object.entries(result.requestHeaders || {}).map(([k, v]) => (
                    <div key={k} className="detail-kv-row">
                      <span className="detail-kv-key">{k}</span>
                      <span className="detail-kv-val">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Body */}
            <div>
              <div className="detail-label">Body</div>
              {reqBody ? (
                <pre className="detail-pre">{tryPrettyJson(reqBody)}</pre>
              ) : (
                <div style={{ color: 'var(--overlay0)', fontSize: 12 }}>— empty —</div>
              )}
            </div>
          </div>

          {/* ── Response ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="detail-section-title">
              Response
              {result.status && (
                <span className={`status-code ${statusClass(result.status)}`} style={{ fontSize: 13, marginLeft: 8 }}>
                  {result.status}
                </span>
              )}
              {result.duration && (
                <span style={{ fontSize: 11, color: 'var(--overlay0)', marginLeft: 8 }}>
                  {result.duration}ms
                </span>
              )}
            </div>

            {/* Response headers */}
            <div>
              <div className="detail-label">Headers</div>
              {Object.keys(result.responseHeaders || {}).length === 0 ? (
                <div style={{ color: 'var(--overlay0)', fontSize: 12 }}>— none —</div>
              ) : (
                <div className="detail-kv-list" style={{ maxHeight: 100 }}>
                  {Object.entries(result.responseHeaders || {}).map(([k, v]) => (
                    <div key={k} className="detail-kv-row">
                      <span className="detail-kv-key">{k}</span>
                      <span className="detail-kv-val">{Array.isArray(v) ? v.join(', ') : v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Response body */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <div className="detail-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Body</span>
                {resBody && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 10, padding: '1px 6px' }}
                    onClick={() => navigator.clipboard.writeText(resBodyPretty)}
                  >
                    📋 Copy
                  </button>
                )}
              </div>
              {result.error ? (
                <div className="response-error" style={{ margin: 0 }}>{result.error}</div>
              ) : resBody ? (
                <pre className="detail-pre" style={{ maxHeight: 240 }}>{resBodyPretty}</pre>
              ) : (
                <div style={{ color: 'var(--overlay0)', fontSize: 12 }}>— empty —</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CsvBatch({ method, url, body, bodyType, headers, onInsertParam }) {
  const [csvData, setCsvData] = useState(null)
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const [previewIndex, setPreviewIndex] = useState(0)

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState([])
  const [concurrency, setConcurrency] = useState(1)
  const [delay, setDelay] = useState(0)       // ms between batches
  const [selectedResult, setSelectedResult] = useState(null)

  const abortRef = useRef(false)
  const fileInputRef = useRef(null)

  // ── CSV ───────────────────────────────────────────────────────────────────

  const parseFile = (file) => {
    if (!file) return
    setFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setCsvData({ columns: result.meta.fields || [], rows: result.data })
        setPreviewIndex(0)
        setResults([])
      },
    })
  }

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); parseFile(e.dataTransfer.files[0]) }

  // ── Live preview ──────────────────────────────────────────────────────────

  const currentRow = csvData?.rows[previewIndex] || {}
  const previewUrl = substitute(url, currentRow)
  const previewBody = bodyType !== 'none' && body ? substitute(body, currentRow) : ''

  // ── Single request (stores full response) ─────────────────────────────────

  const sendOne = async (row, index) => {
    const resolvedUrl = substitute(url, row)
    const resolvedBody = bodyType !== 'none' && body ? substitute(body, row) : undefined

    const headersObj = {}
    ;(headers || []).forEach(({ key, value, enabled }) => {
      if (key && enabled !== false) headersObj[key] = value
    })

    try {
      const data = await proxyRequest({
        method,
        url: resolvedUrl,
        headers: headersObj,
        body: resolvedBody,
      })
      return {
        index: index + 1,
        method,
        url: resolvedUrl,
        resolvedBody: resolvedBody || '',
        requestHeaders: headersObj,
        status: data.status,
        statusText: data.statusText,
        duration: data.duration,
        responseHeaders: data.headers || {},
        responseBody: typeof data.body === 'string' ? data.body : '',
        preview: typeof data.body === 'string' ? data.body.slice(0, 160) : '',
        error: data.error,
      }
    } catch (err) {
      return {
        index: index + 1, method, url: resolvedUrl,
        resolvedBody: resolvedBody || '', requestHeaders: headersObj,
        status: null, duration: null, responseHeaders: {},
        responseBody: '', preview: '', error: err.message,
      }
    }
  }

  // ── Batch run ─────────────────────────────────────────────────────────────

  const runBatch = async () => {
    if (!csvData || !url.trim()) return
    setRunning(true); setProgress(0); setResults([]); abortRef.current = false
    const rows = csvData.rows
    const total = rows.length
    const allResults = []

    for (let i = 0; i < total; i += concurrency) {
      if (abortRef.current) break
      // ── delay between batches (not before the first one) ──
      if (i > 0 && delay > 0) {
        await sleep(delay)
        if (abortRef.current) break
      }
      const chunk = rows.slice(i, i + concurrency)
      const chunkRes = await Promise.all(chunk.map((row, ci) => sendOne(row, i + ci)))
      allResults.push(...chunkRes)
      setResults([...allResults])
      setProgress(Math.round(((i + chunk.length) / total) * 100))
    }

    setRunning(false)
  }

  const stopBatch = () => { abortRef.current = true }

  // ── Export ────────────────────────────────────────────────────────────────

  const exportResults = () => {
    if (!results.length) return
    const rows = results.map((r) => ({
      '#': r.index, Method: r.method, URL: r.url, 'Request Body': r.resolvedBody,
      Status: r.status || '', Duration_ms: r.duration || '',
      Preview: r.preview || '', Error: r.error || '',
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `batch-results-${Date.now()}.csv`
    a.click()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="csv-section">

      {/* 1. Upload */}
      {!csvData ? (
        <div>
          <div
            className={`csv-drop-zone${dragOver ? ' drag-over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div className="csv-drop-icon">📂</div>
            <div className="csv-drop-text">
              Drop a <strong>.csv</strong> file here or <strong>click to browse</strong>
            </div>
            <div style={{ fontSize: 11, marginTop: 6, color: 'var(--overlay0)' }}>
              First row = headers → each column becomes a{' '}
              <code style={{ background: 'var(--bg-surface0)', padding: '1px 4px', borderRadius: 3 }}>{'{{param}}'}</code>{' '}
              variable
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => parseFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="csv-file-info">
          <div className="csv-file-name">
            <span>📄</span>
            <strong>{fileName}</strong>
            <span style={{ color: 'var(--overlay0)' }}>{csvData.rows.length} rows · {csvData.columns.length} columns</span>
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => { setCsvData(null); setFileName(''); setResults([]) }}>
            ✕ Remove
          </button>
        </div>
      )}

      {csvData && (<>

        {/* 2. Parameters chips */}
        <div className="csv-params-panel">
          <div className="csv-params-title">
            <span>📌 Parameters</span>
            <span className="csv-params-hint">Focus URL bar or Body tab, then click to insert</span>
          </div>
          <div className="csv-params-chips">
            {csvData.columns.map((col) => (
              <button key={col} className="csv-param-chip" onClick={() => onInsertParam(col)} title={`Insert {{${col}}}`}>
                <span className="csv-chip-brace">{"{{"}</span>
                {col}
                <span className="csv-chip-brace">{"}}"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Data preview table */}
        <div>
          <div className="csv-preview-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Data Preview</span>
            <span style={{ fontWeight: 400, color: 'var(--overlay0)' }}>
              first {Math.min(5, csvData.rows.length)} of {csvData.rows.length} rows
            </span>
          </div>
          <div className="csv-table-wrap">
            <table className="csv-table">
              <thead>
                <tr>
                  <th style={{ color: 'var(--overlay0)', width: 32 }}>#</th>
                  {csvData.columns.map((col) => <th key={col}>{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {csvData.rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--overlay0)', textAlign: 'center' }}>{i + 1}</td>
                    {csvData.columns.map((col) => <td key={col} title={row[col]}>{row[col]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Live substitution preview */}
        <div className="csv-live-preview">
          <div className="csv-live-preview-header">
            <span>🔍 Live Preview</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--overlay1)' }}>Row:</span>
              <select className="csv-row-select" value={previewIndex} onChange={(e) => setPreviewIndex(Number(e.target.value))}>
                {csvData.rows.map((_, i) => <option key={i} value={i}>#{i + 1}</option>)}
              </select>
            </div>
          </div>
          <div className="csv-live-preview-body">
            <div className="csv-preview-row">
              <span className="csv-preview-row-label">URL</span>
              <code className="csv-preview-value">{previewUrl || <span style={{ color: 'var(--overlay0)' }}>(empty)</span>}</code>
            </div>
            {previewBody && (
              <div className="csv-preview-row" style={{ alignItems: 'flex-start' }}>
                <span className="csv-preview-row-label">Body</span>
                <pre className="csv-preview-value csv-preview-pre">{previewBody}</pre>
              </div>
            )}
            <div className="csv-preview-row" style={{ alignItems: 'flex-start' }}>
              <span className="csv-preview-row-label">Values</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {csvData.columns.map((col) => (
                  <span key={col} className="csv-kv-badge">
                    <span style={{ color: 'var(--blue)' }}>{col}</span>
                    <span style={{ color: 'var(--overlay0)', margin: '0 3px' }}>=</span>
                    <span style={{ color: 'var(--green)' }}>{currentRow[col] ?? ''}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Batch controls */}
        <div className="csv-controls" style={{ flexWrap: 'wrap', gap: 8 }}>
          {/* Concurrency */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--overlay1)' }}>Concurrency:</span>
            <select className="csv-row-select" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} disabled={running}>
              {[1, 2, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Delay */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--overlay1)' }}>Interval (ms):</span>
            <input
              type="number"
              min={0}
              step={100}
              value={delay}
              onChange={(e) => setDelay(Math.max(0, Number(e.target.value)))}
              disabled={running}
              className="csv-delay-input"
              title="Delay between each batch (milliseconds)"
            />
          </div>

          {/* Run / Stop */}
          {!running ? (
            <button className="btn btn-primary" style={{ fontSize: 12 }} disabled={!url.trim()} onClick={runBatch}>
              ▶ Run Batch &nbsp;<span style={{ opacity: 0.75 }}>({csvData.rows.length} requests)</span>
            </button>
          ) : (
            <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={stopBatch}>■ Stop</button>
          )}

          {running && (
            <>
              <div className="csv-progress">
                <div className="csv-progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <span className="csv-progress-text">{progress}% &nbsp;({results.length}/{csvData.rows.length})</span>
            </>
          )}
        </div>

        {/* 6. Results table */}
        {results.length > 0 && (
          <div>
            <div className="csv-results-title">
              <span>
                Results &nbsp;
                <span style={{ color: 'var(--green)' }}>✓ {results.filter((r) => r.status >= 200 && r.status < 300).length}</span>
                &nbsp;
                <span style={{ color: 'var(--red)' }}>✕ {results.filter((r) => !r.status || r.status >= 400).length}</span>
                &nbsp;/ {csvData.rows.length}
                <span style={{ color: 'var(--overlay0)', fontWeight: 400, fontSize: 10, marginLeft: 8 }}>
                  click a row to view details
                </span>
              </span>
              <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={exportResults}>↓ Export CSV</button>
            </div>
            <div className="csv-results-table-wrap">
              <table className="csv-results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>URL</th>
                    <th>Response Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.index}
                      className="csv-result-row"
                      onClick={() => setSelectedResult(r)}
                      title="Click to view request details"
                    >
                      <td style={{ color: 'var(--overlay1)', textAlign: 'center', width: 36 }}>{r.index}</td>
                      <td>
                        {r.error ? (
                          <span className="status-err" style={{ fontSize: 11 }}>ERR</span>
                        ) : (
                          <span className={`status-code ${statusClass(r.status)}`} style={{ fontSize: 12, fontFamily: 'monospace' }}>
                            {r.status}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--subtext0)', fontSize: 11 }}>{r.duration ? `${r.duration}ms` : '—'}</td>
                      <td className="csv-result-url" title={r.url}>{r.url}</td>
                      <td className="csv-result-preview" title={r.error || r.preview}>
                        {r.error ? <span style={{ color: 'var(--red)' }}>{r.error}</span> : r.preview}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </>)}

      {/* Request detail modal */}
      {selectedResult && (
        <DetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />
      )}
    </div>
  )
}
