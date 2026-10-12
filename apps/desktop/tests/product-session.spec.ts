import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProductSession } from '../src/product-session.ts'
import { forwardWebRequest } from '../src/web-document.ts'
const roots: string[] = []
afterEach(async () => { vi.unstubAllGlobals(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
it('retains product login across shell restart and deletes it on logout without exposing it to the renderer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'product-session-')); roots.push(root)
  const file = join(root, 'session.json')
  const first = new ProductSession(file, 'https://product.example')
  await first.load()
  const expires = new Date(Date.now() + 86400000).toUTCString()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{}', { headers: { 'set-cookie': `osdash_session=synthetic; Expires=${expires}; HttpOnly` } })))
  const response = await forwardWebRequest(new Request('dsh-app://app/product/api/auth/login', { method: 'POST', body: '{}' }), 'http://127.0.0.1:1234/', 'dsh-auth=carrier', first)
  expect(response.headers.get('set-cookie')).toBeNull()
  expect(first.cookie()).toBe('osdash_session=synthetic')
  if (process.platform !== 'win32') expect((await stat(file)).mode & 0o777).toBe(0o600)
  const second = new ProductSession(file, 'https://product.example'); await second.load()
  expect(second.cookie()).toBe(first.cookie())
  const other = new ProductSession(file, 'https://other.example'); await other.load()
  expect(other.cookie()).toBe('')
  const fetch = vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch', fetch)
  await forwardWebRequest(new Request('dsh-app://app/api/me'), 'http://127.0.0.1:1234/', 'dsh-auth=carrier', second)
  expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).get('cookie')).toBe('dsh-auth=carrier; osdash_session=synthetic')
  await second.accept('osdash_session=; Expires=Thu, 01 Jan 1970 00:00:00 GMT')
  const third = new ProductSession(file, 'https://product.example'); await third.load()
  expect(third.cookie()).toBe('')
})
