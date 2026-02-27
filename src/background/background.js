/**
 * background.js — Digital Wellbeing Service Worker
 *
 * Responsibilities:
 *  - Track active tab time via tabs/windows/idle events
 *  - Flush time to storage every minute via alarm
 *  - Check daily limits and fire notifications / content-script overlay
 *  - Prune old data at midnight
 */

import { getDomain, startTracking, stopTracking, flushCurrent } from './tracker.js';
import {
    addTime,
    getTodayData,
    getLimits,
    getIgnoredDomains,
    getNotifiedLimits,
    setNotifiedLimit,
    clearDailyNotifications,
    pruneOldData,
} from './storage.js';

const ALARM_NAME = 'dw-flush';
const MIDNIGHT_ALARM = 'dw-midnight';

// ── Initialisation ────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
    await chrome.alarms.clearAll();
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
    scheduleMidnightAlarm();
    await pruneOldData();
    console.log('[DW] Extension installed/updated. Alarms set.');
});

chrome.runtime.onStartup.addListener(async () => {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
    scheduleMidnightAlarm();
    // Resync: if the browser was reopened with an active tab, start tracking it
    const url = await getActiveTabUrl();
    await handleDomainSwitch(url);
});

function scheduleMidnightAlarm() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 500);
    chrome.alarms.create(MIDNIGHT_ALARM, { when: tomorrow.getTime() });
}

// ── Helper: get active tab URL ────────────────────────────────────────────────

async function getActiveTabUrl() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab?.url || null;
    } catch {
        return null;
    }
}

// ── Helper: should track this domain? ────────────────────────────────────────

async function shouldTrack(domain) {
    if (!domain) return false;
    const ignored = await getIgnoredDomains();
    return !ignored.includes(domain);
}

// ── Domain switch ─────────────────────────────────────────────────────────────

async function handleDomainSwitch(newUrl) {
    const newDomain = getDomain(newUrl);
    const track = newDomain ? await shouldTrack(newDomain) : false;
    const flushed = await startTracking(track ? newDomain : null);
    if (flushed) {
        await addTime(flushed.domain, flushed.seconds);
    }
}

// ── Tab events ────────────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    try {
        const tab = await chrome.tabs.get(tabId);
        await handleDomainSwitch(tab.url);
    } catch {
        // tab may have closed
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    // Only react if this is the active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id !== tabId) return;
    await handleDomainSwitch(tab.url);
});

// ── Window focus events ────────────────────────────────────────────────────────

chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Browser lost focus — stop tracking
        const flushed = await stopTracking();
        if (flushed) await addTime(flushed.domain, flushed.seconds);
    } else {
        // Browser gained focus — resume tracking active tab
        const url = await getActiveTabUrl();
        await handleDomainSwitch(url);
    }
});

// ── Idle detection ────────────────────────────────────────────────────────────

chrome.idle.setDetectionInterval(60); // 60s idle threshold

chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === 'idle' || state === 'locked') {
        const flushed = await stopTracking();
        if (flushed) await addTime(flushed.domain, flushed.seconds);
    } else if (state === 'active') {
        const url = await getActiveTabUrl();
        await handleDomainSwitch(url);
    }
});

// ── Alarm: periodic flush + limit check ──────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
        // Flush current session — reads from chrome.storage.session (survives SW dormancy)
        const flushed = await flushCurrent();
        if (flushed) await addTime(flushed.domain, flushed.seconds);
        // Check limits
        await checkLimits();
    }

    if (alarm.name === MIDNIGHT_ALARM) {
        await clearDailyNotifications();
        await pruneOldData();
        scheduleMidnightAlarm();
    }
});

// ── Limit checks ──────────────────────────────────────────────────────────────

async function checkLimits() {
    const [todayData, limits, notified] = await Promise.all([
        getTodayData(),
        getLimits(),
        getNotifiedLimits(),
    ]);

    for (const [domain, limitSec] of Object.entries(limits)) {
        const usedSec = todayData[domain] || 0;
        if (usedSec < limitSec) continue;

        const lastNotified = notified[domain] || 0;
        const now = Date.now();
        // Don't re-notify within 30 minutes
        if (now - lastNotified < 30 * 60 * 1000) continue;

        await setNotifiedLimit(domain, now);

        const usedMin = Math.round(usedSec / 60);
        const limitMin = Math.round(limitSec / 60);

        // Show system notification
        chrome.notifications.create(`dw-limit-${domain}`, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title: '⏰ Daily limit reached',
            message: `You've spent ${usedMin} min on ${domain} (limit: ${limitMin} min).`,
            priority: 1,
        });

        // Nudge the content script on the active tab (if it's this domain)
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && getDomain(tab.url) === domain) {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'SHOW_SOFT_BLOCK',
                    domain,
                    limitMinutes: limitMin,
                    usedMinutes: usedMin,
                });
            }
        } catch {
            // Content script may not be present (e.g. chrome:// pages)
        }
    }
}

// ── Message handler (from popup / dashboard) ──────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_ACTIVE_DOMAIN') {
        import('./tracker.js').then(({ getActiveDomain }) => getActiveDomain()).then((domain) => {
            sendResponse({ domain });
        });
        return true; // async response
    }
});
