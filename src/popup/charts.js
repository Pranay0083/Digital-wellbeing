/**
 * charts.js — Lightweight canvas chart renderer for the popup
 */

const PALETTE = [
    '#7c4dff', '#e040fb', '#00bcd4', '#ff6b6b', '#69d1a8',
    '#ffd166', '#ef8c8c', '#4fc3f7', '#a5d6a7', '#ffcc80',
];

/** Format seconds as "Xh Ym" or "Ym" or "<1m" */
export function formatSeconds(sec) {
    if (sec < 60) return '<1m';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
}

/** Sort {domain: seconds} object into ranked array */
export function rankDomains(dayData) {
    return Object.entries(dayData)
        .map(([domain, seconds]) => ({ domain, seconds }))
        .sort((a, b) => b.seconds - a.seconds);
}

/**
 * Draw horizontal bar rows for today's top sites.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{domain, seconds}>} ranked  — already sorted
 * @param {number} maxSeconds
 */
export function drawTodayBars(ctx, ranked, maxSeconds) {
    const canvas = ctx.canvas;
    const W = canvas.width;
    const ROW_H = 44;
    const PAD_X = 12;
    const BAR_H = 14;
    const LABEL_W = 140;
    const TIME_W = 50;

    ctx.clearRect(0, 0, W, canvas.height);

    ranked.forEach(({ domain, seconds }, i) => {
        const y = i * ROW_H;
        const color = PALETTE[i % PALETTE.length];
        const barMaxW = W - PAD_X * 2 - LABEL_W - TIME_W;
        const barW = maxSeconds > 0 ? Math.max(2, Math.round((seconds / maxSeconds) * barMaxW)) : 2;
        const barX = PAD_X + LABEL_W;
        const barY = y + (ROW_H - BAR_H) / 2;

        // Background row
        if (i % 2 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.025)';
            ctx.fillRect(0, y, W, ROW_H);
        }

        // Domain label
        ctx.fillStyle = '#c8bfe8';
        ctx.font = '13px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const label = domain.length > 20 ? domain.slice(0, 18) + '…' : domain;
        ctx.fillText(label, PAD_X, barY + BAR_H / 2);

        // Bar
        const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '88');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, BAR_H, 4);
        ctx.fill();

        // Time label
        ctx.fillStyle = '#8a7ab5';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(formatSeconds(seconds), W - PAD_X, barY + BAR_H / 2);
    });
}

/**
 * Draw 7-day column chart.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{date, data}>} weekData  — 7 items, oldest first
 */
export function drawWeekChart(ctx, weekData) {
    const canvas = ctx.canvas;
    const W = canvas.width;
    const H = canvas.height;
    const PAD_X = 16;
    const PAD_TOP = 12;
    const PAD_BOTTOM = 28;
    const CHART_W = W - PAD_X * 2;
    const CHART_H = H - PAD_TOP - PAD_BOTTOM;
    const N = weekData.length;
    const COL_W = CHART_W / N;
    const BAR_W = Math.max(8, COL_W * 0.55);

    ctx.clearRect(0, 0, W, H);

    // Compute max total per day
    const totals = weekData.map((d) => Object.values(d.data).reduce((a, b) => a + b, 0));
    const maxTotal = Math.max(...totals, 1);

    const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    weekData.forEach(({ date, data }, i) => {
        const total = totals[i];
        const barH = Math.max(total > 0 ? 4 : 0, Math.round((total / maxTotal) * CHART_H));
        const x = PAD_X + i * COL_W + (COL_W - BAR_W) / 2;
        const y = PAD_TOP + CHART_H - barH;

        // Bar background
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.beginPath();
        ctx.roundRect(x, PAD_TOP, BAR_W, CHART_H, 4);
        ctx.fill();

        // Filled bar
        if (barH > 0) {
            const isToday = i === N - 1;
            const grad = ctx.createLinearGradient(0, y, 0, y + barH);
            grad.addColorStop(0, isToday ? '#a07af5' : '#5a3db5');
            grad.addColorStop(1, isToday ? '#7c4dff' : '#3d2a7f');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, BAR_W, barH, 4);
            ctx.fill();
        }

        // Day label
        const dayOfWeek = new Date(date + 'T00:00:00').getDay();
        const label = DAY_LABELS[dayOfWeek];
        ctx.fillStyle = i === N - 1 ? '#a78bfa' : '#6a5f8a';
        ctx.font = `${i === N - 1 ? '600' : '400'} 11px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x + BAR_W / 2, PAD_TOP + CHART_H + 6);

        // Hover tooltip info stored on canvas dataset
        if (total > 0) {
            ctx.fillStyle = '#9d8fc7';
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(formatSeconds(total), x + BAR_W / 2, y - 3);
        }
    });
}
