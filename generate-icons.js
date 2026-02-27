/**
 * generate-icons.js
 * Run with: node generate-icons.js
 * Generates icons/icon16.png, icon32.png, icon48.png, icon128.png
 * Uses only the built-in Canvas API provided by the 'canvas' npm package.
 * If canvas is not available, falls back to creating placeholder PNGs.
 */

const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 128];
const ICONS_DIR = path.join(__dirname, 'icons');

if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

// Try to use the 'canvas' package
let createCanvas;
try {
    ({ createCanvas } = require('canvas'));
} catch {
    createCanvas = null;
}

function drawIcon(size) {
    if (!createCanvas) return null;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const r = size * 0.18; // corner radius

    // Background — deep purple rounded rect
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, r);
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#1a1535');
    bg.addColorStop(1, '#0d0b22');
    ctx.fillStyle = bg;
    ctx.fill();

    // Glow
    const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.5);
    glow.addColorStop(0, 'rgba(124,77,255,0.35)');
    glow.addColorStop(1, 'rgba(124,77,255,0)');
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, r);
    ctx.fillStyle = glow;
    ctx.fill();

    // Leaf shape
    const scale = size / 128;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(scale, scale);

    // Left leaf
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-30, -10, -50, -30, -20, -45);
    ctx.bezierCurveTo(5, -55, 10, -20, 0, 10);
    ctx.fillStyle = 'rgba(200, 185, 255, 0.95)';
    ctx.fill();

    // Right leaf
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(30, -10, 50, -30, 20, -45);
    ctx.bezierCurveTo(-5, -55, -10, -20, 0, 10);
    ctx.fillStyle = 'rgba(220, 210, 255, 0.95)';
    ctx.fill();

    // Stem
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, 35);
    ctx.strokeStyle = 'rgba(180, 160, 255, 0.9)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
    return canvas.toBuffer('image/png');
}

// Slim PNG header fallbacks (1×1 transparent PNGs) if canvas not available
const TINY_PNG = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000000200' +
    '0175e0b50000000049454e44ae426082',
    'hex'
);

SIZES.forEach((size) => {
    const outPath = path.join(ICONS_DIR, `icon${size}.png`);
    const buf = drawIcon(size);
    if (buf) {
        fs.writeFileSync(outPath, buf);
        console.log(`✅ icons/icon${size}.png`);
    } else {
        // Write minimal valid PNG as placeholder
        fs.writeFileSync(outPath, TINY_PNG);
        console.log(`⚠️  icons/icon${size}.png (placeholder — install 'canvas' for real icons)`);
    }
});

console.log('\nDone! Load the extension at chrome://extensions (Developer Mode → Load unpacked).\n');
