/**
 * storage.js — chrome.storage.local abstraction
 *
 * Data schema:
 *   day:{YYYY-MM-DD}  → { "domain.com": seconds, ... }
 *   limits            → { "domain.com": seconds, ... }
 *   ignored           → ["domain.com", ...]
 */

export function todayKey() {
    return `day:${new Date().toISOString().slice(0, 10)}`;
}

export function dateKey(date) {
    return `day:${date}`;
}

/** Returns YYYY-MM-DD for N days ago (0 = today) */
export function daysAgoDate(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}

/** Add `seconds` to a domain for today */
export async function addTime(domain, seconds) {
    if (!domain || seconds <= 0) return;
    const key = todayKey();
    const result = await chrome.storage.local.get([key]);
    const day = result[key] || {};
    day[domain] = (day[domain] || 0) + seconds;
    await chrome.storage.local.set({ [key]: day });
}

/** Get time data for a specific date string (YYYY-MM-DD) */
export async function getDayData(dateStr) {
    const key = dateKey(dateStr);
    const result = await chrome.storage.local.get([key]);
    return result[key] || {};
}

/** Get time data for today */
export async function getTodayData() {
    return getDayData(daysAgoDate(0));
}

/** Get array of {date, data} for the last 7 days (index 0 = oldest) */
export async function getWeekData() {
    const dates = [];
    for (let i = 6; i >= 0; i--) dates.push(daysAgoDate(i));
    const keys = dates.map(dateKey);
    const result = await chrome.storage.local.get(keys);
    return dates.map((date) => ({
        date,
        data: result[dateKey(date)] || {},
    }));
}

/** Get all data (all days, keyed by YYYY-MM-DD) */
export async function getAllData() {
    const everything = await chrome.storage.local.get(null);
    const out = {};
    for (const [k, v] of Object.entries(everything)) {
        if (k.startsWith('day:')) out[k.slice(4)] = v;
    }
    return out;
}

/** Remove data older than 30 days */
export async function pruneOldData() {
    const cutoff = daysAgoDate(30);
    const all = await chrome.storage.local.get(null);
    const toRemove = [];
    for (const key of Object.keys(all)) {
        if (key.startsWith('day:')) {
            const date = key.slice(4);
            if (date < cutoff) toRemove.push(key);
        }
    }
    if (toRemove.length > 0) await chrome.storage.local.remove(toRemove);
}

// ── Limits ──────────────────────────────────────────────────────────────────

export async function getLimits() {
    const r = await chrome.storage.local.get(['limits']);
    return r.limits || {};
}

export async function setLimit(domain, seconds) {
    const limits = await getLimits();
    limits[domain] = seconds;
    await chrome.storage.local.set({ limits });
}

export async function clearLimit(domain) {
    const limits = await getLimits();
    delete limits[domain];
    await chrome.storage.local.set({ limits });
}

// ── Ignored domains ──────────────────────────────────────────────────────────

export async function getIgnoredDomains() {
    const r = await chrome.storage.local.get(['ignored']);
    return r.ignored || ['newtab', 'chrome', 'chrome-extension', 'extensions', ''];
}

export async function addIgnored(domain) {
    const ignored = await getIgnoredDomains();
    if (!ignored.includes(domain)) {
        ignored.push(domain);
        await chrome.storage.local.set({ ignored });
    }
}

export async function removeIgnored(domain) {
    const r = await chrome.storage.local.get(['ignored']);
    const ignored = (r.ignored || []).filter((d) => d !== domain);
    await chrome.storage.local.set({ ignored });
}

// ── Notifications state (to avoid spam) ────────────────────────────────────

export async function getNotifiedLimits() {
    const r = await chrome.storage.local.get(['notifiedLimits']);
    return r.notifiedLimits || {};
}

export async function setNotifiedLimit(domain, timestamp) {
    const n = await getNotifiedLimits();
    n[domain] = timestamp;
    await chrome.storage.local.set({ notifiedLimits: n });
}

/** Clear notification flags at midnight */
export async function clearDailyNotifications() {
    await chrome.storage.local.set({ notifiedLimits: {} });
}

// ── Full export ──────────────────────────────────────────────────────────────

export async function exportAllData() {
    const [allData, limits, ignored] = await Promise.all([
        getAllData(),
        getLimits(),
        getIgnoredDomains(),
    ]);
    return { exportedAt: new Date().toISOString(), timeData: allData, limits, ignored };
}

export async function clearAllData() {
    const all = await chrome.storage.local.get(null);
    const dayKeys = Object.keys(all).filter((k) => k.startsWith('day:'));
    await chrome.storage.local.remove([...dayKeys, 'notifiedLimits']);
}
