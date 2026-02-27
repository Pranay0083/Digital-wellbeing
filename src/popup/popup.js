/**
 * popup.js — Digital Wellbeing popup controller
 */

import { getTodayData, getWeekData } from '../background/storage.js';
import { formatSeconds, rankDomains, drawTodayBars, drawWeekChart } from './charts.js';

// ── Tab switching ─────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
});

// ── Navigation buttons ────────────────────────────────────────────────────────

document.getElementById('btn-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
});

document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

document.getElementById('btn-full-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
});

// ── Render today panel ────────────────────────────────────────────────────────

async function renderToday() {
    const data = await getTodayData();
    const ranked = rankDomains(data);
    const totalSec = ranked.reduce((s, d) => s + d.seconds, 0);

    document.getElementById('total-today').textContent = formatSeconds(totalSec);
    document.getElementById('top-site-today').textContent = ranked[0]?.domain ?? '—';

    const canvasEl = document.getElementById('canvas-today');
    const emptyEl = document.getElementById('empty-today');

    if (ranked.length === 0) {
        canvasEl.style.display = 'none';
        canvasEl.closest('.canvas-wrap').style.display = 'none';
        emptyEl.classList.add('visible');
        return;
    }

    emptyEl.classList.remove('visible');
    const top = ranked.slice(0, 5);
    canvasEl.height = top.length * 44;
    const ctx = canvasEl.getContext('2d');
    const maxSec = top[0]?.seconds ?? 1;
    drawTodayBars(ctx, top, maxSec);
}

// ── Render week panel ─────────────────────────────────────────────────────────

async function renderWeek() {
    const weekData = await getWeekData();

    const totals = weekData.map((d) => Object.values(d.data).reduce((a, b) => a + b, 0));
    const weekTotal = totals.reduce((a, b) => a + b, 0);
    const activeDays = totals.filter((t) => t > 0).length;
    const dailyAvg = activeDays > 0 ? Math.round(weekTotal / activeDays) : 0;

    document.getElementById('total-week').textContent = formatSeconds(weekTotal);
    document.getElementById('daily-avg').textContent = formatSeconds(dailyAvg);

    // Weekly bar chart
    const ctxWeek = document.getElementById('canvas-week').getContext('2d');
    drawWeekChart(ctxWeek, weekData);

    // Top sites this week aggregate
    const siteAgg = {};
    weekData.forEach(({ data }) => {
        for (const [domain, sec] of Object.entries(data)) {
            siteAgg[domain] = (siteAgg[domain] || 0) + sec;
        }
    });
    const rankedWeek = rankDomains(siteAgg).slice(0, 5);

    const ctxSites = document.getElementById('canvas-week-sites').getContext('2d');
    const canvasSites = document.getElementById('canvas-week-sites');
    canvasSites.height = Math.max(44, rankedWeek.length * 44);
    const maxSec = rankedWeek[0]?.seconds ?? 1;
    drawTodayBars(ctxSites, rankedWeek, maxSec);
}

// ── Init ──────────────────────────────────────────────────────────────────────

renderToday();
renderWeek();
