/**
 * macOS Keychain wrapper
 */

const { execSync } = require('child_process');

const SERVICE = 'DigitalWell';
const ACCOUNT = 'parental-password';

function setPassword(password) {
  execSync(
    `security add-generic-password -U -s "${SERVICE}" -a "${ACCOUNT}" -w "${password}"`,
    { stdio: 'ignore' }
  );
}

function getPassword() {
  try {
    return execSync(
      `security find-generic-password -s "${SERVICE}" -a "${ACCOUNT}" -w`,
      { encoding: 'utf8' }
    ).trim();
  } catch {
    return null;
  }
}

function passwordExists() {
  return !!getPassword();
}

module.exports = {
  setPassword,
  getPassword,
  passwordExists
};
