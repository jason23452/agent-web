export type DownloadArchiveEntry = {
  content: Uint8Array
  name: string
}

export function createStoredZip(entries: readonly DownloadArchiveEntry[]): Uint8Array {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let localOffset = 0

  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name)
    const checksum = crc32(entry.content)
    const localHeader = new Uint8Array(30)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, entry.content.length, true)
    localView.setUint32(22, entry.content.length, true)
    localView.setUint16(26, name.length, true)
    localParts.push(localHeader, name, entry.content)

    const centralHeader = new Uint8Array(46)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, entry.content.length, true)
    centralView.setUint32(24, entry.content.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, localOffset, true)
    centralParts.push(centralHeader, name)

    localOffset += localHeader.length + name.length + entry.content.length
  }

  const localData = concatBytes(localParts)
  const centralData = concatBytes(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralData.length, true)
  endView.setUint32(16, localData.length, true)

  return concatBytes([localData, centralData, end])
}

export function downloadBytes(bytes: Uint8Array, filename: string, mimeType = "application/octet-stream") {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const objectUrl = URL.createObjectURL(new Blob([buffer], { type: mimeType }))
  const anchor = document.createElement("a")
  anchor.download = filename
  anchor.href = objectUrl
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

function concatBytes(parts: readonly Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function crc32(value: Uint8Array) {
  let result = 0xffffffff
  for (const byte of value) {
    result ^= byte
    for (let bit = 0; bit < 8; bit += 1) result = (result >>> 1) ^ ((result & 1) ? 0xedb88320 : 0)
  }
  return (result ^ 0xffffffff) >>> 0
}
