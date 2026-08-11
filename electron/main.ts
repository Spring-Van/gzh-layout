import { app, BrowserWindow, net, protocol } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { registerFileIpc } from './ipc/file'
import { registerImageIpc } from './ipc/image'
import { registerDatabaseIpc } from './ipc/database'
import { registerWechatIpc } from './ipc/wechat'
import { registerExtractIpc } from './ipc/extract'
import { registerComicIpc } from './ipc/comic'
import { dbService } from './services/database.service'
import { comicDbService } from './services/comic-database.service'
import { imageHistoryService } from './services/image-history.service'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

protocol.registerSchemesAsPrivileged([{
  scheme: 'app-image',
  privileges: {
    secure: true,
    standard: true,
    supportFetchAPI: true,
    corsEnabled: true,
  },
}])

const IMAGE_EXTENSION_RE = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i

function registerImageProtocol() {
  protocol.handle('app-image', async request => {
    try {
      const url = new URL(request.url)
      const decodedPath = decodeURIComponent(url.pathname.slice(1))
      const filePath = url.hostname === 'history'
        ? imageHistoryService.resolveImagePath(decodedPath)
        : url.hostname === 'local' && path.isAbsolute(decodedPath)
          ? path.normalize(decodedPath)
          : null

      if (!filePath || !IMAGE_EXTENSION_RE.test(filePath)) {
        return new Response('Not found', { status: 404 })
      }
      return net.fetch(pathToFileURL(filePath).toString())
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  registerImageProtocol()
  await Promise.all([dbService.init(), comicDbService.init()])
  createWindow()
  registerFileIpc()
  registerImageIpc()
  registerDatabaseIpc()
  registerWechatIpc()
  registerExtractIpc()
  registerComicIpc()
})
