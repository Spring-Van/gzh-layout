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
import { projectImageStore } from './services/project-image-store'

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
      // comic 分支的路径由库数据拼成（可能被手工编辑过），三段白名单校验都在 resolveImagePath 里
      const filePath = url.hostname === 'history'
        ? imageHistoryService.resolveImagePath(decodedPath)
        : url.hostname === 'comic'
          ? projectImageStore.resolveImagePath(decodedPath)
          : url.hostname === 'local' && path.isAbsolute(decodedPath)
            ? path.normalize(decodedPath)
            : null

      if (!filePath || !IMAGE_EXTENSION_RE.test(filePath)) {
        return new Response('Not found', { status: 404 })
      }
      // 渲染层有几处必须把图片**读回来**（参考图发给第三方模型前的归一化、
      // 封面裁剪、长图拼接），它们走 fetch —— 页面 origin 与 app-image:// 不同源，
      // 响应里没有 CORS 头就会被浏览器拦掉；<img> 显示不受影响，所以只会在
      // 「读取」时暴露。显式补一个允许所有来源的头（该协议只服务本机文件）。
      const response = await net.fetch(pathToFileURL(filePath).toString())
      const headers = new Headers(response.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
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
