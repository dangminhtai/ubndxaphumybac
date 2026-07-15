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
