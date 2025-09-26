const { startCLI } = require('./cli');

startCLI().catch(err => {
  console.error('Fatal error starting CLI:', err);
  process.exit(1);
});