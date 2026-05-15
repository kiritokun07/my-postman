import React, { useState, useMemo } from 'react'
import { formatSize } from '../utils/storage'

function getStatusClass(status) {
  if (!status) return 'status-err'
  if (status < 300) return 'status-2xx'
  if (status < 400) return 'status-3xx'
  if (status < 500) return 'status-4xx'
  return 'status-5xx'
}

/**
 * Very simple JSON syntax highlighter
 */
function highlightJson(json) {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-num'
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-str'
        } else if (/true|false/.test(match)) {
          cls = 'json-bool'
        } else if (/null/.test(match)) {
          cls = 'json-null'
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
}

function tryPrettyJson(str) {
  try {
    return { ok: true, text: JSON.stringify(JSON.parse(str), null, 2) }
  } catch {
    return { ok: false, text: str }
  }
}

export default function ResponsePanel({ response, error, isLoading }) {
  const [activeTab, setActiveTab] = useState('body')
  const [rawMode, setRawMode] = useState(false)
  const [copied, setCopied] = useState(false)

  const { prettyBody, isJson } = useMemo(() => {
    if (!response?.body) return { prettyBody: '', isJson: false }
    const ct = (response.headers?.['content-type'] || '').toLowerCase()
    if (ct.includes('application/json') || response.body.trimStart().startsWith('{') || response.body.trimStart().startsWith('[')) {
      const { ok, text } = tryPrettyJson(response.body)
      if (ok) return { prettyBody: text, isJson: true }
    }
    return { prettyBody: response.body, isJson: false }
  }, [response])

  const copyBody = () => {
    const text = prettyBody || ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="response-section">
      {/* Status bar */}
      <div className="response-statusbar">
        <span className="response-label">Response</span>

        {isLoading && (
          <span style={{ color: 'var(--yellow)', fontFamily: 'monospace', fontSize: 13 }}>
            Sending<span className="loading-dots" />
          </span>
        )}

        {!isLoading && response && (
          <>
            <span className={`status-code ${getStatusClass(response.status)}`}>
              {response.status} {response.statusText}
            </span>
            <div className="response-meta">
              <span className="meta-item">
                ⏱ <span className="meta-val">{response.duration} ms</span>
              </span>
              <span className="meta-item">
                ⬇ <span className="meta-val">{formatSize(response.size)}</span>
              </span>
            </div>
          </>
        )}

        {!isLoading && !response && !error && (
          <span style={{ color: 'var(--overlay0)', fontSize: 12 }}>
            Hit Send to get a response
          </span>
        )}

        {/* Copy button */}
        {response?.body && (
          <button
            className="btn btn-ghost btn-icon ml-auto"
            style={{ fontSize: 11 }}
            onClick={copyBody}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="response-error">
          ✕ {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !response && !error && (
        <div className="response-empty">
          <div className="response-empty-icon">🚀</div>
          <div>Send a request to see the response here</div>
        </div>
      )}

      {/* Response content */}
      {response && (
        <div className="response-body-container">
          {/* Tabs */}
          <div className="tab-bar">
            <button
              className={`tab-btn${activeTab === 'body' ? ' active' : ''}`}
              onClick={() => setActiveTab('body')}
            >
              Body
            </button>
            <button
              className={`tab-btn${activeTab === 'headers' ? ' active' : ''}`}
              onClick={() => setActiveTab('headers')}
            >
              Headers
              {response.headers && (
                <span className="tab-badge">
                  {Object.keys(response.headers).length}
                </span>
              )}
            </button>
            {activeTab === 'body' && isJson && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  className={`body-type-btn${!rawMode ? ' active' : ''}`}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={() => setRawMode(false)}
                >
                  Pretty
                </button>
                <button
                  className={`body-type-btn${rawMode ? ' active' : ''}`}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={() => setRawMode(true)}
                >
                  Raw
                </button>
              </div>
            )}
          </div>

          {/* Body tab */}
          {activeTab === 'body' && (
            <div className="response-body-content">
              {response.isBase64 ? (
                <div style={{ color: 'var(--overlay1)', fontSize: 12, padding: 16 }}>
                  Binary response ({formatSize(response.size)}) — cannot preview
                </div>
              ) : isJson && !rawMode ? (
                <pre
                  className="response-pre"
                  dangerouslySetInnerHTML={{ __html: highlightJson(prettyBody) }}
                />
              ) : (
                <pre className="response-pre">{prettyBody || response.body}</pre>
              )}
            </div>
          )}

          {/* Headers tab */}
          {activeTab === 'headers' && (
            <div className="response-body-content">
              <table className="response-headers-table">
                <tbody>
                  {Object.entries(response.headers || {}).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{Array.isArray(v) ? v.join(', ') : v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
