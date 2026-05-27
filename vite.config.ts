import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const saveCsvMiddleware = {
  name: 'save-csv-middleware',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else if (req.url === '/api/save-seed' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const { setName, csvContent } = JSON.parse(body);
            if (!setName || csvContent === undefined) {
              throw new Error('setName or csvContent is missing');
            }
            // Sanitize filename to prevent directory traversal
            const safeFilename = path.basename(setName) + '.csv';
            const filePath = path.resolve(process.cwd(), 'src/data/seeds', safeFilename);

            // Ensure directory exists
            fs.mkdirSync(path.dirname(filePath), { recursive: true });

            fs.writeFileSync(filePath, csvContent, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      } else {
        next();
      }
    });
  },
  configurePreviewServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else if (req.url === '/api/save-seed' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const { setName, csvContent } = JSON.parse(body);
            if (!setName || csvContent === undefined) {
              throw new Error('setName or csvContent is missing');
            }
            // Sanitize filename to prevent directory traversal
            const safeFilename = path.basename(setName) + '.csv';
            const filePath = path.resolve(process.cwd(), 'src/data/seeds', safeFilename);

            // Ensure directory exists
            fs.mkdirSync(path.dirname(filePath), { recursive: true });

            fs.writeFileSync(filePath, csvContent, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      } else {
        next();
      }
    });
  }
};

// https://vite.dev/config/
// NOTE: Z: is a network/SMB drive — cache is redirected to local C: to avoid ENOTEMPTY/ENOTSUP errors
export default defineConfig({
  base: '', // 关键：使用相对路径
  plugins: [react(), saveCsvMiddleware],
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

