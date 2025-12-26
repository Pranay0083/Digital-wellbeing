/**
 * Secure password prompt (no echo)
 * Works like sudo: input is hidden
 */

function promptPassword(message = 'Enter parental password: ') {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(message);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    function onData(char) {
      char = char.toString();

      // ENTER
      if (char === '\n' || char === '\r') {
        stdout.write('\n');
        cleanup();
        resolve(password);
        return;
      }

      // CTRL+C
      if (char === '\u0003') {
        cleanup();
        process.exit();
      }

      // BACKSPACE
      if (char === '\u007F') {
        password = password.slice(0, -1);
        return;
      }

      // Ignore all other control characters
      if (char < ' ') return;

      // Append character WITHOUT echoing
      password += char;
    }

    function cleanup() {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onData);
  });
}

module.exports = {
  promptPassword
};
