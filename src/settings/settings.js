/**
 * settings.js — Digital Wellbeing settings controller
 */

import {
    getLimits, setLimit, clearLimit,
    getIgnoredDomains, addIgnored, removeIgnored,
    exportAllData, clearAllData,
} from '../background/storage.js';

// ── Navigation ─────────────────────────────────────────────────────────────

document.getElementById('btn-open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
});

// ── Domain input helpers ───────────────────────────────────────────────────

function cleanDomain(raw) {
    raw = raw.trim();
    if (!raw) return '';
    try {
        const url = raw.includes('://') ? raw : `https://${raw}`;
        let host = new URL(url).hostname;
        if (host.startsWith('www.')) host = host.slice(4);
        return host;
    } catch {
        return raw;
    }
}

function showHint(elId, msg, type = 'info') {
    const el = document.getElementById(elId);
    el.textContent = msg;
    el.className = `hint ${type}`;
    setTimeout(() => { el.textContent = ''; el.className = 'hint'; }, 3000);
}

function getFaviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// ── Daily Limits ────────────────────────────────────────────────────────────

function formatLimitDisplay(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
}

async function renderLimits() {
    const limits = await getLimits();
    const list = document.getElementById('limits-list');
    const empty = document.getElementById('limits-empty');
    const entries = Object.entries(limits);

    // Remove old items
    list.querySelectorAll('.limit-item').forEach((el) => el.remove());
    empty.style.display = entries.length === 0 ? 'block' : 'none';

    entries.forEach(([domain, seconds]) => {
        const item = document.createElement('div');
        item.className = 'limit-item';
        item.innerHTML = `
      <div class="item-name">
        <img src="${getFaviconUrl(domain)}" onerror="this.style.display='none'" />
        <span>${domain}</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="item-badge">${formatLimitDisplay(seconds)}</span>
        <button class="btn-remove" data-domain="${domain}" title="Remove limit">✕</button>
      </div>
    `;
        list.appendChild(item);
    });

    list.querySelectorAll('.btn-remove[data-domain]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            await clearLimit(btn.dataset.domain);
            await renderLimits();
            showHint('limit-hint', `Limit removed for ${btn.dataset.domain}`, 'success');
        });
    });
}

document.getElementById('btn-add-limit').addEventListener('click', async () => {
    const domain = cleanDomain(document.getElementById('limit-domain').value);
    const h = parseInt(document.getElementById('limit-hours').value || '0', 10);
    const m = parseInt(document.getElementById('limit-minutes').value || '0', 10);
    const totalSec = h * 3600 + m * 60;

    if (!domain) { showHint('limit-hint', 'Please enter a valid domain.', 'error'); return; }
    if (totalSec <= 0) { showHint('limit-hint', 'Please set a time greater than 0.', 'error'); return; }

    await setLimit(domain, totalSec);
    document.getElementById('limit-domain').value = '';
    document.getElementById('limit-hours').value = '';
    document.getElementById('limit-minutes').value = '';
    await renderLimits();
    showHint('limit-hint', `Limit set: ${domain} → ${formatLimitDisplay(totalSec)}`, 'success');
});

// Allow Enter to submit
document.getElementById('limit-domain').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-add-limit').click();
});

// ── Ignored Sites ────────────────────────────────────────────────────────────

const DEFAULT_IGNORED = ['newtab', 'chrome', 'chrome-extension', 'extensions', ''];

async function renderIgnored() {
    const ignored = await getIgnoredDomains();
    const list = document.getElementById('ignored-list');
    const empty = document.getElementById('ignored-empty');

    list.querySelectorAll('.ignore-item').forEach((el) => el.remove());
    const custom = ignored.filter((d) => !DEFAULT_IGNORED.includes(d));
    empty.style.display = custom.length === 0 ? 'block' : 'none';

    custom.forEach((domain) => {
        const item = document.createElement('div');
        item.className = 'ignore-item';
        item.innerHTML = `
      <div class="item-name">
        <img src="${getFaviconUrl(domain)}" onerror="this.style.display='none'" />
        <span>${domain}</span>
      </div>
      <button class="btn-remove" data-domain="${domain}" title="Remove">✕</button>
    `;
        list.appendChild(item);
    });

    list.querySelectorAll('.btn-remove[data-domain]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            await removeIgnored(btn.dataset.domain);
            await renderIgnored();
            showHint('ignore-hint', `${btn.dataset.domain} removed from ignored list`, 'success');
        });
    });
}

document.getElementById('btn-add-ignore').addEventListener('click', async () => {
    const domain = cleanDomain(document.getElementById('ignore-domain').value);
    if (!domain) { showHint('ignore-hint', 'Please enter a valid domain.', 'error'); return; }
    await addIgnored(domain);
    document.getElementById('ignore-domain').value = '';
    await renderIgnored();
    showHint('ignore-hint', `${domain} added to ignored list.`, 'success');
});

document.getElementById('ignore-domain').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-add-ignore').click();
});

// ── Data management ────────────────────────────────────────────────────────

document.getElementById('btn-export').addEventListener('click', async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digital-wellbeing-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showHint('data-hint', 'Data exported successfully!', 'success');
});

document.getElementById('btn-clear').addEventListener('click', async () => {
    const confirmed = window.confirm(
        'Are you sure you want to clear ALL tracked time data? This cannot be undone.\n\n(Your limits and ignored sites will be kept.)'
    );
    if (!confirmed) return;
    await clearAllData();
    showHint('data-hint', 'All time data cleared.', 'success');
});

// ── Init ───────────────────────────────────────────────────────────────────

renderLimits();
renderIgnored();
