// Clears the previous Next build output before a new build starts.
// The standalone output holds linked dependency folders. Windows refuses to
// scan those links on a second build, and the build stops. A clean start
// removes that failure.
const fs = require('node:fs');
const path = require('node:path');

const target = path.join(__dirname, '..', '.next');

try {
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch (error) {
  console.error(
    'Cerulea could not clear ' + target + '. ' +
    'Close any process holding the folder, then run the build again.',
  );
  throw error;
}
