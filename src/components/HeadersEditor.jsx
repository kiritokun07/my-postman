import React from 'react'

const COMMON_HEADERS = [
  'Accept',
  'Authorization',
  'Cache-Control',
  'Content-Type',
  'Cookie',
  'Origin',
  'Referer',
  'User-Agent',
  'X-Requested-With',
  'X-API-Key',
]

export default function HeadersEditor({ headers, onChange }) {
  const updateRow = (index, field, value) => {
    const next = headers.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    )
    onChange(next)
  }

  const removeRow = (index) => {
    const next = headers.filter((_, i) => i !== index)
    if (next.length === 0) next.push({ key: '', value: '', enabled: true })
    onChange(next)
  }

  const addRow = () => {
    onChange([...headers, { key: '', value: '', enabled: true }])
  }

  // Auto-add new row when last row has content
  const handleKeyChange = (index, value) => {
    updateRow(index, 'key', value)
    if (value && index === headers.length - 1) {
      onChange([
        ...headers.map((row, i) => (i === index ? { ...row, key: value } : row)),
        { key: '', value: '', enabled: true },
      ])
    }
  }

  return (
    <div className="headers-editor">
      {/* Column labels */}
      <div className="kv-row" style={{ marginBottom: 2 }}>
        <span />
        <span style={{ fontSize: 10, color: 'var(--overlay0)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key</span>
        <span style={{ fontSize: 10, color: 'var(--overlay0)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Value</span>
        <span />
      </div>

      {headers.map((row, i) => (
        <div className="kv-row" key={i}>
          <input
            type="checkbox"
            className="kv-check"
            checked={row.enabled !== false}
            onChange={(e) => updateRow(i, 'enabled', e.target.checked)}
          />
          <input
            className={`kv-input${row.enabled === false ? ' disabled' : ''}`}
            list={`header-keys-${i}`}
            placeholder="Header name"
            value={row.key}
            onChange={(e) => handleKeyChange(i, e.target.value)}
            disabled={row.enabled === false}
          />
          <datalist id={`header-keys-${i}`}>
            {COMMON_HEADERS.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
          <input
            className={`kv-input${row.enabled === false ? ' disabled' : ''}`}
            placeholder="Value"
            value={row.value}
            onChange={(e) => updateRow(i, 'value', e.target.value)}
            disabled={row.enabled === false}
          />
          <button
            className="kv-delete"
            onClick={() => removeRow(i)}
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="kv-add-row">
        <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={addRow}>
          + Add Header
        </button>
      </div>
    </div>
  )
}
