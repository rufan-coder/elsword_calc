// 아주 작은 PNG 읽개 (Node 전용, 개발 도구용). 8비트 RGB/RGBA/회색, 인터레이스 없는 PNG만 읽는다.
// 반환: { width, height, data } - data 는 RGBA (canvas 의 ImageData 와 같은 모양)

import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

export function readPng(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`PNG가 아님: ${path}`);
  let pos = 8, width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString("latin1", pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === "IHDR") { width = body.readUInt32BE(0); height = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12]; }
    else if (kind === "IDAT") idat.push(body);
    else if (kind === "IEND") break;
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[type];
  if (depth !== 8 || !channels || interlace) throw new Error(`지원하지 않는 PNG 형식: ${path}`);
  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels, px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? px[y * stride + x - channels] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= channels && y ? px[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a; else if (filter === 2) v += b; else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + x] = v & 255;
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels, d = i * 4;
    if (channels >= 3) { data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; data[d + 3] = channels === 4 ? px[s + 3] : 255; }
    else { data[d] = data[d + 1] = data[d + 2] = px[s]; data[d + 3] = channels === 2 ? px[s + 1] : 255; }
  }
  return { width, height, data };
}
