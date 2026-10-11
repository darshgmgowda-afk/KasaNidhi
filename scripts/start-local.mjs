import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { root, controlAddress } from './local-control.mjs';

const envFile = path.join(root, 'server', '.env');
if (!existsSync(envFile)) throw new Error('Run npm run setup:win first to create server/.env.');
const config = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/)
  .filter(line => /^(PORT|SCAN_SERVICE_URL)=/.test(line))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; }));
const webPort = Number(process.env.PORT || config.PORT || 3000);
const scanner = new URL(process.env.SCAN_SERVICE_URL || config.SCAN_SERVICE_URL || 'http://127.0.0.1:8000');
if (!['localhost', '127.0.0.1'].includes(scanner.hostname)) throw new Error('Local startup requires a localhost SCAN_SERVICE_URL.');
const scanPort = Number(scanner.port || 8000);
const python = path.join(root, 'scan-service', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python) || !existsSync(path.join(root, 'server/node_modules/express'))) throw new Error('Dependencies are missing. Run npm run setup:win first.');
async function free(port) {
  const occupied = await new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.setTimeout(1000, () => { socket.destroy(); resolve(false); });
  });
  if (occupied) throw new Error(`Port ${port} is occupied. Stop the existing service before starting KasaNidhi.`);
  await new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', () => reject(new Error(`Port ${port} is occupied. Stop the existing service before starting KasaNidhi.`)));
    s.listen(port, '127.0.0.1', () => s.close(resolve));
  });
}
const children = [];
let stopping = false;
const control = net.createServer(socket => socket.end('Stopping KasaNidhi services.\n', () => stop()));
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  control.close();
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      // The Windows venv launcher owns a second Python process; stop its tree.
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      killer.on('error', () => child.kill());
      killer.on('exit', code => { if (code) { console.error('Windows could not stop a service process tree.'); child.kill(); } });
    } else child.kill();
  }
  process.exitCode = code;
}
function launch(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) { console.error(`A required service exited (${code}).`); stop(code || 1); } });
}
async function ready(url, timeout = 30000) {
  const until = Date.now() + timeout;
  while (!stopping && Date.now() < until) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(1500) }); if (r.ok) return await r.json(); } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Service did not become healthy: ${url}`);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
try {
  await free(webPort);
  await free(scanPort);
  await new Promise((resolve, reject) => { control.once('error', reject); control.listen(controlAddress, resolve); });
  launch(python, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(scanPort)], path.join(root, 'scan-service'));
  await ready(`${scanner.origin}/health`);
  launch(process.execPath, ['server.js'], path.join(root, 'server'));
  const health = await ready(`http://127.0.0.1:${webPort}/api/health`);
  if (!health.scanner) throw new Error('Backend cannot reach Drishti; check SCAN_SERVICE_URL.');
  console.log(`\nKasaNidhi ready: http://localhost:${webPort}\nStorage: ${health.storage}; chat: ${health.chat}; voice: ${health.voice}\nPress Ctrl+C or run npm stop to stop both services.`);
} catch (error) { console.error(error.message); stop(1); }
