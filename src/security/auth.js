/**
 * Parental authentication logic
 */

const keychain = require('./keychain');

function verifyPassword(input) {
  const stored = keychain.getPassword();
  if (!stored) return false;
  return input === stored;
}

function ensurePasswordSet() {
  if (!keychain.passwordExists()) {
    console.log('No parental password set.');
    console.log('Run: dw auth set');
    process.exit(1);
  }
}

module.exports = {
  verifyPassword,
  ensurePasswordSet
};
