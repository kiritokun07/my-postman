import React, { useState, useMemo } from 'react'
import { relativeTime, deleteHistoryItem, exportHistory } from '../utils/storage'

export default function HistoryPanel({ history, onLoad, onClear, onDelete }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')

  const METHODS = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']

  const filtered = useMemo(() => {
    return history.filter((item) => {
      const matchMethod = filter === 'ALL' || item.method === filter
      const matchSearch =
        !search ||
        item.url?.toLowerCase().includes(search.toLowerCase()) ||
        item.method?.toLowerCase().includes(search.toLowerCase())
      return matchMethod && matchSearch
    })
  }, [history, filter, search])

  const handleDelete = (e, id) => {
    e.stopPropagation()
    const updated = deleteHistoryItem(id)
    onDelete(updated)
  }

  const statusClass = (status) => {
    if (!status) return 'status-err'
    if (status < 300) return 'status-2xx'
    if (status < 400) return 'status-3xx'
    if (status < 500) return 'status-4xx'
    return 'status-5xx'
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">History</span>
        <div className="sidebar-actions">
          <button
            className="btn btn-ghost btn-icon"
            title="Export history"
            style={{ fontSize: 11, padding: '3px 6px' }}
            onClick={exportHistory}
          >
            ↓
          </button>
          <button
            className="btn btn-danger btn-icon"
            title="Clear all history"
            style={{ fontSize: 11, padding: '3px 6px' }}
            onClick={onClear}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 8px 4px' }}>
        <input
          className="search-input"
          placeholder="Search history..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Method filter */}
      <div style={{ display: 'flex', gap: 2, padding: '4px 8px 6px', flexWrap: 'wrap' }}>
        {METHODS.map((m) => (
          <button
            key={m}
            style={{
              background: filter === m ? 'var(--bg-surface0)' : 'none',
              border: '1px solid ' + (filter === m ? 'var(--bg-surface1)' : 'transparent'),
              color: filter === m ? 'var(--text)' : 'var(--overlay1)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 10,
              cursor: 'pointer',
              fontWeight: filter === m ? 600 : 400,
              transition: 'all 0.15s',
            }}
            onClick={() => setFilter(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="history-list">
        {filtered.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon">🕐</div>
            <div style={{ fontSize: 12 }}>
              {history.length === 0 ? 'No requests yet' : 'No matches found'}
            </div>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="history-item"
              onClick={() => onLoad(item)}
              title={item.url}
            >
              <div style={{ paddingTop: 1 }}>
                <span className={`method-badge method-${item.method}`}>
                  {item.method}
                </span>
              </div>
              <div className="history-item-info">
                <div className="history-item-url">
                  {item.url}
                </div>
                <div className="history-item-meta">
                  {item.response?.status && (
                    <span className={`history-status ${statusClass(item.response.status)}`}>
                      {item.response.status}
                    </span>
                  )}
                  {item.response?.duration && (
                    <span className="history-time">{item.response.duration}ms</span>
                  )}
                  <span className="history-time">{relativeTime(item.timestamp)}</span>
                </div>
              </div>
              <button
                className="history-delete"
                onClick={(e) => handleDelete(e, item.id)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
