'use strict';
// One local development backend; exact route targets and exact allowed app origin.
const http = require('node:http');
const fs = require('node:fs');
const m = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const key of ['gateway_port', 'auth_port', 'rest_port', 'storage_port']) {
  if (!Number.isSafeInteger(m[key]) || m[key] < 1024 || m[key] > 65535) throw new Error('invalid_port');
}
if (!['127.0.0.1', '0.0.0.0'].includes(m.gateway_bind)) throw new Error('invalid_bind');
const targets = [['/auth/v1', m.auth_port], ['/rest/v1', m.rest_port], ['/storage/v1', m.storage_port]];
const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    if (origin !== m.app_origin) { res.writeHead(403).end(); return; }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'ETag, Content-Range, Range, Upload-Offset, Upload-Length');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer, range, accept-profile, content-profile, x-upsert, x-amz-content-sha256, x-amz-date, x-amz-security-token, x-amz-checksum-crc32, x-amz-checksum-sha256, upload-offset, upload-length, upload-metadata, tus-resumable');
    res.setHeader('Access-Control-Max-Age', '0');
    res.writeHead(204).end(); return;
  }
  if (req.url === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({purpose: 'selqiro-v2-development', run_id: m.run_id})); return;
  }
  const match = targets.find(([prefix]) => req.url === prefix || req.url.startsWith(prefix + '/') || req.url.startsWith(prefix + '?'));
  if (!match) { res.writeHead(404).end(); return; }
  const [prefix, port] = match;
  const headers = {...req.headers, 'x-forwarded-prefix': prefix};
  delete headers['proxy-authorization']; delete headers['proxy-connection'];
  const upstream = http.request({host: '127.0.0.1', port, method: req.method, path: req.url.slice(prefix.length) || '/', headers}, response => {
    for (const [key, value] of Object.entries(response.headers)) {
      if (value !== undefined && !key.toLowerCase().startsWith('access-control-') && key !== 'connection') res.setHeader(key, value);
    }
    res.writeHead(response.statusCode || 502); response.pipe(res);
  });
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
  req.pipe(upstream);
});
server.requestTimeout = 65000; server.headersTimeout = 65000;
server.listen(m.gateway_port, m.gateway_bind, () => process.stdout.write('development-gateway-ready\n'));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
