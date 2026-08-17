import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  base: "/jie-work-v1/",
  css: {
    preprocessorOptions: {
      scss: {
        // 关键：uni-app 环境推荐使用 modern
        api: 'modern',
        silenceDeprecations: ['import', 'legacy-js-api'],
        additionalData: `@import "nutui-uniapp/styles/variables.scss";`
      }
    }
  }
});
