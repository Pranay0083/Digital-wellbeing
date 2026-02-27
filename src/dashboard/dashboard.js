/**
 * dashboard.js — Full-page dashboard controller
 */

import { getTodayData, getWeekData, getLimits } from '../background/storage.js';
import { formatSeconds, rankDomains, drawWeekChart } from '../popup/charts.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function getFaviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function formatPct(part, total) {
    if (total === 0) return '0%';
    return `${Math.min(100, Math.round((part / total) * 100))}%`;
}

// ── Sidebar navigation ────────────────────────────────────────────────────

const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item[data-view]');

navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.dataset.view;
        views.forEach((v) => v.classList.remove('active'));
        navItems.forEach((n) => n.classList.remove('active'));
        item.classList.add('active');
        document.getElementById(`view-${target}`).classList.add('active');
    });
});

document.getElementById('nav-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// ── Overview ───────────────────────────────────────────────────────────────

async function renderOverview() {
    const [todayData, weekData, limits] = await Promise.all([
        getTodayData(),
        getWeekData(),
        getLimits(),
    ]);

    // Date label
    document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const todayRanked = rankDomains(todayData);
    const todayTotal = todayRanked.reduce((s, d) => s + d.seconds, 0);

    const totals = weekData.map((d) => Object.values(d.data).reduce((a, b) => a + b, 0));
    const weekTotal = totals.reduce((a, b) => a + b, 0);
    const activeDays = totals.filter((t) => t > 0).length;
    const dailyAvg = activeDays > 0 ? Math.round(weekTotal / activeDays) : 0;

    document.getElementById('kpi-today').textContent = formatSeconds(todayTotal);
    document.getElementById('kpi-week').textContent = formatSeconds(weekTotal);
    document.getElementById('kpi-top-site').textContent = todayRanked[0]?.domain ?? '—';
    document.getElementById('kpi-avg').textContent = formatSeconds(dailyAvg);

    // Weekly chart
    const canvasWeek = document.getElementById('canvas-overview-week');
    canvasWeek.width = canvasWeek.parentElement.clientWidth;
    const ctxWeek = canvasWeek.getContext('2d');
    drawWeekChart(ctxWeek, weekData);

    // Today table
    const tbody = document.getElementById('today-table-body');
    const empty = document.getElementById('empty-overview');

    if (todayRanked.length === 0) {
        document.getElementById('today-table').style.display = 'none';
        empty.style.display = 'flex';
        return;
    }

    document.getElementById('today-table').style.display = 'table';
    empty.style.display = 'none';

    todayRanked.forEach(({ domain, seconds }) => {
        const limit = limits[domain];
        const pct = formatPct(seconds, todayTotal);
        const exceeded = limit && seconds > limit;
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>
        <div class="site-cell">
          <img class="site-favicon" src="${getFaviconUrl(domain)}" onerror="this.style.display='none'" />
          <span class="site-name">${domain}</span>
        </div>
      </td>
      <td><span class="time-pill">${formatSeconds(seconds)}</span></td>
      <td>
        <div class="bar-cell">
          <div class="bar-track"><div class="bar-fill" style="width:${pct}"></div></div>
        </div>
        <span style="font-size:11px;color:var(--text-muted);margin-left:6px">${pct}</span>
      </td>
      <td>
        ${limit
                ? `<span class="limit-badge ${exceeded ? 'limit-exceeded' : ''}">${formatSeconds(limit)}</span>`
                : '<span style="color:var(--text-dimmed);font-size:12px">—</span>'
            }
      </td>
    `;
        tbody.appendChild(tr);
    });
}

// ── Sites view ────────────────────────────────────────────────────────────

async function renderSites() {
    const [weekData, limits] = await Promise.all([getWeekData(), getLimits()]);
    const todayData = weekData[weekData.length - 1]?.data || {};

    // Aggregate weekly
    const weekAgg = {};
    weekData.forEach(({ data }) => {
        for (const [d, s] of Object.entries(data)) {
            weekAgg[d] = (weekAgg[d] || 0) + s;
        }
    });

    const activeDays = weekData.filter((d) => Object.keys(d.data).length > 0).length || 1;
    let allSites = rankDomains(weekAgg);

    const tbody = document.getElementById('sites-table-body');
    const select = document.getElementById('trends-site-select');

    function buildSitesRows(sites) {
        tbody.innerHTML = '';
        sites.forEach(({ domain, seconds: weekSec }) => {
            const todaySec = todayData[domain] || 0;
            const avg = Math.round(weekSec / activeDays);
            const limit = limits[domain];
            const exceeded = limit && todaySec > limit;
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>
          <div class="site-cell">
            <img class="site-favicon" src="${getFaviconUrl(domain)}" onerror="this.style.display='none'" />
            <span class="site-name">${domain}</span>
          </div>
        </td>
        <td><span class="time-pill">${formatSeconds(weekSec)}</span></td>
        <td>${formatSeconds(todaySec)}</td>
        <td>${formatSeconds(avg)}</td>
      `;
            tbody.appendChild(tr);
        });
    }

    buildSitesRows(allSites);

    // Populate site selector for trends
    select.innerHTML = '<option value="">— Select a site —</option>';
    allSites.forEach(({ domain }) => {
        const opt = document.createElement('option');
        opt.value = domain;
        opt.textContent = domain;
        select.appendChild(opt);
    });

    // Search
    document.getElementById('sites-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = allSites.filter((s) => s.domain.includes(q));
        buildSitesRows(filtered);
    });

    // Sortable columns
    document.querySelectorAll('.site-table th.sortable').forEach((th) => {
        th.addEventListener('click', () => {
            document.querySelectorAll('.site-table th').forEach((t) => t.classList.remove('active'));
            th.classList.add('active');
            const col = th.dataset.col;
            if (col === 'week') allSites = rankDomains(weekAgg);
            else allSites = rankDomains(todayData).concat(
                Object.keys(weekAgg).filter((d) => !todayData[d]).map((d) => ({ domain: d, seconds: 0 }))
            );
            buildSitesRows(allSites);
        });
    });
}

