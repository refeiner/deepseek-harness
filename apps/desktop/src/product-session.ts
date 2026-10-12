/** Main-process storage for the product session; the session file is never exposed to renderer code. */
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

interface SavedSession { origin: string; value: string; expiresAt: number }
/** Persists one product session for this application and configured platform origin. */
export class ProductSession {
  private saved: SavedSession | null = null
  private writes = Promise.resolve()
  /**
   * @param file - application-private session file.
   * @param origin - configured business-service origin.
   */
  constructor(private readonly file: string, private readonly origin: string) {}
  /** Load a previously saved unexpired session; malformed data fails startup. */
  async load(): Promise<void> {
    let text: string
    try { text = await readFile(this.file, 'utf8') } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return
      throw error
    }
    const raw: unknown = JSON.parse(text)
    if (raw === null) return
    if (typeof raw !== 'object' || !('origin' in raw) || typeof raw.origin !== 'string'
      || !('value' in raw) || typeof raw.value !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(raw.value)
      || !('expiresAt' in raw) || typeof raw.expiresAt !== 'number' || !Number.isFinite(raw.expiresAt)) {
      throw new Error('Invalid saved product session')
    }
    if (raw.origin === this.origin && raw.expiresAt > Date.now()) {
      this.saved = { origin: raw.origin, value: raw.value, expiresAt: raw.expiresAt }
    }
  }
  /** @returns Cookie header fragment, or empty when signed out or expired. */
  cookie(): string {
    return this.saved && this.saved.expiresAt > Date.now() ? `revash_session=${this.saved.value}` : ''
  }
  /** @param header - Host response cookie; unrelated carrier cookies are ignored. */
  async accept(header: string): Promise<void> {
    const cookie = header.split(';', 1).join('')
    if (!cookie.startsWith('revash_session=')) return
    const value = cookie.slice('revash_session='.length)
    const expiry = /(?:^|;)\s*Expires=([^;]+)/iu.exec(header)
    const expiresAt = Date.parse(expiry?.[1] ?? '')
    const cleared = !value || expiresAt <= Date.now() || /(?:^|;)\s*Max-Age=0(?:;|$)/iu.test(header)
    if (!cleared && (!/^[A-Za-z0-9_-]+$/u.test(value) || !Number.isFinite(expiresAt))) throw new Error('Invalid product session cookie')
    this.saved = cleared ? null : { origin: this.origin, value, expiresAt }
    const body = JSON.stringify(this.saved)
    this.writes = this.writes.then(async () => {
      await mkdir(dirname(this.file), { recursive: true })
      const temporary = `${this.file}.${randomUUID()}.tmp`
      await writeFile(temporary, body, { mode: 0o600, flag: 'wx' })
      await rename(temporary, this.file)
    })
    await this.writes
  }
}
