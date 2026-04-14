#!/usr/bin/env node
// Downloads Wikipedia bird photos for every species recorded in BirdNET-Go.
// Saves to public/birds/<slug>.jpg — skips files that already exist.
// Usage: node scripts/download-bird-images.js

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'birds')

// Load BIRDNET_GO_URL from server/.env
let BIRDNET_GO_URL = 'http://localhost:8080'
try {
  const env = readFileSync(join(ROOT, 'server', '.env'), 'utf8')
  const match = env.match(/^BIRDNET_GO_URL=(.+)$/m)
  if (match) BIRDNET_GO_URL = match[1].trim()
} catch { /* use default */ }

mkdirSync(OUT_DIR, { recursive: true })

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-')
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchSpecies() {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const url = `${BIRDNET_GO_URL}/api/v2/analytics/species/summary?start_date=2010-01-01&end_date=${todayStr}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`BirdNET-Go returned ${res.status}`)
  return res.json()
}

async function fetchWikipediaImageUrl(commonName) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(commonName)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'beakwatch/1.0 (bird display app)' } })
  if (!res.ok) return null
  const data = await res.json()
  return data.originalimage?.source ?? data.thumbnail?.source ?? null
}

async function downloadImage(imageUrl, destPath) {
  const res = await fetch(imageUrl)
  if (!res.ok) return false
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(destPath, buf)
  return true
}

async function main() {
  console.log(`Connecting to BirdNET-Go at ${BIRDNET_GO_URL}…`)

  let species
  try {
    species = await fetchSpecies()
  } catch (err) {
    console.error(`Failed to fetch species list: ${err.message}`)
    console.error('Make sure BirdNET-Go is reachable and try again.')
    process.exit(1)
  }

  console.log(`Found ${species.length} species. Downloading images…\n`)

  let downloaded = 0, skipped = 0, missing = 0, failed = 0

  for (const s of species) {
    const name = s.common_name
    const slug = toSlug(name)
    const dest = join(OUT_DIR, `${slug}.jpg`)

    if (existsSync(dest)) {
      skipped++
      continue
    }

    process.stdout.write(`  ${name} … `)

    try {
      const imageUrl = await fetchWikipediaImageUrl(name)
      if (!imageUrl) {
        console.log('no image found')
        missing++
      } else {
        const ok = await downloadImage(imageUrl, dest)
        if (ok) {
          console.log('✓')
          downloaded++
        } else {
          console.log('download failed')
          failed++
        }
      }
    } catch (err) {
      console.log(`error: ${err.message}`)
      failed++
    }

    // Be polite to Wikipedia — 150ms between requests
    await sleep(150)
  }

  console.log(`\nDone. Downloaded: ${downloaded}, already existed: ${skipped}, no image: ${missing}, failed: ${failed}`)
}

main()
