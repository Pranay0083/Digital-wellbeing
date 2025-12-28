/**
 * Tracks which warnings have been shown (per day, per domain)
 */

const state = {};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function hasShown(domain, level) {
  const day = todayKey();
  return state[day]?.[domain]?.[level] === true;
}

function markShown(domain, level) {
  const day = todayKey();
  state[day] = state[day] || {};
  state[day][domain] = state[day][domain] || {};
  state[day][domain][level] = true;
}

function resetOldDays() {
  const day = todayKey();
  for (const key of Object.keys(state)) {
    if (key !== day) delete state[key];
  }
}

module.exports = {
  hasShown,
  markShown,
  resetOldDays
};
