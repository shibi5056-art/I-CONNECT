const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'db', 'localtunnel.log');

function cleanup() {
  if (fs.existsSync(LOG_FILE)) {
    try {
      fs.unlinkSync(LOG_FILE);
    } catch (e) {}
  }
}

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 3000 });

    const logMsg = `====================================\nLocaltunnel is active!\nPublic URL: ${tunnel.url}\n====================================\n`;
    console.log(logMsg);

    fs.writeFileSync(LOG_FILE, tunnel.url, 'utf-8');

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 5s...');
      cleanup();
      setTimeout(startTunnel, 5000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
      cleanup();
      try { tunnel.close(); } catch (e) {}
      setTimeout(startTunnel, 5000);
    });

  } catch (err) {
    console.error('Error starting tunnel, retrying in 5s:', err.message);
    cleanup();
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();

// Keep Node process alive
setInterval(() => {}, 1000 * 60 * 60);
