/**
 * Returns the active tab URL for supported browsers (macOS)
 * v1: Google Chrome only
 */

const { exec } = require('child_process');

function getActiveTabURL(browser) {
  if (browser !== 'chrome') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const script = `
      tell application "Google Chrome"
          if (count of windows) = 0 then
              return ""
          end if
          return URL of active tab of front window
      end tell
    `;

    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) {
        return resolve(null);
      }

      const url = stdout.trim();

      if (!url) {
        return resolve(null);
      }

      resolve(url);
    });
  });
}

module.exports = {
  getActiveTabURL
};
