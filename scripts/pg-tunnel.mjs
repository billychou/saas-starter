#!/usr/bin/env node
/**
 * 本地 TCP → HTTP CONNECT 隧道，用于在直连被重置的网络环境下访问 Neon Postgres。
 *
 * 用法:
 *   node scripts/pg-tunnel.mjs [listenPort] [targetHost:targetPort]
 *
 * 环境变量:
 *   PG_TUNNEL_PROXY  本地 HTTP 代理地址（默认 http://127.0.0.1:15236）
 *
 * 然后把 .env 里 POSTGRES_URL 的 host 改成 127.0.0.1:<listenPort>，
 * 并保留原域名作为 SNI：追加 &sslsni=<targetHost>（postgres.js 支持）。
 */
import net from 'node:net';
import http from 'node:http';

const LISTEN_PORT = Number(process.argv[2] || process.env.PG_TUNNEL_PORT || 15432);
const TARGET = process.argv[3] || process.env.PG_TUNNEL_TARGET ||
  'ep-little-brook-a1jobr55-pooler.ap-southeast-1.aws.neon.tech:5432';
const PROXY_URL = new URL(process.env.PG_TUNNEL_PROXY || 'http://127.0.0.1:15236');

const [targetHost, targetPort] = TARGET.split(':');

const server = net.createServer((client) => {
  const req = http.request({
    host: PROXY_URL.hostname,
    port: PROXY_URL.port,
    method: 'CONNECT',
    path: `${targetHost}:${targetPort}`,
    agent: false
  });

  req.on('connect', (res, upstream) => {
    if (res.statusCode !== 200) {
      console.error(`[pg-tunnel] proxy CONNECT failed: ${res.statusCode}`);
      client.destroy();
      upstream.destroy();
      return;
    }
    client.pipe(upstream).pipe(client);
    const cleanup = () => { client.destroy(); upstream.destroy(); };
    client.on('error', cleanup);
    upstream.on('error', cleanup);
    client.on('close', cleanup);
    upstream.on('close', cleanup);
  });

  req.on('error', (err) => {
    console.error(`[pg-tunnel] proxy request error: ${err.message}`);
    client.destroy();
  });

  req.end();
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log(`[pg-tunnel] 127.0.0.1:${LISTEN_PORT} -> ${TARGET} via ${PROXY_URL.origin}`);
});
