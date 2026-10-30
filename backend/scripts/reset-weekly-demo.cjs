// Entry point 2: remove only this demo run and restore its business-data snapshot.
require('./weekly-demo-core.cjs').runCli('reset').catch((error) => { console.error(error.message); process.exitCode = 1; });
