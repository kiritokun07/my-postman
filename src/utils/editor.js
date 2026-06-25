
export function insertAtCursor(el, text, getValue, setValue) {
  if (!el) {
    setValue((prev) => prev + text)
    return
  }
  const start = el.selectionStart ?? getValue().length
  const end = el.selectionEnd ?? getValue().length
  const next = getValue().slice(0, start) + text + getValue().slice(end)
  setValue(next)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + text.length, start + text.length)
  })
}
