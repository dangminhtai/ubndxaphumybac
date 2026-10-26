const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

async function main() {
  let ready = false;
  const server = http.createServer((_req, res) => {
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ready, phase: ready ? 'ready' : 'initializing', mongodb: 'connected' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const child = spawn(process.execPath, [path.resolve(__dirname, 'wait-for-backend.cjs')], {
    env: { ...process.env, PORT: String(server.address().port) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const done = new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', (code) => resolve(code)); });
  const timeout = setTimeout(() => child.kill(), 12000);
  try {
    await new Promise((resolve) => setTimeout(resolve, 1900));
    assert.equal(child.exitCode, null, 'Must not start frontend while initialization is pending');
    assert.match(stdout, /initializing/);
    ready = true;
    assert.equal(await done, 0, stderr);
    assert.match(stdout, /READY/);
    console.log('PASS: frontend startup waits for complete readiness, then continues.');
  } finally {
    clearTimeout(timeout);
    if (child.exitCode === null) child.kill();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
