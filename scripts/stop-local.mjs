import net from 'node:net';
import { controlAddress } from './local-control.mjs';
const socket = net.createConnection(controlAddress);
socket.on('data', data => process.stdout.write(data));
socket.on('error', error => { console.error(error.code === 'EACCES' ? 'Windows denied access to the launcher. Use the same user and terminal permissions as npm start.' : 'No KasaNidhi launcher is running for this workspace.'); process.exitCode = 1; });
