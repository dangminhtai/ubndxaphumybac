const assert = require('node:assert/strict');
process.env.PORT = '0';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused_readiness_fixture';
process.env.JWT_SECRET = 'readiness-fixture-only';
process.env.FRONTEND_ORIGIN = 'http://127.0.0.1';
process.env.NODE_ENV = 'test';
const db = require('../dist/config/db');
let state = { ready: false, mongodb: 'connected', phase: 'initializing' };
db.getApplicationReadiness = () => state;
db.connectDatabase = async () => false;
db.onDatabaseConnected = () => () => {};
const express = require('express');
const listen = express.application.listen;
let server;
express.application.listen = function (...args) { server = listen.apply(this, args); return server; };
require('../dist/index');

async function main() {
  if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const phase of ['waiting_for_database', 'initializing', 'initialization_failed']) {
      state = { ready: false, mongodb: phase === 'waiting_for_database' ? 'disconnected' : 'connected', phase };
      for (const endpoint of ['/api/health', '/api/ready']) {
        const response = await fetch(base + endpoint);
        assert.equal(response.status, 503);
        assert.equal((await response.json()).ready, false);
        assert.equal(response.headers.get('cache-control'), 'no-store');
      }
      const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 503);
      assert.equal((await response.json()).code, 'APPLICATION_NOT_READY');
      assert.equal(response.headers.get('retry-after'), '3');
      assert.equal((await fetch(base + '/api/live')).status, 200);
    }
    state = { ready: true, mongodb: 'connected', phase: 'ready' };
    assert.equal((await fetch(base + '/api/health')).status, 200);
    assert.equal((await fetch(base + '/api/ready')).status, 200);
    assert.equal((await fetch(base + '/api/auth/me')).status, 401);
    console.log('PASS: actual app routes health/ready return 503 until initialized; live stays 200; business API blocks until ready, then normal auth applies. No real DB connection.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
