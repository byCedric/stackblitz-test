require('debug').enable('tunnel*');

const { createTunnel } = require('.');
// const tunnel = createTunnel({ api: 'wss://cloufdlare-tunnel.cedric-dev.workers.dev/?_tunnel=true' });
// const tunnel = createTunnel({ api: 'wss://xxxxx.finest.dev' });
const tunnel = createTunnel({ api: 'ws://192.168.86.22:8787?_tunnel=true' });

console.log('Starting tunnel...');
tunnel.start()
  .then(() => console.log('Tunnel started!'))
  .catch((error) => {
    console.error('Tunnel failed to start', error);
    process.exit(1);
  });

// Keep the process alive
process.stdin.resume();
