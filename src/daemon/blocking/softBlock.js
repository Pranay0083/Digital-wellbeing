/**
 * Soft blocking for macOS (Chrome)
 * Closes the active tab when limit is exceeded
 */

const { exec } = require('child_process');

function closeActiveTab(browser) {
  if (browser !== 'chrome') return;

  const script = `
    tell application "Google Chrome"
      if (count of windows) > 0 then
        close active tab of front window
      end if
    end tell
  `;

  exec(`osascript -e '${script}'`, () => {});
}

module.exports = {
  closeActiveTab
};
