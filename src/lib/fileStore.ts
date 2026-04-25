/**
 * In-memory file store — replaces sessionStorage for file data.
 *
 * sessionStorage has a ~5 MB quota which audio/video files instantly exceed.
 * A module-level variable has NO size limit and persists across client-side
 * route changes (Next.js router.push) within the same browser tab.
 *
 * It is reset when the user closes the tab or does a hard reload — exactly the
 * same lifetime as sessionStorage, with no quota issues.
 */

export interface PendingFileMeta {
  name: string;
  size: number;
  type: string;        // MIME type
  mediaType: string;   // 'audio' | 'image' | 'video'
  lastModified: number;
}

interface FileStore {
  meta: PendingFileMeta | null;
  /** Raw base64 data URL — can be several hundred MB, no limit here */
  dataUrl: string | null;
}

const store: FileStore = { meta: null, dataUrl: null };

export function setFileStore(meta: PendingFileMeta, dataUrl: string): void {
  store.meta = meta;
  store.dataUrl = dataUrl;
}

export function getFileStoreMeta(): PendingFileMeta | null {
  return store.meta;
}

export function getFileStoreDataUrl(): string | null {
  return store.dataUrl;
}

export function clearFileStore(): void {
  store.meta = null;
  store.dataUrl = null;
}
