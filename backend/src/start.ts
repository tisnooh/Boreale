import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Run from the backend package; production environment variables keep priority.
const localFile = resolve(process.cwd(), '.env.local');
if (existsSync(localFile)) {
  if (typeof process.loadEnvFile !== 'function') throw new Error('Local .env.local loading requires Node.js 20.12 or newer.');
  process.loadEnvFile(localFile);
}
await import('./server.js');
