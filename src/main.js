import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
// NutUI 字体图标：@font-face + .nutui-iconfont 基类 + .nut-icon-xxx::before 字形（nut-icon 依赖，需全局引入）
import 'nutui-uniapp/styles/iconfont/iconfont.css';

export function createApp() {
  const app = createSSRApp(App);
  app.use(createPinia());
  return { app };
}
