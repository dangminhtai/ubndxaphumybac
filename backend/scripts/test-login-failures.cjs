const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const User = require('../dist/models/User').default;
const audit = require('../dist/services/audit.service');
const logs = [];
audit.writeAuditLog = async (input) => { logs.push(input); };
const { loginUser } = require('../dist/services/auth.service');

async function main() {
  User.findOne = async () => null;
  await assert.rejects(loginUser({ username: 'unknown-fixture', password: 'secret-fixture' }), (e) => e.statusCode === 401);
  assert.equal(logs.at(-1).action, 'LOGIN_FAILED');
  assert.equal(logs.at(-1).attemptedUsername, 'unknown-fixture');
  User.findOne = async () => ({ isActive: false });
  await assert.rejects(loginUser({ username: 'disabled-fixture', password: 'secret-fixture' }), (e) => e.statusCode === 401);
  assert.equal(logs.at(-1).attemptedUsername, 'disabled-fixture');
  User.findOne = async () => ({ isActive: true, passwordHash: await bcrypt.hash('correct-fixture', 4) });
  for (const username of ['admin', 'staff-fixture']) {
    await assert.rejects(loginUser({ username, password: 'secret-fixture' }), (e) => e.statusCode === 401);
    assert.equal(logs.at(-1).attemptedUsername, username);
  }
  assert.equal(logs.length, 4);
  assert.ok(!JSON.stringify(logs).includes('secret-fixture'));
  await assert.rejects(loginUser({ username: { $ne: null }, password: 'secret-fixture' }), (e) => e.statusCode === 400);
  console.log('PASS: unknown username, disabled account and wrong passwords for admin/staff all audited; passwords excluded; no real DB writes.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
