const { env } = require('node:process');
const { hostname } = require('node:os');
const fs = require('node:fs');

// Ensure .env file exists
const host = `${hostname()}.boltexpo.dev`;
fs.writeFileSync(
  '.env',
  [
    `EXPO_NO_TELEMETRY=1`,
    `EXPO_NO_DEPENDENCY_VALIDATION=1`,
    `EXPO_PACKAGER_PROXY_URL=https://${host}`,
    `REACT_NATIVE_PACKAGER_HOSTNAME=${host}`,
    `EXPO_CLOUDFLARE_PROXY_URL=wss://${host}`,
  ].join('\n')
);

// Load the env file
env.NODE_ENV ||= 'development';
require('@expo/env').load(__dirname);

// Start the tunnel
if (!env.EXPO_CLOUDFLARE_PROXY_URL) {
  throw new Error('No EXPO_CLOUDFLARE_PROXY_URL defiend, configure your .env file manually');
}

const { createTunnel } = require('@lunchbox/tunnel');
const tunnel = createTunnel({ api: env.EXPO_CLOUDFLARE_PROXY_URL });

console.log('Starting tunnel...');
tunnel
  .start()
  .then(() => console.log('Tunnel started!', env.EXPO_CLOUDFLARE_PROXY_URL))
  .catch(error => {
    console.error('Tunnel failed to start', error);
    process.exit(1);
  });

// Start Expo
const child = require('child_process').spawn('npx', ['expo', 'start'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  env,
  detached: false,
});

process.on('exit', code => {
  tunnel.stop();
  process.exit(0);
});

child.on('exit', () => {
  tunnel.stop();
  process.exit(0);
});
