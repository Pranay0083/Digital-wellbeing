/**
 * Time limits engine
 * Determines whether a domain has exceeded its daily limit
 */

const db = require('../storage/sqlite');

function isLimitReached(domain) {
  const limit = db.getDailyLimit(domain);

  if (!limit) {
    // No limit set
    return false;
  }

  const used = db.getTodayUsage(domain);

  return used >= limit;
}

function getRemainingTime(domain) {
  const limit = db.getDailyLimit(domain);

  if (!limit) return null;

  const used = db.getTodayUsage(domain);

  return Math.max(0, limit - used);
}

module.exports = {
  isLimitReached,
  getRemainingTime
};
