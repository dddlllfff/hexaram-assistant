import { spawn } from 'node:child_process';
import electron from 'electron';
import { createServer } from 'vite';
const server = await createServer({ server: { host: '127.0.0.1' } });
await server.listen();
const env = { ...process.env, HEXARAM_DEV: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ['.'], { stdio: 'inherit', env });
async function close(code = 0) {
  await server.close();
  process.exit(code);
}
child.on('exit', (code) => close(code ?? 0));
child.on('error', (error) => {
  console.error(error);
  close(1);
});
process.on('SIGINT', () => {
  child.kill();
  close();
});
