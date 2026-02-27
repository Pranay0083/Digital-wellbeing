# Digital Wellbeing for Browser 🌿

A beautiful **Chrome/Edge Manifest V3** browser extension that tracks your daily and weekly time on every website — so you can make more intentional choices about where your attention goes.

## Features

- **Passive time tracking** — automatically records which site is active per session
- **Daily & weekly stats** — see your top sites with time spent, updated every minute
- **Popup quick-view** — Today and This Week tabs with bar charts
- **Full dashboard** — KPI cards, 7-day chart, all-sites table, per-site trend view
- **Daily limits** — set time limits per site; get a system notification when exceeded
- **Soft-block overlay** — a gentle, dismissible reminder shown on the active tab when you hit your limit
- **Ignored sites** — exclude domains you don't want tracked
- **Data export** — download your history as JSON
- **Auto-cleanup** — data older than 30 days is automatically pruned

## Installation (Developer Mode)

1. Clone or download this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `Digital-wellbeing-for-browser` folder
6. The 🌿 icon appears in your toolbar — click it to see your stats!

## Project Structure

```
Digital-wellbeing-for-browser/
├── manifest.json                   ← MV3 config
├── src/
│   ├── background/
│   │   ├── background.js           ← Service worker (time tracking + limits)
│   │   ├── tracker.js              ← Active-tab timing state
│   │   └── storage.js              ← chrome.storage abstraction
│   ├── content/
│   │   └── content.js              ← Soft-block overlay
│   ├── popup/
│   │   ├── popup.html / .css / .js ← Quick stats popup
│   │   └── charts.js               ← Canvas bar charts
│   ├── dashboard/
│   │   └── dashboard.html / .css / .js ← Full analytics page
│   └── settings/
│       └── settings.html / .css / .js  ← Limits + ignored sites
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── generate-icons.js               ← Icon generator script
```

## How Time Tracking Works

1. **`chrome.tabs.onActivated`** — fires when you switch tabs; starts tracking the new domain
2. **`chrome.windows.onFocusChanged`** — pauses tracking when Chrome loses focus
3. **`chrome.idle.onStateChanged`** — pauses when the system goes idle (60s threshold)
4. **1-minute alarm** — every minute, accumulated time is flushed to `chrome.storage.local` and limits are checked

## Data Storage

All data stays **100% local** in `chrome.storage.local`:

| Key | Value |
|-----|-------|
| `day:YYYY-MM-DD` | `{ "domain.com": seconds, ... }` |
| `limits` | `{ "domain.com": seconds, ... }` |
| `ignored` | `["domain.com", ...]` |

Data older than 30 days is automatically removed at midnight.

## Privacy

- **No data is ever transmitted** to any server
- **No analytics or telemetry** of any kind
- All processing happens locally in the extension's service worker
