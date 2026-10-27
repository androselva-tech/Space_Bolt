/**
 * App icon and splash images from the artwork in assets/:
 *   app_icon1.png   (the gold coin, drawn by make-art.mjs) → icon.png (store / iOS: the coin on navy), adaptive-icon.png
 *                     (Android foreground: the coin on transparent, inset so the system's mask never
 *                     clips it), favicon.png
 *   src/brand.json  ← the navy and the logo's shape, used by the splash screens
 *   splash_icon.png (the logo on transparent: coin, SPACEBOLT, "answer it · fly it")
 *                   → splash-logo.png (trimmed; shown on the in-app splash, App.tsx)
 *                   → splash-native.png (the coin alone, for the system splash: Android 12+ shows
 *                     only an icon, cropped to a circle)
 *
 *   cd tools && node make-icons.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
/** The brand navy: icon background, both splash screens, the Android adaptive-icon background. */
const NAVY = '#0f2445';
const NAVY_RGB = { r: 0x0f, g: 0x24, b: 0x45 };

/** An image cut to its visible pixels (transparent margins removed). */
async function trimmed(file) {
  return sharp(file).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 }).png().toBuffer();
}
/** Scaled to fit a size x size square, centred on transparent. */
const fit = (img, size) => sharp(img).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' }).png().toBuffer();

/** Rows/columns holding visible pixels (alpha above a threshold). */
async function alphaProfile(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows = new Array(info.height).fill(0), cols = new Array(info.width).fill(0);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 24) { rows[y]++; cols[x]++; }
    }
  }
  return { rows, cols, info };
}
const span = (arr, from = 0, to = arr.length) => {
  let a = -1, b = -1;
  for (let i = from; i < to; i++) if (arr[i]) { if (a < 0) a = i; b = i; }
  return [a, b];
};

async function main() {
  // --- the icon: the coin (on transparent, or on its own background) placed on the brand navy ---
  const iconSrc = join(ASSETS, 'app_icon1.png');
  const coinIcon = await trimmed(iconSrc);
  const onNavy = async (size, coinSize) =>
    sharp({ create: { width: size, height: size, channels: 4, background: { ...NAVY_RGB, alpha: 1 } } })
      .composite([{ input: await fit(coinIcon, coinSize), gravity: 'center' }]);
  await (await onNavy(1024, 860)).png().toFile(join(ASSETS, 'icon.png'));
  // Android: the coin on a transparent layer, over a navy background (app.json adaptiveIcon); the
  // system shows the middle ~2/3 through its mask, so the coin is inset to stay whole
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await fit(coinIcon, 640), gravity: 'center' }]).png().toFile(join(ASSETS, 'adaptive-icon.png'));
  await (await onNavy(48, 42)).png().toFile(join(ASSETS, 'favicon.png'));

  // --- the splash logo ---
  const logoSrc = join(ASSETS, 'splash_icon.png');
  const { rows, cols, info } = await alphaProfile(logoSrc);
  const [top, bottom] = span(rows);
  const [left, right] = span(cols);
  await sharp(logoSrc).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({ width: 900, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(join(ASSETS, 'splash-logo.png'));
  // the coin alone: the first block of rows, down to the first empty band
  let coinBottom = top;
  while (coinBottom < info.height && rows[coinBottom]) coinBottom++;
  const coinRows = await sharp(logoSrc).extract({ left: 0, top, width: info.width, height: coinBottom - top }).png().toBuffer();
  const coinProfile = await alphaProfile(coinRows);
  const [x0, x1] = span(coinProfile.cols);
  const coin = await sharp(coinRows).extract({ left: x0, top: 0, width: x1 - x0 + 1, height: coinBottom - top }).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(coin).resize(620, 620, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), gravity: 'center' }])
    .png().toFile(join(ASSETS, 'splash-native.png'));

  const logoAspect = +((right - left + 1) / (bottom - top + 1)).toFixed(4);
  writeFileSync(join(ASSETS, '..', 'src', 'brand.json'), JSON.stringify({ splashBackground: NAVY, logoAspect }, null, 2) + '\n');
  console.log('logo', right - left + 1, 'x', bottom - top + 1, '• coin rows', top, '-', coinBottom);
}

main();
