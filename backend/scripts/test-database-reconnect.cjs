const assert = require('node:assert/strict');
const { getReconnectDelay } = require('../dist/config/db');

assert.equal(getReconnectDelay(-1), 2_000);
assert.equal(getReconnectDelay(0), 2_000);
assert.equal(getReconnectDelay(1), 4_000);
assert.equal(getReconnectDelay(2), 8_000);
assert.equal(getReconnectDelay(3), 16_000);
assert.equal(getReconnectDelay(4), 30_000);
assert.equal(getReconnectDelay(20), 30_000);

console.log(JSON.stringify({
  passed: true,
  assertions: 7,
  retryDelaysMs: [0, 1, 2, 3, 4].map(getReconnectDelay),
}, null, 2));

async function testReadiness() {
  const mongoose = require('mongoose');
  const db = require('../dist/config/db');
  let state = 0;
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => state });
  mongoose.connect = async () => { state = 1; mongoose.connection.emit('connected'); return mongoose; };
  mongoose.connection.close = async () => { state = 0; };
  let release;
  let behavior = 'pending';
  db.onDatabaseConnected(async () => {
    if (behavior === 'pending') await new Promise((resolve) => { release = resolve; });
    if (behavior === 'fail') throw new Error('Fixture initialization failure');
  });
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  assert.equal(db.getApplicationReadiness().ready, false);
  await db.connectDatabase();
  assert.equal(db.getApplicationReadiness().phase, 'initializing');
  assert.equal(db.getApplicationReadiness().ready, false, 'Connected MongoDB alone must not be ready');
  release();
  await tick();
  assert.equal(db.getApplicationReadiness().ready, true);
  state = 0;
  mongoose.connection.emit('disconnected');
  assert.equal(db.getApplicationReadiness().ready, false);
  behavior = 'fail';
  state = 1;
  mongoose.connection.emit('connected');
  await tick();
  assert.equal(db.getApplicationReadiness().phase, 'initialization_failed');
  assert.equal(db.getApplicationReadiness().ready, false);
  behavior = 'pass';
  await new Promise((resolve) => setTimeout(resolve, 5200));
  assert.equal(db.getApplicationReadiness().ready, true);
  await db.closeDatabase();
  assert.equal(db.getApplicationReadiness().ready, false);
  console.log('PASS: readiness waits for initialization, drops on disconnect/failure and recovers; isolated fixture, no real DB writes.');
}
testReadiness().catch((error) => { console.error(error); process.exitCode = 1; });
