import React, { useState } from 'react'

const BODY_TYPES = [
  { id: 'none', label: 'none' },
  { id: 'json', label: 'JSON' },
  { id: 'raw', label: 'raw' },
  { id: 'urlencoded', label: 'x-www-form-urlencoded' },
  { id: 'form', label: 'form-data' },
]

export default function BodyEditor({ body, bodyType, onBodyChange, onTypeChange, onFormDataChange, formData, textareaRef, onTextareaFocus }) {
  const [kvForm, setKvForm] = useState(formData || [{ key: '', value: '', enabled: true }])

  const handleTypeChange = (type) => {
    onTypeChange(type)
    if (type === 'json' && !body) {
      onBodyChange('{\n  \n}')
    }
  }

  const formatJson = () => {
    try {
      const parsed = JSON.parse(body)
      onBodyChange(JSON.stringify(parsed, null, 2))
    } catch {
      // not valid JSON, ignore
    }
  }

  const updateKv = (index, field, value) => {
    const next = kvForm.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    )
    setKvForm(next)
    syncKvToBody(next)
  }

  const addKv = () => {
    const next = [...kvForm, { key: '', value: '', enabled: true }]
    setKvForm(next)
  }

  const removeKv = (index) => {
    const next = kvForm.filter((_, i) => i !== index)
    if (next.length === 0) {
      const fresh = [{ key: '', value: '', enabled: true }]
      setKvForm(fresh)
      syncKvToBody(fresh)
    } else {
      setKvForm(next)
      syncKvToBody(next)
    }
  }

  const syncKvToBody = (rows) => {
    const parts = rows
      .filter((r) => r.key && r.enabled !== false)
      .map((r) => `${encodeURIComponent(r.key)}=${encodeURIComponent(r.value)}`)
    onBodyChange(parts.join('&'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Body type selector */}
      <div className="body-type-bar">
        {BODY_TYPES.map((t) => (
          <button
            key={t.id}
            className={`body-type-btn${bodyType === t.id ? ' active' : ''}`}
            onClick={() => handleTypeChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content by type */}
      {bodyType === 'none' && (
        <div className="body-none-hint">
          This request has no body. Select a body type above to add one.
        </div>
      )}

      {(bodyType === 'json' || bodyType === 'raw') && (
        <div>
          <textarea
            ref={textareaRef}
            className="body-textarea"
            placeholder={
              bodyType === 'json'
                ? '{\n  "key": "value"\n}'
                : 'Request body...'
            }
            value={body}
            onFocus={onTextareaFocus}
            onChange={(e) => onBodyChange(e.target.value)}
            spellCheck={false}
          />
          {bodyType === 'json' && (
            <div className="body-actions">
              <button className="btn btn-ghost btn-icon" style={{ fontSize: 11 }} onClick={formatJson} title="Format JSON">
                ⎘ Beautify
              </button>
              <button
                className="btn btn-ghost btn-icon"
                style={{ fontSize: 11 }}
                onClick={() => onBodyChange('')}
                title="Clear"
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>
      )}

      {(bodyType === 'urlencoded' || bodyType === 'form') && (
        <div>
          {/* Column labels */}
          <div className="kv-row" style={{ marginBottom: 2 }}>
            <span />
            <span style={{ fontSize: 10, color: 'var(--overlay0)', textTransform: 'uppercase' }}>Key</span>
            <span style={{ fontSize: 10, color: 'var(--overlay0)', textTransform: 'uppercase' }}>Value</span>
            <span />
          </div>
          {kvForm.map((row, i) => (
            <div className="kv-row" key={i} style={{ marginBottom: 6 }}>
              <input
                type="checkbox"
                className="kv-check"
                checked={row.enabled !== false}
                onChange={(e) => updateKv(i, 'enabled', e.target.checked)}
              />
              <input
                className="kv-input"
                placeholder="Key"
                value={row.key}
                onChange={(e) => updateKv(i, 'key', e.target.value)}
              />
              <input
                className="kv-input"
                placeholder="Value"
                value={row.value}
                onChange={(e) => updateKv(i, 'value', e.target.value)}
              />
              <button className="kv-delete" onClick={() => removeKv(i)}>✕</button>
            </div>
          ))}
          <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={addKv}>
            + Add Field
          </button>
        </div>
      )}
    </div>
  )
}
