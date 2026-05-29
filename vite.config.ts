import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const copyPublicPlugin = {
  name: 'copy-public-plugin',
  closeBundle() {
    const src = path.resolve(process.cwd(), 'public');
    const dest = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(src)) {
      fs.mkdirSync(dest, { recursive: true });
      fs.cpSync(src, dest, { recursive: true });
    }
  }
};

// https://vite.dev/config/
// NOTE: Z: is a network/SMB drive — cache is redirected to local C: to avoid ENOTEMPTY/ENOTSUP errors
export default defineConfig({
  base: '', // 关键：使用相对路径
  publicDir: false, // Disable built-in copy to avoid ENOTSUP on SMB
  plugins: [react(), copyPublicPlugin],
  // Redirect Vite's dep cache off the Z: network drive to avoid filesystem errors
  cacheDir: 'C:/Temp/vite-vacab-cache',
  server: {
    host: true,
    port: 4173,
    // Disable chokidar file watching (ENOTSUP on SMB drives)
    watch: null,
  },
  preview: {
    host: true,
    port: 4173,
  },
})

