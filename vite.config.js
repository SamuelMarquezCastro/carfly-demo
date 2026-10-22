import { defineConfig } from 'vite';
import { cpSync, mkdirSync, createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';

// Serve Cesium's workers/assets unchanged in dev and copy them for production.
export default defineConfig({
  define: { CESIUM_BASE_URL: JSON.stringify('/cesium/') },
  plugins: [{
    name: 'cesium-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/cesium/')) return next();
        const root = resolve('node_modules/cesium/Build/Cesium');
        let file;
        try { file = resolve(root, decodeURIComponent(req.url.split('?')[0].slice('/cesium/'.length))); }
        catch { res.statusCode=400;res.end();return; }
        if (!file.startsWith(root + sep)) {res.statusCode=403;res.end();return;}
        try { if(!statSync(file).isFile()) throw new Error(); }
        catch {res.statusCode=404;res.end();return;}
        const types = {'.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.ktx2':'image/ktx2'};
        res.setHeader('Content-Type',types[extname(file)] || 'application/octet-stream');
        if(req.method==='HEAD') {res.end();return;}
        createReadStream(file).on('error',()=>res.destroy()).pipe(res);
      });
    },
    closeBundle() {
      mkdirSync('dist/cesium', { recursive: true });
      for (const dir of ['Assets', 'ThirdParty', 'Widgets', 'Workers']) {
        cpSync(`node_modules/cesium/Build/Cesium/${dir}`, `dist/cesium/${dir}`, { recursive: true });
      }
    },
  }],
  build: { chunkSizeWarningLimit: 5000 },
});
