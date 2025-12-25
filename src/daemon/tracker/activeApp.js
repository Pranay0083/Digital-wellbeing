/**
 * Detects the currently active (foreground) application on macOS
 */

const { exec } = require('child_process');

const SUPPORTED_BROWSERS = {
  'Google Chrome': {
    isBrowser: true,
    browser: 'chrome'
  }
};

function getActiveApp() {
  return new Promise((resolve) => {
    const script = `
      tell application "System Events"
          get name of first application process whose frontmost is true
      end tell
    `;

    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err || !stdout) {
        return resolve(null);
      }

      const appName = stdout.trim();

      if (SUPPORTED_BROWSERS[appName]) {
        return resolve({
          name: appName,
          isBrowser: true,
          browser: SUPPORTED_BROWSERS[appName].browser
        });
      }

      resolve({
        name: appName,
        isBrowser: false
      });
    });
  });
}

module.exports = {
  getActiveApp
};
