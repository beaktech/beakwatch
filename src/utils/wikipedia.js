const cache = new Map()

export async function fetchWikipedia(commonName) {
  if (cache.has(commonName)) {
    return cache.get(commonName)  // may be a Promise (in-flight) or resolved value
  }

  const promise = (async () => {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(commonName)}`
      const res = await fetch(url)
      if (!res.ok) return { extract: null, photoUrl: null }
      const data = await res.json()
      return {
        extract: data.extract ?? null,
        photoUrl: data.thumbnail?.source ?? null,
      }
    } catch {
      return { extract: null, photoUrl: null }
    }
  })()

  cache.set(commonName, promise)
  const result = await promise
  cache.set(commonName, result)  // replace Promise with resolved value
  return result
}
