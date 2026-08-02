import { createApp } from 'vue';
import './style.css';
import './theme/tokens.css';
import App from './App.vue';
import router from './router';
import pinia from './stores';
import { useTheme } from './theme/useTheme';

const app = createApp(App);

app.use(router);
app.use(pinia);

app.mount('#app').$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer?.on('main-process-message', (_event, message) => {
    console.log(message);
  });
});

// 初始化主题（应用保存的主题到 <html> class）
useTheme();
