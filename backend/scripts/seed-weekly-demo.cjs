// Entry point 1: create clearly marked sample reports for the current open week.
require('./weekly-demo-core.cjs').runCli('seed').catch((error) => { console.error(error.message); process.exitCode = 1; });
