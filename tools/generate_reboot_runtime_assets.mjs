import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = 'src/client/assets/generated';

const ASSETS = [
  { path: `${OUT}/reboot-unit-atlas.png`, width: 2048, height: 256, cells: 8, kind: 'unit' },
  { path: `${OUT}/reboot-enemy-atlas.png`, width: 1024, height: 256, cells: 4, kind: 'enemy' },
  { path: `${OUT}/reboot-ui-icons.png`, width: 1536, height: 256, cells: 6, kind: 'ui' },
  { path: `${OUT}/reboot-reward-icons.png`, width: 1024, height: 256, cells: 4, kind: 'reward' },
  { path: `${OUT}/reboot-board-accents.png`, width: 1280, height: 256, cells: 5, kind: 'board' }
];

const PALETTES = {
  unit: ['#58d7ff', '#f4c95d', '#8ee6d2', '#ffd166', '#dff9ff', '#90f3ff', '#ffdc73', '#ff8f5a'],
  enemy: ['#ff6f59', '#ff866f', '#b4423a', '#ff3f36'],
  ui: ['#f4c95d', '#58d7ff', '#dff9ff', '#ff6f59', '#ff866f', '#ffd166'],
  reward: ['#ffd166', '#f4c95d', '#58d7ff', '#dff9ff'],
  board: ['#58d7ff', '#dff9ff', '#f4c95d', '#dff9ff', '#ff6f59']
};

function hex(color) {
  const clean = color.replace('#', '');
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16)
  ];
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function setPixel(pixels, width, x, y, rgba) {
  if (x < 0 || y < 0 || x >= width) return;
  const offset = (y * width + x) * 4;
  pixels[offset] = rgba[0];
  pixels[offset + 1] = rgba[1];
  pixels[offset + 2] = rgba[2];
  pixels[offset + 3] = rgba[3];
}

function blendPixel(pixels, width, x, y, color, alpha = 255) {
  setPixel(pixels, width, x, y, [...color, alpha]);
}

function ellipse(pixels, width, cx, cy, rx, ry, color, alpha = 255) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) blendPixel(pixels, width, x, y, color, alpha);
    }
  }
}

function ring(pixels, width, cx, cy, rx, ry, color) {
  ellipse(pixels, width, cx, cy, rx + 6, ry + 6, [8, 12, 13], 255);
  ellipse(pixels, width, cx, cy, rx, ry, color, 255);
  ellipse(pixels, width, cx - rx * 0.18, cy - ry * 0.2, rx * 0.42, ry * 0.35, [245, 240, 220], 95);
}

function rect(pixels, width, x0, y0, w, h, color, alpha = 255) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) blendPixel(pixels, width, x, y, color, alpha);
  }
}

function drawCell(pixels, asset, index) {
  const cell = 256;
  const ox = index * cell;
  const cx = ox + 128;
  const cy = 128;
  const color = hex(PALETTES[asset.kind][index % PALETTES[asset.kind].length]);

  ellipse(pixels, asset.width, cx, cy + 54, 54, 13, [0, 0, 0], 42);

  if (asset.kind === 'unit') {
    ring(pixels, asset.width, cx, cy + 12, 46 + index * 3, 34 + (index % 2) * 5, color);
    rect(pixels, asset.width, cx - 12, cy - 56, 24, 42, color, 220);
    ellipse(pixels, asset.width, cx + 18, cy - 8, 13, 10, [245, 240, 220], 120);
  }

  if (asset.kind === 'enemy') {
    ring(pixels, asset.width, cx, cy + 8, 36 + index * 7, 30 + index * 4, color);
    rect(pixels, asset.width, cx - 8, cy - 42, 16 + index * 4, 30, [20, 24, 24], 245);
    ellipse(pixels, asset.width, cx + 18, cy + 6, 9, 7, [255, 240, 220], 120);
  }

  if (asset.kind === 'ui' || asset.kind === 'reward') {
    ring(pixels, asset.width, cx, cy, 44, 44, color);
    if (index % 3 === 0) rect(pixels, asset.width, cx - 10, cy - 34, 20, 68, [245, 240, 220], 150);
    if (index % 3 === 1) rect(pixels, asset.width, cx - 34, cy - 10, 68, 20, [245, 240, 220], 150);
    if (index % 3 === 2) ellipse(pixels, asset.width, cx, cy, 14, 14, [245, 240, 220], 150);
  }

  if (asset.kind === 'board') {
    rect(pixels, asset.width, ox + 34, 52, 188, 130, [8, 12, 13], 235);
    rect(pixels, asset.width, ox + 42, 60, 172, 114, color, 115);
    ellipse(pixels, asset.width, cx, cy, 42, 24, color, 210);
  }
}

function png(asset) {
  const pixels = Buffer.alloc(asset.width * asset.height * 4);
  for (let index = 0; index < asset.cells; index += 1) drawCell(pixels, asset, index);

  const stride = asset.width * 4;
  const raw = Buffer.alloc((stride + 1) * asset.height);
  for (let y = 0; y < asset.height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.from('89504e470d0a1a0a', 'hex');
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(asset.width, 0);
  ihdr.writeUInt32BE(asset.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

for (const asset of ASSETS) {
  writeFileSync(asset.path, png(asset));
}
