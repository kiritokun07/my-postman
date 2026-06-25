import { invoke, isTauri } from '@tauri-apps/api/core'

export async function proxyRequest(requestBody) {
  if (isTauri()) {
    return invoke('proxy_request', { request: requestBody })
  }

  const res = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Proxy server unavailable — run `pnpm dev` for browser mode')
  }

  if (!res.ok && !data.status) {
    throw new Error(data.error || `Proxy error ${res.status}`)
  }

  return data
}
