/**
 * Detects whether the user is idle on macOS
 * Uses HIDIdleTime (nanoseconds since last input)
 */

const { exec } = require('child_process');

function isUserIdle(thresholdSeconds = 60) {
  return new Promise((resolve) => {
    exec(
      `ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF; exit}'`,
      (err, stdout) => {
        if (err || !stdout) {
          // Fail safe: assume not idle
          return resolve(false);
        }

        const idleNanoseconds = parseInt(stdout.trim(), 10);

        if (isNaN(idleNanoseconds)) {
          return resolve(false);
        }

        const idleSeconds = idleNanoseconds / 1e9;

        resolve(idleSeconds >= thresholdSeconds);
      }
    );
  });
}

module.exports = {
  isUserIdle
};