// ── Trends view ────────────────────────────────────────────────────────────

async function renderTrends() {
    const weekData = await getWeekData();

    document.getElementById('trends-site-select').addEventListener('change', (e) => {
        const domain = e.target.value;
        const card = document.getElementById('trends-chart-card');
        if (!domain) { card.style.display = 'none'; return; }

        card.style.display = 'block';
        document.getElementById('trends-chart-title').textContent = `${domain} — 7-day activity`;

        const perDay = weekData.map((d) => ({ date: d.date, seconds: d.data[domain] || 0 }));
        const totalSec = perDay.reduce((a, b) => a + b.seconds, 0);
        const activeDays = perDay.filter((d) => d.seconds > 0).length;
        const avg = activeDays > 0 ? Math.round(totalSec / activeDays) : 0;
        const maxDay = perDay.reduce((m, d) => d.seconds > m.seconds ? d : m, { seconds: 0 });

        // Draw per-site weekly chart
        const singleSiteWeek = perDay.map((d) => ({
            date: d.date,
            data: d.seconds > 0 ? { [domain]: d.seconds } : {},
        }));
        const canvas = document.getElementById('canvas-trends');
        canvas.width = canvas.parentElement.clientWidth;
        drawWeekChart(canvas.getContext('2d'), singleSiteWeek);

        // Stats row
        document.getElementById('trends-stats').innerHTML = `
      <div class="trend-stat">Total: <strong>${formatSeconds(totalSec)}</strong></div>
      <div class="trend-stat">Daily avg: <strong>${formatSeconds(avg)}</strong></div>
      <div class="trend-stat">Peak day: <strong>${maxDay.date || '—'}</strong> (${formatSeconds(maxDay.seconds)})</div>
      <div class="trend-stat">Active days: <strong>${activeDays}</strong></div>
    `;
    });
}

// ── Init ──────────────────────────────────────────────────────────────────

(async () => {
    await Promise.all([renderOverview(), renderSites(), renderTrends()]);
})();
