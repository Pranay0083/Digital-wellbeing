/**
 * tracker.js — Active tab time accumulation
 *
 * ⚠️  MV3 service workers go dormant between events, wiping all in-memory state.
 * All session state is persisted in chrome.storage.session so it survives
 * service worker restarts. All exported functions are async.
 *
 * Session schema (chrome.storage.session):
 *   dw_session: { domain: string, startTime: number (ms epoch) } | null
 */

const SESSION_KEY = 'dw_session';

const IGNORED_PREFIXES = [
    'chrome://', 'chrome-extension://', 'edge://', 'about:', 'file://',
];

// ── Domain extraction ────────────────────────────────────────────────────────

/** Extract clean hostname from a URL string, or null if it should be ignored */
export function getDomain(url) {
    if (!url) return null;
    for (const prefix of IGNORED_PREFIXES) {
        if (url.startsWith(prefix)) return null;
    }
    try {
        const u = new URL(url);
        let host = u.hostname;
        if (host.startsWith('www.')) host = host.slice(4);
        return host || null;
    } catch {
        return null;
    }
}

// ── Session state helpers ────────────────────────────────────────────────────

async function getSession() {
    const r = await chrome.storage.session.get(SESSION_KEY);
    return r[SESSION_KEY] || null;
}

async function setSession(session) {
    await chrome.storage.session.set({ [SESSION_KEY]: session });
}

async function clearSession() {
    await chrome.storage.session.remove(SESSION_KEY);
}

// ── Core tracker API (all async) ─────────────────────────────────────────────

/**
 * Begin tracking a new domain.
 * Flushes any previous session and starts a fresh one.
 * @returns {Promise<{domain: string, seconds: number}|null>} flushed segment
 */
export async function startTracking(domain, now = Date.now()) {
    const flushed = await _flushAndClear(now);
    if (domain) {
        await setSession({ domain, startTime: now });
    }
    return flushed;
}

/**
 * Stop all tracking (focus loss / idle / browser close).
 * @returns {Promise<{domain, seconds}|null>}
 */
export async function stopTracking(now = Date.now()) {
    return _flushAndClear(now);
}

/**
 * Flush elapsed time for the CURRENT session WITHOUT stopping it.
 * Resets the session startTime to `now` so the next flush doesn't double-count.
 * Safe to call when the SW wakes from dormancy — reads state from session storage.
 * @returns {Promise<{domain, seconds}|null>}
 */
export async function flushCurrent(now = Date.now()) {
    const session = await getSession();
    if (!session) return null;

    const seconds = Math.round((now - session.startTime) / 1000);
    if (seconds <= 0) return null;

    // Roll the start time forward — keeps tracking without losing the segment
    await setSession({ domain: session.domain, startTime: now });
    return { domain: session.domain, seconds };
}

/** Get the domain currently being tracked (or null) */
export async function getActiveDomain() {
    const session = await getSession();
    return session?.domain || null;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _flushAndClear(now) {
    const session = await getSession();
    if (!session) return null;

    await clearSession();
    const seconds = Math.round((now - session.startTime) / 1000);
    if (seconds <= 0) return null;
    return { domain: session.domain, seconds };
}
