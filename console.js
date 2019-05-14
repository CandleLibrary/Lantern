#!/bin/sh node 

const { spawn } = require('child_process');
const path = require("path")

let runner = spawn("node", ["--experimental-modules", path.resolve(require.main.path, "cli.mjs")]);

runner.stdout.pipe(process.stdout);

runner.stderr.pipe(process.stderr);

process.stdin.pipe(runner.stdin);

runner.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
