import { spawn } from "node:child_process";
import process from "node:process";

const commands = [
  ["web", "npm run dev:web"],
  ["api", "npm run dev:api"],
];

const children = commands.map(([name, command]) => [
  name,
  spawn(command, { stdio: "inherit", shell: true, windowsHide: false }),
]);

let shuttingDown = false;

function stopAll(signal = "SIGTERM") {
  for (const [, child] of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const [name, child] of children) {
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    stopAll();

    if (signal) {
      console.error(`${name} stopped by ${signal}.`);
      process.exit(1);
    }

    if (code) console.error(`${name} exited with code ${code}.`);
    process.exit(code ?? 0);
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    shuttingDown = true;
    stopAll(signal);
    setTimeout(() => process.exit(0), 500);
  });
}