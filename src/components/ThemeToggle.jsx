import React from 'react'

const OPTIONS = [
  { value: 'light', label: '日间', icon: '☀️' },
  { value: 'dark', label: '夜间', icon: '🌙' },
  { value: 'system', label: '系统', icon: '💻' },
]

export default function ThemeToggle({ mode, onChange }) {
  return (
    <div className="theme-toggle" role="group" aria-label="主题模式">
      {OPTIONS.map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          className={`theme-toggle-btn${mode === value ? ' active' : ''}`}
          onClick={() => onChange(value)}
          title={label}
          aria-pressed={mode === value}
        >
          <span className="theme-toggle-icon" aria-hidden="true">{icon}</span>
          <span className="theme-toggle-label">{label}</span>
        </button>
      ))}
    </div>
  )
}
