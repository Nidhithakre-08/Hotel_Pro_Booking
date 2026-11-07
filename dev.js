import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const viteEntry = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const children = new Set();
let shuttingDown = false;
let exitCode = 0;

function stop(code = 0) {
  if (shuttingDown) return;

  shuttingDown = true;
  exitCode = code;

  for (const child of children) {
    child.kill();
  }
}

function start(name, args) {
  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  children.add(child);
  child.on('error', (error) => {
    console.error(`Could not start ${name}:`, error);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      console.error(`${name} stopped${signal ? ` (${signal})` : ` with exit code ${code}`}.`);
      stop(code || 1);
    }
    if (shuttingDown && children.size === 0) {
      process.exitCode = exitCode;
    }
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

start('HotelPro API', ['server.js']);
start('Vite frontend', [viteEntry, '--host', '0.0.0.0']);
