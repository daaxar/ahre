#!/usr/bin/env node
import { AhreCli } from '../src/ahre-cli.mjs';

const cli = new AhreCli({ cwd: process.cwd() });
cli.run(process.argv.slice(2)).catch((error) => {
  const payload = {
    status: 'FAILED',
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.AHRE_DEBUG === '1' ? error.stack : undefined
    }
  };
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
});
