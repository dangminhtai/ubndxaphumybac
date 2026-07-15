const assert = require('node:assert/strict');
const { classifyError } = require('../dist/middleware/error.middleware');

const databaseError = new Error('Operation `reports.findOne()` buffering timed out after 10000ms');
databaseError.name = 'MongooseError';
assert.deepEqual(classifyError(databaseError), {
  statusCode: 503,
  code: 'DATABASE_UNAVAILABLE',
  publicMessage: 'Dữ liệu đang tạm thời mất kết nối. Vui lòng thử lại sau.',
  retryable: true,
});

const conflictError = Object.assign(new Error('Báo cáo kỳ này đã nộp, không thể ghi đè'), {
  statusCode: 409,
  code: 'REPORT_ALREADY_SUBMITTED',
});
assert.deepEqual(classifyError(conflictError), {
  statusCode: 409,
  code: 'REPORT_ALREADY_SUBMITTED',
  publicMessage: 'Báo cáo kỳ này đã nộp, không thể ghi đè',
  retryable: false,
});

const internalError = new Error('mongodb://username:password@private-host/internal');
const classifiedInternal = classifyError(internalError);
assert.equal(classifiedInternal.statusCode, 503);
assert.equal(classifiedInternal.code, 'DATABASE_UNAVAILABLE');
assert.ok(!classifiedInternal.publicMessage.includes('password'));

const genericInternal = classifyError(new Error('Secret implementation detail'));
assert.equal(genericInternal.statusCode, 500);
assert.equal(genericInternal.code, 'INTERNAL_ERROR');
assert.equal(genericInternal.publicMessage, 'Máy chủ không xử lý được yêu cầu.');

console.log(JSON.stringify({ passed: true, assertions: 8 }, null, 2));
