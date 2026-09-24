// vite.config.ts
import { defineConfig } from "file:///D:/xiang/gzh-layout/node_modules/.pnpm/vite@5.4.21_@types+node@25.5.0/node_modules/vite/dist/node/index.js";
import path from "node:path";
import electron from "file:///D:/xiang/gzh-layout/node_modules/.pnpm/vite-plugin-electron@0.28.8_4f71060a0595e75db0694e3f5d80bdba/node_modules/vite-plugin-electron/dist/simple.mjs";
import vue from "file:///D:/xiang/gzh-layout/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vi_7f0d164d1bcaeeb5875429cb17de7dba/node_modules/@vitejs/plugin-vue/dist/index.mjs";
var __vite_injected_original_dirname = "D:\\xiang\\gzh-layout";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            rollupOptions: {
              external: ["sharp", "@img/sharp-win32-x64", "fs-extra", "cheerio"]
            }
          }
        }
      },
      preload: {
        input: path.join(__vite_injected_original_dirname, "electron/preload.ts")
      },
      renderer: process.env.NODE_ENV === "test" ? void 0 : {}
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "src"),
      "@comic": path.resolve(__vite_injected_original_dirname, "src/modules/comic")
    }
  },
  build: {
    rollupOptions: {
      output: {
        // The JSON editor is cached separately and loaded with PageEditor.
        manualChunks(id) {
          if (id.includes("node_modules/@codemirror/") || id.includes("node_modules/codemirror/")) {
            return "json-editor";
          }
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFx4aWFuZ1xcXFxnemgtbGF5b3V0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFx4aWFuZ1xcXFxnemgtbGF5b3V0XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi94aWFuZy9nemgtbGF5b3V0L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCBlbGVjdHJvbiBmcm9tICd2aXRlLXBsdWdpbi1lbGVjdHJvbi9zaW1wbGUnXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHZ1ZSgpLFxuICAgIGVsZWN0cm9uKHtcbiAgICAgIG1haW46IHtcbiAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9tYWluLnRzJyxcbiAgICAgICAgdml0ZToge1xuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgIGV4dGVybmFsOiBbJ3NoYXJwJywgJ0BpbWcvc2hhcnAtd2luMzIteDY0JywgJ2ZzLWV4dHJhJywgJ2NoZWVyaW8nXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBwcmVsb2FkOiB7XG4gICAgICAgIGlucHV0OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnZWxlY3Ryb24vcHJlbG9hZC50cycpLFxuICAgICAgfSxcbiAgICAgIHJlbmRlcmVyOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Rlc3QnXG4gICAgICAgID8gdW5kZWZpbmVkXG4gICAgICAgIDoge30sXG4gICAgfSksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjJyksXG4gICAgICAnQGNvbWljJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9tb2R1bGVzL2NvbWljJyksXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgLy8gVGhlIEpTT04gZWRpdG9yIGlzIGNhY2hlZCBzZXBhcmF0ZWx5IGFuZCBsb2FkZWQgd2l0aCBQYWdlRWRpdG9yLlxuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AY29kZW1pcnJvci8nKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2NvZGVtaXJyb3IvJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnanNvbi1lZGl0b3InXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVAsU0FBUyxvQkFBb0I7QUFDOVEsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sY0FBYztBQUNyQixPQUFPLFNBQVM7QUFIaEIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLFFBQ0osT0FBTztBQUFBLFFBQ1AsTUFBTTtBQUFBLFVBQ0osT0FBTztBQUFBLFlBQ0wsZUFBZTtBQUFBLGNBQ2IsVUFBVSxDQUFDLFNBQVMsd0JBQXdCLFlBQVksU0FBUztBQUFBLFlBQ25FO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxPQUFPLEtBQUssS0FBSyxrQ0FBVyxxQkFBcUI7QUFBQSxNQUNuRDtBQUFBLE1BQ0EsVUFBVSxRQUFRLElBQUksYUFBYSxTQUMvQixTQUNBLENBQUM7QUFBQSxJQUNQLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxLQUFLO0FBQUEsTUFDbEMsVUFBVSxLQUFLLFFBQVEsa0NBQVcsbUJBQW1CO0FBQUEsSUFDdkQ7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUE7QUFBQSxRQUVOLGFBQWEsSUFBSTtBQUNmLGNBQUksR0FBRyxTQUFTLDJCQUEyQixLQUFLLEdBQUcsU0FBUywwQkFBMEIsR0FBRztBQUN2RixtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
