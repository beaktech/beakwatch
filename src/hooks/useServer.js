import { useState, useEffect } from 'react'

export function useServer() {
  const [serverInfo, setServerInfo] = useState(null)

  useEffect(() => {
    fetch('/api/server').then(r => r.json()).then(setServerInfo)
  }, [])

  async function switchServer() {
    if (!serverInfo) return
    const next = serverInfo.servers.find(s => s !== serverInfo.active)
    await fetch('/api/server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: next }),
    })
    window.location.reload()
  }

  return { serverInfo, switchServer }
}
