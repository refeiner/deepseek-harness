/** Real Chromium transport test; no provider calls or production credentials. */
import { app, BrowserWindow, protocol, session } from 'electron'
import { join } from 'node:path'
import { ProductSession } from '../../lib/types/product-session.js'
import { authenticateWebHost, forwardWebRequest } from '../../lib/types/web-document.js'
protocol.registerSchemesAsPrivileged([{ scheme: 'dsh-app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }])
app.setPath('userData', process.env.RE_VASH_TEST_USER_DATA)
void app.whenReady().then(async () => {
const host = process.env.RE_VASH_TEST_HOST
const cookie = await authenticateWebHost(host)
const product = new ProductSession(join(app.getPath('userData'), 're-vash-session.json'), process.env.RE_VASH_TEST_PLATFORM)
await product.load()
protocol.handle('dsh-app', async request => {
  const response = await forwardWebRequest(request, host, cookie, product)
  if (response.status !== 200 || !['/', '/index.html'].includes(new URL(request.url).pathname)) return response
  const transport = JSON.stringify({ ownsHost: true, streamBaseUrl: new URL(host).origin })
  return new Response((await response.text()).replace('<head>', `<head><script>globalThis.__DSH_TRANSPORT__=${transport}</script>`), { status: response.status, headers: response.headers })
})
session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['ws://127.0.0.1/*'] }, (details, callback) => {
  const target = new URL(host)
  if (new URL(details.url).host !== target.host) { callback({ cancel: true }); return }
  callback({ requestHeaders: { ...details.requestHeaders, Origin: target.origin, Cookie: [cookie, product.cookie()].filter(Boolean).join('; '), 'sec-fetch-site': 'same-origin' } })
})
const window = new BrowserWindow({ width: 1280, height: 900, show: false, webPreferences: { contextIsolation: true, sandbox: true } })
await window.loadURL('dsh-app://app/')
app.on('window-all-closed', () => app.quit())

}).catch(error => { console.error(error); app.exit(1) })
