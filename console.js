#!/usr/bin/env node

const { spawn } = require('child_process');

const path = require("path")

let runner = spawn("node", ["--experimental-modules", path.resolve(".", "cli.mjs")]);

runner.stdout.pipe(process.stdout);

runner.stderr.pipe(process.stderr);

runner.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
