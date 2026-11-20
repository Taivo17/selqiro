"use strict";
// Fixed local checks for this release. No hosted endpoint or live user data.
const {spawnSync} = require("node:child_process");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const checks = [
  ["--test", "tests/profile-media-ui.test.cjs", "tests/profile-editor.test.cjs", "tests/profile-read-privacy-callers.test.cjs"],
  ["--conditions=react-server", "--test", "tests/profile-media-server.test.cjs"],
];
for (const argv of checks) {
  const result = spawnSync(process.execPath, argv, {
    cwd: root, stdio: "inherit", timeout: 80000,
    env: {...process.env, NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1"},
  });
  if (result.error || result.signal || result.status !== 0) {
    process.stderr.write("Profile media checks did not complete successfully.\n");
    process.exit(1);
  }
}
