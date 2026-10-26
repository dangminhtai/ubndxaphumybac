const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('../backend/node_modules/dotenv');
const envPath = path.resolve(__dirname, '../.env');
const fileEnv = fs.existsSync(envPath) ? parse(fs.readFileSync(envPath)) : {};
const port = process.env.PORT || fileEnv.PORT || '5002';
const url = `http://127.0.0.1:${port}/api/ready`;

async function waitForBackend() {
  console.log(`[startup] Đang chờ backend + MongoDB + khởi tạo: ${url}`);
  let previous = '';
  while (true) {
    let phase = 'Backend chưa nhận kết nối';
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000), cache: 'no-store' });
      const state = await response.json();
      if (response.ok && state.ready === true && state.phase === 'ready') {
        console.log('[startup] Hệ thống READY. Bắt đầu mở frontend.');
        return;
      }
      phase = `${state.phase || 'not_ready'} · MongoDB: ${state.mongodb || 'unknown'}`;
    } catch { /* Keep waiting; backend may still be starting or restarting. */ }
    if (phase !== previous) {
      console.log(`[startup] ${phase}`);
      previous = phase;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}
waitForBackend().catch((error) => { console.error(error.message); process.exitCode = 1; });
