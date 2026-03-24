import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('.env', import.meta.url).pathname })

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const BIRDNET_GO_URL = process.env.BIRDNET_GO_URL || 'http://localhost:8080'
const PORT = process.env.PORT || 3000

// Field normalisation: BirdNET-Go may use different field names.
// Run `curl $BIRDNET_GO_URL/api/v2/detections | jq .[0]` first,
// then update this function to map actual field names to the expected shape.
function normaliseDetection(raw) {
  return {
    commonName: raw.commonName ?? raw.common_name ?? raw.name,
    scientificName: raw.scientificName ?? raw.scientific_name,
    timestamp: raw.timestamp ?? raw.date ?? raw.time,
    confidence: raw.confidence ?? raw.score,
  }
}

app.use(
  createProxyMiddleware({
    pathFilter: '/api',
    target: BIRDNET_GO_URL,
    changeOrigin: true,
    selfHandleResponse: false,
    // If BirdNET-Go field names match the expected shape exactly,
    // remove the on.proxyRes handler below and set selfHandleResponse: false.
    // Otherwise, uncomment and adapt:
    //
    // selfHandleResponse: true,
    // on: {
    //   proxyRes: responseInterceptor(async (responseBuffer, proxyRes) => {
    //     if (!proxyRes.headers['content-type']?.includes('application/json')) {
    //       return responseBuffer
    //     }
    //     const data = JSON.parse(responseBuffer.toString('utf8'))
    //     const normalised = Array.isArray(data) ? data.map(normaliseDetection) : data
    //     return JSON.stringify(normalised)
    //   }),
    // },
  })
)

app.use(express.static(join(__dirname, '..', 'dist')))

// SPA fallback
app.get('*path', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'))
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Beaknik running on http://localhost:${PORT}`))
}

export default app
