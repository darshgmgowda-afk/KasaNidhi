import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const root = fileURLToPath(new URL('../', import.meta.url));
const id = createHash('sha256').update(root.toLowerCase()).digest('hex').slice(0, 20);
export const controlAddress = process.platform === 'win32' ? `\\\\.\\pipe\\kasanidhi-${id}` : `${root}.local/kasanidhi.sock`;
