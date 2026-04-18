// serve.mjs — zero-dependency static server on localhost:3000
// Run with: node serve.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.otf':   'font/otf',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  try {
    // Strip query string, decode URI
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    // Resolve safely inside ROOT (block path traversal)
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403); return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stat) => {
      // If directory, try index.html inside it
      const resolved = (!err && stat.isDirectory())
        ? path.join(filePath, 'index.html')
        : (err ? path.join(filePath, 'index.html') : filePath);

      fs.stat(resolved, (err2, stat2) => {
        if (err2 || !stat2.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('404 Not Found: ' + urlPath);
        }
        const ext = path.extname(resolved).toLowerCase();
        const type = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': type,
          'Cache-Control': 'no-store',
        });
        fs.createReadStream(resolved).pipe(res);
      });
    });
  } catch (e) {
    res.writeHead(500); res.end('Server error: ' + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
