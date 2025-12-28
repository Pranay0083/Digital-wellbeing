/**
 * macOS notification helper
 */

const { exec } = require('child_process');

function notify(title, message) {
  const script = `
    display notification "${message}" with title "${title}"
  `;

  exec(`osascript -e '${script.replace(/"/g, '\\"')}'`, () => {});
}

module.exports = {
  notify
};
