export function toSlug(commonName) {
  return commonName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric (incl apostrophes)
    .trim()
    .replace(/[\s-]+/g, '-')         // spaces and hyphens → single hyphen
}

export function timeAgo(isoTimestamp) {
  const seconds = Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr${hours === 1 ? '' : 's'} ago`
}
