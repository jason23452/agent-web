export type DownloadArchiveEntry = {
  content: Uint8Array
  name: string
}

export type ZipArchiveEntry = DownloadArchiveEntry

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

export async function readZipEntries(file: Blob, options: { maxEntries?: number; maxUncompressedBytes?: number } = {}): Promise<ZipArchiveEntry[]> {
  const source = new Uint8Array(await file.arrayBuffer())
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength)
  const endOffset = findZipEndOffset(view)
  const entryCount = view.getUint16(endOffset + 10, true)
  const centralOffset = view.getUint32(endOffset + 16, true)
  const maxEntries = options.maxEntries ?? 200
  const maxUncompressedBytes = options.maxUncompressedBytes ?? 20 * 1024 * 1024

  if (entryCount > maxEntries) throw new Error("壓縮包內的項目數量超過限制。")
  if (centralOffset >= source.byteLength) throw new Error("壓縮包索引位置無效。")

  const entries: ZipArchiveEntry[] = []
  let offset = centralOffset
  let totalUncompressedBytes = 0

  for (let index = 0; index < entryCount; index += 1) {
    ensureRange(source, offset, 46)
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("壓縮包索引格式無效。")

    const flags = view.getUint16(offset + 8, true)
    const method = view.getUint16(offset + 10, true)
    const checksum = view.getUint32(offset + 16, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const uncompressedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const nameStart = offset + 46
    ensureRange(source, nameStart, nameLength + extraLength + commentLength)
    const name = new TextDecoder().decode(source.slice(nameStart, nameStart + nameLength))
    offset = nameStart + nameLength + extraLength + commentLength

    if (flags & 0x0001) throw new Error(`壓縮包項目「${name}」受到密碼保護，無法匯入。`)
    if (uncompressedSize > maxUncompressedBytes || totalUncompressedBytes + uncompressedSize > maxUncompressedBytes) throw new Error("壓縮包解壓後大小超過限制。")
    ensureRange(source, localOffset, 30)
    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("壓縮包檔案標頭無效。")
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    ensureRange(source, dataStart, compressedSize)
    const compressed = source.slice(dataStart, dataStart + compressedSize)
    const content = method === 0
      ? compressed
      : method === 8
        ? await inflateRaw(compressed)
        : throwUnsupportedZipMethod(method, name)

    if (content.byteLength !== uncompressedSize) throw new Error(`壓縮包項目「${name}」大小驗證失敗。`)
    if (crc32(content) !== checksum) throw new Error(`壓縮包項目「${name}」校驗失敗。`)
    totalUncompressedBytes += content.byteLength
    if (totalUncompressedBytes > maxUncompressedBytes) throw new Error("壓縮包解壓後大小超過限制。")
    entries.push({ content, name })
  }

  return entries
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

function findZipEndOffset(view: DataView) {
  if (view.byteLength < 22) throw new Error("找不到有效的 ZIP 結尾。")
  const minimumOffset = Math.max(0, view.byteLength - 65_557)
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) !== 0x06054b50) continue
    const commentLength = view.getUint16(offset + 20, true)
    if (offset + 22 + commentLength <= view.byteLength) return offset
  }
  throw new Error("找不到有效的 ZIP 結尾。")
}

function ensureRange(source: Uint8Array, offset: number, length: number) {
  if (offset < 0 || length < 0 || offset + length > source.byteLength) throw new Error("壓縮包內容超出檔案範圍。")
}

async function inflateRaw(content: Uint8Array) {
  if (typeof DecompressionStream === "undefined") throw new Error("目前瀏覽器不支援 deflate ZIP 匯入。")
  const buffer = new ArrayBuffer(content.byteLength)
  new Uint8Array(buffer).set(content)
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function throwUnsupportedZipMethod(method: number, name: string): never {
  throw new Error(`壓縮包項目「${name}」使用不支援的壓縮方式（${method}）。`)
}
