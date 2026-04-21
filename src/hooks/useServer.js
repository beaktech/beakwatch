import { useState, useEffect } from 'react'

export function useServer() {
  const [serverInfo, setServerInfo] = useState(null)

  useEffect(() => {
    fetch('/api/server')
      .then(r => r.json())
      .then(setServerInfo)
      .catch(err => console.warn('[useServer] failed to fetch server info:', err))
  }, [])

  async function switchServer() {
    if (!serverInfo) return
    const next = serverInfo.servers.find(s => s.url !== serverInfo.active)
    if (!next) return
    await fetch('/api/server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: next.url }),
    })
    window.location.reload()
  }

  return { serverInfo, switchServer }
}
