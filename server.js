// PWA 정적 파일 서빙 및 Spring Boot API 리버스 프록시 서버
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8088;
const DIST_DIR = path.join(__dirname, 'frontend', 'dist');
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. /api/ 요청 -> Spring Boot 백엔드로 프록시
  if (req.url.startsWith('/api/')) {
    const proxyReq = http.request(
      {
        host: BACKEND_HOST,
        port: BACKEND_PORT,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `${BACKEND_HOST}:${BACKEND_PORT}`,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.on('error', (err) => {
      console.error('[Proxy Error]:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: '백엔드 서버와 통신할 수 없습니다.' }));
    });

    req.pipe(proxyReq, { end: true });
    return;
  }

  // 2. 정적 PWA 파일 서빙
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA 라우팅 폴백: 파일이 없으면 index.html 서빙
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Service Worker 및 Manifest 캐시 방지 헤더
    if (urlPath === '/service-worker.js' || urlPath === '/manifest.json') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[PWA Server] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[PWA Server] Serving static files from: ${DIST_DIR}`);
  console.log(`[PWA Server] Forwarding /api/* -> http://${BACKEND_HOST}:${BACKEND_PORT}/api/*`);
});
