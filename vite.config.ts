import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'
import monacoEditorPluginImport from 'vite-plugin-monaco-editor'

// CJS 互操作：vite-plugin-monaco-editor 以 module.exports.default 导出，
// esbuild bundle vite.config.ts 时 default 未自动解包，需手动取 default
const monacoEditorPlugin: any =
  (monacoEditorPluginImport as unknown as { default?: any }).default ??
  monacoEditorPluginImport

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['sharp', '@img/sharp-win32-x64', 'fs-extra'],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: process.env.NODE_ENV === 'test'
        ? undefined
        : {},
    }),
    monacoEditorPlugin({
      languageWorkers: ['json'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@comic': path.resolve(__dirname, 'src/modules/comic'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 将 monaco-editor 核心拆为独立 chunk，避免打入 PageEditor，
        // 便于浏览器独立缓存与并行加载。
        manualChunks(id) {
          if (id.includes('node_modules/monaco-editor/')) {
            return 'monaco-editor'
          }
        },
      },
    },
  },
})
