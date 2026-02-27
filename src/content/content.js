/**
 * content.js — Digital Wellbeing soft-block overlay
 *
 * Listens for SHOW_SOFT_BLOCK messages from the background service worker
 * and renders a full-screen overlay reminding the user they've hit their limit.
 * The user can dismiss it (won't re-appear for 30 min, controlled by background).
 */

(function () {
    'use strict';

    let overlayEl = null;

    function formatTime(minutes) {
        if (minutes < 60) return `${minutes} min`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    const MESSAGES = [
        "Your attention is valuable. Use it wisely.",
        "Time is the one resource you can't earn back.",
        "A mindful break can reset your focus.",
        "Step away, breathe, come back refreshed.",
        "Real life awaits beyond the screen.",
    ];

    function randomMessage() {
        return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    }

    function showOverlay({ domain, limitMinutes, usedMinutes }) {
        if (overlayEl) return; // already showing

        overlayEl = document.createElement('div');
        overlayEl.id = 'dw-soft-block';
        overlayEl.innerHTML = `
      <div class="dw-card">
        <div class="dw-icon">⏰</div>
        <h1 class="dw-title">Time's up on <span class="dw-domain">${domain}</span></h1>
        <p class="dw-stats">
          You've spent <strong>${formatTime(usedMinutes)}</strong> here today
          — your limit is <strong>${formatTime(limitMinutes)}</strong>.
        </p>
        <p class="dw-quote">${randomMessage()}</p>
        <div class="dw-actions">
          <button class="dw-btn dw-btn-primary" id="dw-take-break">Take a break</button>
          <button class="dw-btn dw-btn-ghost" id="dw-continue">Continue anyway</button>
        </div>
        <p class="dw-note">Dismissing won't re-show this for 30 minutes.</p>
      </div>
    `;

        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
      #dw-soft-block {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 8, 24, 0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: dw-fadeIn 0.35s ease;
      }
      @keyframes dw-fadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to   { opacity: 1; transform: scale(1); }
      }
      .dw-card {
        background: linear-gradient(145deg, #1a1535, #12102a);
        border: 1px solid rgba(124, 77, 255, 0.3);
        border-radius: 24px;
        padding: 48px 40px;
        max-width: 460px;
        width: calc(100vw - 48px);
        text-align: center;
        box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
      }
      .dw-icon {
        font-size: 56px;
        margin-bottom: 16px;
        line-height: 1;
      }
      .dw-title {
        font-size: 22px;
        font-weight: 700;
        color: #e8e0ff;
        margin: 0 0 12px;
        line-height: 1.3;
      }
      .dw-domain {
        color: #a78bfa;
      }
      .dw-stats {
        font-size: 15px;
        color: #b0a8cc;
        margin: 0 0 20px;
        line-height: 1.6;
      }
      .dw-stats strong {
        color: #d4bbff;
        font-weight: 600;
      }
      .dw-quote {
        font-size: 14px;
        color: #7c6fa0;
        font-style: italic;
        margin: 0 0 28px;
        padding: 12px 16px;
        background: rgba(124,77,255,0.08);
        border-radius: 10px;
      }
      .dw-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .dw-btn {
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .dw-btn:hover { transform: translateY(-1px); }
      .dw-btn-primary {
        background: linear-gradient(135deg, #7c4dff, #a07af5);
        color: #fff;
        box-shadow: 0 4px 20px rgba(124,77,255,0.4);
      }
      .dw-btn-primary:hover { box-shadow: 0 6px 28px rgba(124,77,255,0.55); }
      .dw-btn-ghost {
        background: rgba(255,255,255,0.06);
        color: #a09ab8;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .dw-note {
        font-size: 11px;
        color: #4a4266;
        margin: 0;
      }
    `;
        document.head.appendChild(style);
        document.body.appendChild(overlayEl);

        // Take a break → go to new tab
        document.getElementById('dw-take-break').addEventListener('click', () => {
            window.location.href = 'chrome://newtab';
        });

        // Continue anyway → close overlay
        document.getElementById('dw-continue').addEventListener('click', () => {
            if (overlayEl) {
                overlayEl.remove();
                overlayEl = null;
            }
        });
    }

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'SHOW_SOFT_BLOCK') {
            showOverlay(message);
        }
    });
})();
