const { env } = require('node:process');
const { createTunnel } = require('cloudflare-tunnel');

require('@expo/env').load(__dirname);

const api = env.EXPO_CLOUDFLARE_PROXY_URL ?? 'wss://xxxxx.finest.dev';

const tunnel = createTunnel({ api });

console.log('Starting tunnel...');
tunnel.start()
  .then(() => console.log('Tunnel started!', api))
  .catch((error) => {
    console.error('Tunnel failed to start', error);
    process.exit(1);
  });

require('child_process').spawn('npx', ['expo', 'start'], { stdio: ['inherit', 'inherit', 'inherit'], env: process.env });
