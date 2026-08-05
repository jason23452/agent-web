export type ProjectUploadEntry =
  | { file: File; kind: "file"; relativePath: string }
  | { kind: "directory"; relativePath: string }

type DroppedEntry = {
  isDirectory: boolean
  isFile: boolean
  name: string
}

type DroppedHandle =
  | { getFile: () => Promise<File>; kind: "file"; name: string }
  | { kind: "directory"; name: string; values: () => AsyncIterable<DroppedHandle> }

type DroppedFileEntry = DroppedEntry & {
  file: (onSuccess: (file: File) => void, onError: (error: unknown) => void) => void
}

type DroppedDirectoryEntry = DroppedEntry & {
  createReader: () => {
    readEntries: (onSuccess: (entries: DroppedEntry[]) => void, onError: (error: unknown) => void) => void
  }
}

type DataTransferItemWithEntry = {
  getAsFileSystemHandle?: () => Promise<DroppedHandle | null>
  webkitGetAsEntry?: () => DroppedEntry | null
}

async function readDroppedDirectoryEntries(entry: DroppedDirectoryEntry): Promise<DroppedEntry[]> {
  const reader = entry.createReader()
  const entries: DroppedEntry[] = []

  while (true) {
    const batch = await new Promise<DroppedEntry[]>((resolve, reject) => reader.readEntries(resolve, reject))
    if (batch.length === 0) return entries
    entries.push(...batch)
  }
}

async function readDroppedEntry(entry: DroppedEntry, parentPath: string): Promise<ProjectUploadEntry[]> {
  const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name

  if (entry.isFile) {
    const fileEntry = entry as DroppedFileEntry
    const file = await new Promise<File>((resolve, reject) => fileEntry.file(resolve, reject))
    return [{ file, kind: "file", relativePath }]
  }

  if (!entry.isDirectory) return []

  const directoryEntry = entry as DroppedDirectoryEntry
  const children = await readDroppedDirectoryEntries(directoryEntry)
  const descendants = await Promise.all(children.map((child) => readDroppedEntry(child, relativePath)))
  return [{ kind: "directory", relativePath }, ...descendants.flat()]
}

async function readDroppedHandle(handle: DroppedHandle, parentPath: string): Promise<ProjectUploadEntry[]> {
  const relativePath = parentPath ? `${parentPath}/${handle.name}` : handle.name

  if (handle.kind === "file") {
    return [{ file: await handle.getFile(), kind: "file", relativePath }]
  }

  const descendants: ProjectUploadEntry[] = []
  for await (const child of handle.values()) descendants.push(...await readDroppedHandle(child, relativePath))
  return [{ kind: "directory", relativePath }, ...descendants]
}

export async function collectDroppedProjectFiles(dataTransfer: DataTransfer): Promise<ProjectUploadEntry[]> {
  const droppedEntries = await Promise.all(Array.from(dataTransfer.items).map(async (item) => {
    const source = item as unknown as DataTransferItemWithEntry
    if (source.getAsFileSystemHandle) {
      try {
        const handle = await source.getAsFileSystemHandle()
        if (handle) return readDroppedHandle(handle, "")
      } catch {
        // Fall back to the legacy entry API for browsers that reject a handle.
      }
    }

    const entry = source.webkitGetAsEntry?.()
    return entry ? readDroppedEntry(entry, "") : []
  }))
  const collectedEntries = droppedEntries.flat()
  if (collectedEntries.length > 0) {
    return collectedEntries
  }

  return Array.from(dataTransfer.files).map((file) => ({
    file,
    kind: "file" as const,
    relativePath: file.webkitRelativePath || file.name,
  }))
}
