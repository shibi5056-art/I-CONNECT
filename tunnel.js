const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'db', 'localtunnel.log');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 3000 });

    const logMsg = `====================================\nLocaltunnel is active!\nPublic URL: ${tunnel.url}\n====================================\n`;
    console.log(logMsg);

    // Save URL to log file so we can retrieve it
    fs.writeFileSync(LOG_FILE, tunnel.url, 'utf-8');

    tunnel.on('close', () => {
      console.log('Tunnel closed');
      cleanup();
      process.exit(0);
    });

    // Keep the Node.js process alive indefinitely
    setInterval(() => {}, 1000 * 60 * 60);

  } catch (err) {
    console.error('Error starting tunnel:', err);
    cleanup();
    process.exit(1);
  }
})();

function cleanup() {
  if (fs.existsSync(LOG_FILE)) {
    try {
      fs.unlinkSync(LOG_FILE);
    } catch (e) {}
  }
}
