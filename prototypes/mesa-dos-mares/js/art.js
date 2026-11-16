// PROTOTYPE - NOT FOR PRODUCTION
// Question: O ciclo navegar → atracar → jogar pelo chat da ilha → zarpar funciona como mesa de RPG, e o chat é gostoso de usar para interpretar?
// Date: 2026-11-16
// Tudo desenhado em código: bustos dos tokens, mapas de pergaminho, rosa dos ventos, dado d20.
'use strict';

const INK = '#2b2118', SEPIA = '#7a5a34', PARCH = '#ead9b0', PARCH2 = '#f3e6c4';
const RED = '#b3261e', NAVY = '#1f4f9a';
// PRNG local para arte determinística (não mexe no rng() do jogo).
function artRng(s) { let a = s | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const SKINS = ['#f1c9a0', '#e0ac7e', '#c68a5a', '#9c6b43', '#7a4f2e', '#f6d7b8'];
const HAIRS = ['#2b1d12', '#5a3a1c', '#a0522d', '#d8b04a', '#1d1d1d', '#b03a2e', '#e8e0d0', '#3f6a3a'];

// ---- Busto: corpo e cabeça (recortados no círculo) ----
function drawBust(g, cx, cy, r, kind, seed) {
  const R = artRng(seed * 97 + 13), skin = SKINS[Math.floor(R() * SKINS.length)], hair = HAIRS[Math.floor(R() * HAIRS.length)];
  const coat = {
    pirata: '#7b2a1f', marinha: '#f4f4f0', aldeao: '#8a7350', bandido: '#4b3b2e', marujo: '#f4f4f0',
    oficial: '#ffffff', cozinha: '#f7f3ea', rival: '#3a2a3e',
  }[kind] || '#777';
  // fundo
  const bg = g.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
  bg.addColorStop(0, '#f5e7c6'); bg.addColorStop(1, { pirata: '#c98a6a', marinha: '#9db5d6', marujo: '#9db5d6', oficial: '#8aa5cc', rival: '#b48aa0' }[kind] || '#cdb68a');
  g.fillStyle = bg; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  // ombros
  g.fillStyle = coat; g.strokeStyle = INK; g.lineWidth = r * 0.05;
  g.beginPath(); g.ellipse(cx, cy + r * 0.95, r * 0.88, r * 0.55, 0, Math.PI, 0); g.lineTo(cx + r, cy + r * 1.2); g.lineTo(cx - r, cy + r * 1.2); g.closePath(); g.fill(); g.stroke();
  // detalhes da roupa
  if (kind === 'marinha' || kind === 'marujo') { // gola azul de marinheiro
    g.fillStyle = NAVY; g.beginPath(); g.moveTo(cx - r * 0.45, cy + r * 0.48); g.lineTo(cx, cy + r * 0.85); g.lineTo(cx + r * 0.45, cy + r * 0.48); g.lineTo(cx + r * 0.3, cy + r * 0.45); g.lineTo(cx, cy + r * 0.66); g.lineTo(cx - r * 0.3, cy + r * 0.45); g.closePath(); g.fill();
  }
  if (kind === 'oficial') { // casaco com dragonas
    g.fillStyle = '#d8b04a'; g.fillRect(cx - r * 0.85, cy + r * 0.5, r * 0.3, r * 0.1); g.fillRect(cx + r * 0.55, cy + r * 0.5, r * 0.3, r * 0.1);
    g.strokeStyle = NAVY; g.lineWidth = r * 0.06; g.beginPath(); g.moveTo(cx, cy + r * 0.55); g.lineTo(cx, cy + r); g.stroke();
  }
  if (kind === 'pirata' || kind === 'rival') { // camisa aberta / colete
    g.fillStyle = '#efe3c8'; g.beginPath(); g.moveTo(cx - r * 0.2, cy + r * 0.5); g.lineTo(cx, cy + r * 0.95); g.lineTo(cx + r * 0.2, cy + r * 0.5); g.closePath(); g.fill();
  }
  if (kind === 'cozinha') { // lenço no pescoço
    g.fillStyle = '#b3261e'; g.beginPath(); g.moveTo(cx - r * 0.25, cy + r * 0.48); g.lineTo(cx, cy + r * 0.72); g.lineTo(cx + r * 0.25, cy + r * 0.48); g.closePath(); g.fill();
  }
  // pescoço e cabeça
  g.fillStyle = skin; g.strokeStyle = INK; g.lineWidth = r * 0.045;
  g.fillRect(cx - r * 0.13, cy + r * 0.25, r * 0.26, r * 0.25);
  g.beginPath(); g.ellipse(cx, cy - r * 0.02, r * 0.36, r * 0.42, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // cabelo (atrás/lados)
  g.fillStyle = hair; g.beginPath();
  const spiky = kind === 'bandido' || kind === 'pirata' || R() > 0.6;
  g.moveTo(cx - r * 0.38, cy - r * 0.02);
  if (spiky) { for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * Math.PI; const rr = i % 2 ? r * 0.5 : r * 0.42; g.lineTo(cx + Math.cos(a) * rr, cy - r * 0.08 + Math.sin(a) * rr); } }
  else g.ellipse(cx, cy - r * 0.12, r * 0.39, r * 0.36, 0, Math.PI, 0);
  g.lineTo(cx + r * 0.38, cy - r * 0.02); g.quadraticCurveTo(cx, cy - r * 0.25, cx - r * 0.38, cy - r * 0.02); g.fill();
  // rosto
  g.fillStyle = INK;
  g.beginPath(); g.ellipse(cx - r * 0.13, cy + r * 0.02, r * 0.035, r * 0.055, 0, 0, Math.PI * 2); g.fill();
  if (kind === 'bandido') { // tapa-olho
    g.fillRect(cx + r * 0.05, cy - 0.02 * r, r * 0.18, r * 0.12);
    g.lineWidth = r * 0.025; g.beginPath(); g.moveTo(cx - r * 0.36, cy - r * 0.15); g.lineTo(cx + r * 0.36, cy + r * 0.06); g.stroke();
  } else { g.beginPath(); g.ellipse(cx + r * 0.13, cy + r * 0.02, r * 0.035, r * 0.055, 0, 0, Math.PI * 2); g.fill(); }
  g.lineWidth = r * 0.03; g.beginPath();
  if (kind === 'rival' || kind === 'bandido') { g.moveTo(cx - r * 0.12, cy + r * 0.24); g.lineTo(cx + r * 0.12, cy + r * 0.2); }
  else g.arc(cx, cy + r * 0.15, r * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
  g.stroke();
  if (kind === 'bandido' || kind === 'rival') { g.fillStyle = 'rgba(43,33,24,.35)'; g.beginPath(); g.ellipse(cx, cy + r * 0.27, r * 0.24, r * 0.12, 0, 0, Math.PI); g.fill(); }
}

// ---- Chapéus: desenhados por cima, saindo do círculo (silhueta própria de cada tipo) ----
function drawHat(g, cx, cy, r, kind) {
  g.strokeStyle = INK; g.lineWidth = r * 0.06; g.lineJoin = 'round';
  const top = cy - r * 0.38;
  if (kind === 'pirata') { // bandana vermelha com nó
    g.fillStyle = RED; g.beginPath(); g.ellipse(cx, top + r * 0.05, r * 0.42, r * 0.2, 0, Math.PI, 0); g.lineTo(cx - r * 0.42, top + r * 0.08); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx + r * 0.38, top + r * 0.05); g.lineTo(cx + r * 0.78, top - r * 0.12); g.lineTo(cx + r * 0.7, top + r * 0.12); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx + r * 0.38, top + r * 0.08); g.lineTo(cx + r * 0.75, top + r * 0.32); g.lineTo(cx + r * 0.6, top + r * 0.36); g.closePath(); g.fill(); g.stroke();
  } else if (kind === 'marinha' || kind === 'marujo') { // quepe branco de marinheiro com faixa azul
    g.fillStyle = '#fbfbf7'; g.beginPath(); g.ellipse(cx, top - r * 0.05, r * 0.5, r * 0.2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.rect(cx - r * 0.36, top - r * 0.08, r * 0.72, r * 0.18); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.fillRect(cx - r * 0.35, top + r * 0.02, r * 0.7, r * 0.07);
    if (kind === 'marujo') { g.fillStyle = NAVY; g.beginPath(); g.moveTo(cx - r * 0.55, top - r * 0.1); g.lineTo(cx - r * 0.75, top + r * 0.1); g.lineTo(cx - r * 0.5, top + r * 0.02); g.fill(); }
  } else if (kind === 'oficial') { // boné de oficial com aba e insígnia
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx - r * 0.55, top); g.quadraticCurveTo(cx, top - r * 0.55, cx + r * 0.55, top); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.moveTo(cx - r * 0.48, top); g.lineTo(cx + r * 0.48, top); g.lineTo(cx + r * 0.38, top + r * 0.14); g.lineTo(cx - r * 0.38, top + r * 0.14); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#d8b04a'; g.beginPath(); g.arc(cx, top - r * 0.16, r * 0.08, 0, Math.PI * 2); g.fill();
  } else if (kind === 'cozinha') { // chapéu de chef alto
    g.fillStyle = '#fffdf6'; g.beginPath();
    g.moveTo(cx - r * 0.32, top + r * 0.08); g.lineTo(cx - r * 0.34, top - r * 0.35);
    g.arc(cx - r * 0.2, top - r * 0.5, r * 0.2, Math.PI * 0.9, Math.PI * 1.8); g.arc(cx + r * 0.05, top - r * 0.62, r * 0.22, Math.PI * 1.1, Math.PI * 1.9);
    g.arc(cx + r * 0.25, top - r * 0.45, r * 0.18, Math.PI * 1.3, Math.PI * 0.2); g.lineTo(cx + r * 0.32, top + r * 0.08); g.closePath(); g.fill(); g.stroke();
  } else if (kind === 'rival') { // tricórnio com caveira
    g.fillStyle = '#1e1a22'; g.beginPath(); g.moveTo(cx - r * 0.8, top + r * 0.02); g.quadraticCurveTo(cx - r * 0.3, top - r * 0.2, cx, top - r * 0.42); g.quadraticCurveTo(cx + r * 0.3, top - r * 0.2, cx + r * 0.8, top + r * 0.02); g.quadraticCurveTo(cx, top - r * 0.05, cx - r * 0.8, top + r * 0.02); g.fill(); g.stroke();
    g.fillStyle = '#f0ead8'; g.beginPath(); g.arc(cx, top - r * 0.17, r * 0.08, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f0ead8'; g.lineWidth = r * 0.03; g.beginPath(); g.moveTo(cx - r * 0.12, top - r * 0.05); g.lineTo(cx + r * 0.12, top - r * 0.01); g.moveTo(cx + r * 0.12, top - r * 0.05); g.lineTo(cx - r * 0.12, top - r * 0.01); g.stroke();
  } else if (kind === 'aldeao') { // boina achatada
    g.fillStyle = '#6b5434'; g.beginPath(); g.ellipse(cx + r * 0.05, top, r * 0.48, r * 0.17, -0.12, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(cx + r * 0.28, top + r * 0.08, r * 0.24, r * 0.06, 0, 0, Math.PI); g.fill(); g.stroke();
  } else if (kind === 'bandido') { // cabelo espetado já faz a silhueta; adiciona uma faca atrás do ombro
    g.fillStyle = '#c9c9c9'; g.beginPath(); g.moveTo(cx + r * 0.6, cy + r * 0.2); g.lineTo(cx + r * 0.95, cy - r * 0.55); g.lineTo(cx + r * 0.72, cy + r * 0.25); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#5a3a1c'; g.fillRect(cx + r * 0.55, cy + r * 0.2, r * 0.18, r * 0.2);
  }
}

// ---- Imagens enviadas ----
const imgCache = {};
function imgOf(src) {
  if (!src) return null;
  let im = imgCache[src];
  if (!im) { im = new Image(); im.onload = () => { dirty.tokens = true; }; im.src = src; imgCache[src] = im; }
  return im.complete && im.naturalWidth ? im : null;
}
// Recorte quadrado central → WebP pequeno (data URL). Stand-in do upload para o Storage.
function processUpload(file, size, cb) {
  if (!file || !/^image\//.test(file.type)) { toast('Escolha um arquivo de imagem.'); return; }
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const s = Math.min(im.width, im.height), g = c.getContext('2d');
      g.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, size, size);
      let url = c.toDataURL('image/webp', 0.85); if (!/^data:image\/webp/.test(url)) url = c.toDataURL('image/jpeg', 0.85);
      cb(url);
    };
    im.onerror = () => toast('Não consegui abrir essa imagem.');
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}

// Tipo visual de um token ou personagem.
function kindOf(t) {
  if (t.kind) return t.kind;
  const c = db.chars[t.owner]; return c && c.faccao === 'marinha' ? 'marinha' : 'pirata';
}
function ringOf(t) {
  if (t.kind === 'marinha') return NAVY;
  if (t.kind === 'pirata') return RED;
  if (t.owner === 'gm') return (NPC_KINDS[t.kind] || {}).cor || SEPIA;
  const c = db.chars[t.owner]; return c && c.faccao === 'marinha' ? NAVY : RED;
}

// Retrato redondo (chat, ficha, lista): desenha num canvas e devolve data URL (cache).
const portraitCache = {};
function portraitURL(c) {
  if (c && c.img) return c.img;
  const kind = c ? (c.gm ? 'oficial' : (c.faccao === 'marinha' ? 'marinha' : 'pirata')) : 'aldeao';
  const key = kind + ':' + (c ? hashStr(c.id || c.nome || '') : 0);
  if (portraitCache[key]) return portraitCache[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = 96; const g = cv.getContext('2d');
  g.save(); g.beginPath(); g.arc(48, 48, 48, 0, Math.PI * 2); g.clip();
  drawBust(g, 48, 52, 44, c && c.gm ? 'oficial' : kind, c ? Math.abs(hashStr(c.id || '')) : 1);
  drawHat(g, 48, 52, 44, c && c.gm ? 'oficial' : kind); g.restore();
  return (portraitCache[key] = cv.toDataURL());
}

// ---- Token no mapa ----
function drawToken(g, t, x, y, size, o) {
  const r = size * 0.42, cx = x + size / 2, cy = y + size / 2, kind = kindOf(t), ko = t.hpMax > 0 && t.hp <= 0;
  g.save();
  if (o.turn) { g.shadowColor = '#ffd75a'; g.shadowBlur = size * 0.35; }
  g.fillStyle = 'rgba(43,33,24,.3)'; g.beginPath(); g.ellipse(cx, cy + r * 0.95, r * 0.9, r * 0.25, 0, 0, Math.PI * 2); g.fill();
  g.shadowBlur = 0;
  // retrato recortado
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  const im = imgOf(t.img);
  if (im) g.drawImage(im, cx - r, cy - r, r * 2, r * 2);
  else drawBust(g, cx, cy + r * 0.08, r, kind, t.seed || Math.abs(hashStr(t.id)));
  if (ko) { g.fillStyle = 'rgba(80,80,80,.6)'; g.fillRect(cx - r, cy - r, r * 2, r * 2); }
  g.restore();
  // anel (corda)
  g.strokeStyle = ringOf(t); g.lineWidth = Math.max(2, size * 0.08); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = INK; g.lineWidth = Math.max(1, size * 0.025); g.beginPath(); g.arc(cx, cy, r + size * 0.045, 0, Math.PI * 2); g.stroke();
  if (!im) drawHat(g, cx, cy + r * 0.08, r, kind);
  if (ko) { g.strokeStyle = INK; g.lineWidth = size * 0.06; g.beginPath(); g.moveTo(cx - r * 0.5, cy - r * 0.5); g.lineTo(cx + r * 0.5, cy + r * 0.5); g.moveTo(cx + r * 0.5, cy - r * 0.5); g.lineTo(cx - r * 0.5, cy + r * 0.5); g.stroke(); }
  if (o.sel) { g.setLineDash([size * 0.1, size * 0.07]); g.strokeStyle = '#d8a21a'; g.lineWidth = size * 0.05; g.beginPath(); g.arc(cx, cy, r + size * 0.12, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
  // barras
  if (o.bars && t.hpMax > 0) {
    const bw = size * 0.9, bx = cx - bw / 2, by = y - size * 0.1, bh = Math.max(3, size * 0.07);
    g.fillStyle = 'rgba(43,33,24,.75)'; g.fillRect(bx - 1, by - 1, bw + 2, bh * (t.stMax ? 2 : 1) + 3);
    g.fillStyle = '#c0392b'; g.fillRect(bx, by, bw * Math.max(0, t.hp / t.hpMax), bh);
    if (t.stMax) { g.fillStyle = '#d8a21a'; g.fillRect(bx, by + bh + 1, bw * Math.max(0, t.st / t.stMax), bh); }
  }
  // placa com o nome
  if (o.label) {
    const fs = Math.max(11, Math.round(size * 0.24)); g.font = `600 ${fs}px Georgia, serif`;
    const w = g.measureText(t.nome).width + fs * 0.9, ny = y + size + fs * 0.15;
    g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - w / 2, ny); g.lineTo(cx + w / 2, ny); g.lineTo(cx + w / 2 + fs * 0.3, ny + fs * 0.65); g.lineTo(cx + w / 2, ny + fs * 1.3); g.lineTo(cx - w / 2, ny + fs * 1.3); g.lineTo(cx - w / 2 - fs * 0.3, ny + fs * 0.65); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.nome, cx, ny + fs * 0.67);
  }
  g.restore();
}

// ---- Rosa dos ventos ----
function drawCompass(g, x, y, r, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.strokeStyle = INK; g.lineWidth = Math.max(1, r * 0.03);
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.88, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, L = i % 2 ? r * 0.55 : r * 0.95, w = i % 2 ? r * 0.09 : r * 0.14;
    for (const side of [-1, 1]) {
      g.fillStyle = side < 0 ? INK : PARCH2;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.lineTo(Math.cos(a + side * Math.PI / 2) * w, Math.sin(a + side * Math.PI / 2) * w); g.closePath(); g.fill(); g.stroke();
    }
  }
  g.fillStyle = RED; g.beginPath(); g.arc(0, 0, r * 0.08, 0, Math.PI * 2); g.fill();
  g.fillStyle = INK; g.font = `bold ${Math.round(r * 0.32)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('N', 0, -r * 1.2);
  g.restore();
}

// ---- Mapa da ilha em pergaminho (pré-renderizado) ----
const mapCache = {};
function islandLayout(isl) {
  const cols = 26, rows = 18, R = artRng(hashStr(isl.id));
  const L = { cols, rows, R, houses: [], trees: [], special: isl.tema };
  const cx = cols / 2, cy = rows * 0.46;
  // costa: blob radial com ruído
  const pts = [], n = 48, base = isl.tema === 'navio' ? 0 : Math.min(cols, rows) * 0.42;
  const ph = [R() * 6, R() * 6, R() * 6];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const rr = base * (1 + 0.12 * Math.sin(a * 3 + ph[0]) + 0.07 * Math.sin(a * 5 + ph[1]) + 0.04 * Math.sin(a * 9 + ph[2]));
    pts.push([cx + Math.cos(a) * rr * 1.45, cy + Math.sin(a) * rr]);
  }
  L.coast = pts;
  if (isl.tema === 'navio') { // casco do restaurante-navio, visto de cima
    L.coast = [[3, 8.5], [6, 4], [20, 4], [23.5, 6], [25, 8.5], [23.5, 11], [20, 13], [6, 13]];
  }
  L.inside = (x, y) => { let c = false; const p = L.coast; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; } return c; };
  const free = (x, y, w, h) => L.inside(x, y) && L.inside(x + w, y) && L.inside(x, y + h) && L.inside(x + w, y + h) &&
    !L.houses.some(b => x < b.x + b.w + 0.6 && x + w + 0.6 > b.x && y < b.y + b.h + 0.6 && y + h + 0.6 > b.y);
  const add = (x, y, w, h, tipo) => { if (free(x, y, w, h)) { L.houses.push({ x, y, w, h, tipo }); return true; } return false; };
  if (isl.tema === 'vila') { add(16, 3.5, 3, 3, 'bar'); add(5, 4, 2, 2, 'moinho'); }
  if (isl.tema === 'base') { add(10, 2.5, 7, 5, 'base'); }
  if (isl.tema === 'cidade') { add(11.5, 6.5, 3, 3, 'praca'); }
  if (isl.tema === 'navio') {
    L.houses.push({ x: 18, y: 6, w: 4, h: 5, tipo: 'cozinha' });
    for (let i = 0; i < 6; i++) L.houses.push({ x: 7 + (i % 3) * 3.5, y: 6 + Math.floor(i / 3) * 3.5, w: 1.6, h: 1.6, tipo: 'mesa' });
  } else {
    const want = isl.tema === 'cidade' ? 26 : isl.tema === 'base' ? 12 : 9;
    for (let k = 0; k < 400 && L.houses.length < want; k++) {
      const w = 1.5 + Math.floor(R() * 2), h = 1.5 + Math.floor(R() * 2);
      add(Math.floor(R() * (cols - w)) + 0.5, Math.floor(R() * (rows - h)) + 0.5, w, h, 'casa');
    }
    const nt = isl.tema === 'vila' ? 40 : isl.tema === 'cidade' ? 10 : 22;
    for (let k = 0; k < 600 && L.trees.length < nt; k++) {
      const x = R() * cols, y = R() * rows;
      if (L.inside(x, y) && !L.houses.some(b => x > b.x - 0.6 && x < b.x + b.w + 0.6 && y > b.y - 0.6 && y < b.y + b.h + 0.6) && !(Math.abs(x - 13) < 1.5 && y > rows * 0.55)) L.trees.push([x, y, 0.45 + R() * 0.35]);
    }
  }
  return L;
}
function islandMap(isl, cell) {
  const key = isl.id + ':' + cell;
  if (mapCache[key]) return mapCache[key];
  const L = islandLayout(isl), W = L.cols * cell, H = L.rows * cell;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const R = artRng(hashStr(isl.id) + 7), P = (x, y) => [x * cell, y * cell];
  // pergaminho com manchas
  g.fillStyle = PARCH; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const x = R() * W, y = R() * H, r = cell * (1 + R() * 4), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(150,110,60,${0.04 + R() * 0.06})`); gr.addColorStop(1, 'rgba(150,110,60,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // água: linhas de onda em nanquim azulado
  g.strokeStyle = 'rgba(52,96,112,.45)'; g.lineWidth = Math.max(1, cell * 0.03);
  for (let y = cell * 0.5; y < H; y += cell * 0.55) for (let x = (y / cell % 2) * cell * 0.6; x < W; x += cell * 1.3) {
    if (L.inside(x / cell, y / cell)) continue;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + cell * 0.2, y - cell * 0.12, x + cell * 0.4, y); g.quadraticCurveTo(x + cell * 0.6, y + cell * 0.12, x + cell * 0.8, y); g.stroke();
  }
  // terra
  const path = () => { g.beginPath(); L.coast.forEach((p, i) => { const [x, y] = P(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  if (L.special === 'navio') {
    path(); g.fillStyle = '#c99c62'; g.fill(); g.lineWidth = cell * 0.18; g.strokeStyle = '#6b4423'; g.stroke(); g.lineWidth = cell * 0.05; g.strokeStyle = INK; g.stroke();
    g.save(); path(); g.clip(); g.strokeStyle = 'rgba(80,50,20,.35)'; g.lineWidth = 1; for (let y = 0; y < H; y += cell * 0.35) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.restore();
  } else {
    g.save(); g.translate(cell * 0.12, cell * 0.12); path(); g.lineWidth = cell * 0.05; g.strokeStyle = 'rgba(43,33,24,.35)'; g.stroke(); g.restore();
    path(); g.fillStyle = PARCH2; g.fill(); g.lineWidth = cell * 0.07; g.strokeStyle = INK; g.stroke();
    // areia pontilhada
    g.fillStyle = 'rgba(122,90,52,.5)';
    for (let i = 0; i < 700; i++) { const x = R() * L.cols, y = R() * L.rows; if (L.inside(x, y)) { let near = false; for (const d of [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) if (!L.inside(x + d[0], y + d[1])) near = true; if (near) { g.beginPath(); g.arc(x * cell, y * cell, cell * 0.03, 0, 7); g.fill(); } } }
    // montanhas (hachura)
    if (L.special === 'vila' || L.special === 'base') {
      g.strokeStyle = INK; g.lineWidth = cell * 0.04;
      for (let i = 0; i < 5; i++) { const x = (3 + i * 1.6) * cell, y = (L.special === 'vila' ? 8 : 10) * cell + (i % 2) * cell * 0.5; if (!L.inside(x / cell, y / cell)) continue; g.beginPath(); g.moveTo(x - cell * 0.8, y + cell * 0.5); g.lineTo(x, y - cell * 0.7); g.lineTo(x + cell * 0.8, y + cell * 0.5); g.stroke(); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + k * cell * 0.15, y - cell * 0.5 + k * cell * 0.25); g.lineTo(x + k * cell * 0.15 + cell * 0.25, y - cell * 0.5 + k * cell * 0.25 + cell * 0.2); g.stroke(); } }
    }
  }
  // cais ao sul
  const dx = 12.3 * cell, dTop = (L.special === 'navio' ? 13 : 13.2) * cell;
  g.fillStyle = '#b38755'; g.strokeStyle = INK; g.lineWidth = cell * 0.04;
  g.fillRect(dx, dTop, cell * 1.4, H - dTop - cell * 0.6); g.strokeRect(dx, dTop, cell * 1.4, H - dTop - cell * 0.6);
  for (let y = dTop; y < H - cell * 0.6; y += cell * 0.3) { g.beginPath(); g.moveTo(dx, y); g.lineTo(dx + cell * 1.4, y); g.stroke(); }
  // caminhos tracejados do cais às construções
  g.setLineDash([cell * 0.15, cell * 0.12]); g.strokeStyle = 'rgba(43,33,24,.6)'; g.lineWidth = cell * 0.05;
  L.houses.filter(b => b.tipo !== 'mesa').slice(0, 8).forEach(b => { g.beginPath(); g.moveTo(dx + cell * 0.7, dTop); g.quadraticCurveTo(dx, (b.y + b.h) * cell + cell, (b.x + b.w / 2) * cell, (b.y + b.h) * cell); g.stroke(); });
  g.setLineDash([]);
  // árvores (copas recortadas)
  L.trees.forEach(([x, y, s]) => {
    const cx = x * cell, cy = y * cell, r = s * cell;
    g.fillStyle = 'rgba(80,120,60,.45)'; g.strokeStyle = INK; g.lineWidth = cell * 0.035;
    g.beginPath(); for (let i = 0; i <= 7; i++) { const a = i / 7 * Math.PI * 2; g.arc(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * 0.45, a - 1.4, a + 1.4); } g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx, cy + r * 0.2); g.lineTo(cx, cy + r * 0.9); g.stroke();
  });
  // construções
  const roof = '#' + isl.telhado.toString(16).padStart(6, '0');
  L.houses.forEach(b => {
    const [x, y] = P(b.x, b.y), w = b.w * cell, h = b.h * cell;
    g.lineWidth = cell * 0.05; g.strokeStyle = INK;
    if (b.tipo === 'mesa') { g.fillStyle = '#e8d3a8'; g.beginPath(); g.arc(x + w / 2, y + h / 2, w * 0.38, 0, 7); g.fill(); g.stroke(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; g.beginPath(); g.arc(x + w / 2 + Math.cos(a) * w * 0.6, y + h / 2 + Math.sin(a) * w * 0.6, w * 0.12, 0, 7); g.stroke(); } return; }
    if (b.tipo === 'praca') { g.beginPath(); g.arc(x + w / 2, y + h / 2, w * 0.5, 0, 7); g.fillStyle = '#e9d9b4'; g.fill(); g.stroke(); g.beginPath(); g.arc(x + w / 2, y + h / 2, w * 0.18, 0, 7); g.fillStyle = 'rgba(52,96,112,.5)'; g.fill(); g.stroke(); return; }
    if (b.tipo === 'moinho') { g.beginPath(); g.arc(x + w / 2, y + h / 2, w * 0.35, 0, 7); g.fillStyle = '#e2cfa4'; g.fill(); g.stroke(); g.lineWidth = cell * 0.08; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(x + w / 2, y + h / 2); g.lineTo(x + w / 2 + Math.cos(a) * w * 0.75, y + h / 2 + Math.sin(a) * w * 0.75); g.stroke(); } return; }
    g.fillStyle = PARCH2; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = roof + '55'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(43,33,24,.5)'; g.lineWidth = cell * 0.025; for (let k = -h; k < w; k += cell * 0.22) { g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); g.stroke(); } g.restore();
    g.strokeStyle = INK; g.lineWidth = cell * 0.04; g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
    if (b.tipo === 'base') { // muro com torre e bandeira
      g.lineWidth = cell * 0.12; g.strokeRect(x - cell * 0.5, y - cell * 0.4, w + cell, h + cell * 0.9);
      g.fillStyle = '#fbfbf7'; g.lineWidth = cell * 0.05; g.beginPath(); g.arc(x + w / 2, y + h / 2, cell * 0.9, 0, 7); g.fill(); g.stroke();
      g.fillStyle = NAVY; g.fillRect(x + w / 2 - cell * 0.05, y + h / 2 - cell * 1.8, cell * 0.1, cell * 1); g.fillRect(x + w / 2, y + h / 2 - cell * 1.8, cell * 0.7, cell * 0.4);
    }
    if (b.tipo === 'bar' || b.tipo === 'cozinha') { g.fillStyle = INK; g.font = `italic ${Math.round(cell * 0.4)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = PARCH2; g.fillRect(x + w * 0.1, y + h * 0.36, w * 0.8, h * 0.28); g.strokeRect(x + w * 0.1, y + h * 0.36, w * 0.8, h * 0.28); g.fillStyle = INK; g.fillText(b.tipo === 'bar' ? 'Bar' : 'Cozinha', x + w / 2, y + h / 2); }
  });
  // cartela com o nome
  g.font = `italic bold ${Math.round(cell * 0.62)}px Georgia, serif`; const tw = g.measureText(isl.nome).width + cell;
  g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = cell * 0.05; g.fillRect(cell * 0.4, cell * 0.35, tw, cell * 1.05); g.strokeRect(cell * 0.4, cell * 0.35, tw, cell * 1.05); g.strokeRect(cell * 0.5, cell * 0.45, tw - cell * 0.2, cell * 0.85);
  g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(isl.nome, cell * 0.9, cell * 0.88);
  drawCompass(g, W - cell * 2, H - cell * 2.1, cell * 1.3);
  // moldura
  g.strokeStyle = INK; g.lineWidth = cell * 0.08; g.strokeRect(cell * 0.12, cell * 0.12, W - cell * 0.24, H - cell * 0.24);
  return (mapCache[key] = { canvas: cv, L });
}

// ---- Navio de lado (cena de figuras) ----
function drawShip2D(g, x, y, s, f) {
  g.save(); g.translate(x, y); g.strokeStyle = INK; g.lineWidth = s * 0.03;
  g.fillStyle = f === 'marinha' ? '#e9e6dc' : '#6b3a1f';
  g.beginPath(); g.moveTo(-s, 0); g.lineTo(s * 1.1, 0); g.lineTo(s * 0.8, s * 0.4); g.lineTo(-s * 0.85, s * 0.4); g.closePath(); g.fill(); g.stroke();
  if (f === 'marinha') { g.fillStyle = NAVY; g.fillRect(-s * 0.9, s * 0.12, s * 1.85, s * 0.08); }
  g.fillStyle = '#5a3a1c'; g.fillRect(-s * 0.03, -s * 1.3, s * 0.06, s * 1.3); g.strokeRect(-s * 0.03, -s * 1.3, s * 0.06, s * 1.3);
  g.fillStyle = '#fbf7ea'; g.beginPath(); g.moveTo(-s * 0.55, -s * 1.15); g.quadraticCurveTo(0, -s * 1.0, s * 0.55, -s * 1.15); g.lineTo(s * 0.6, -s * 0.2); g.quadraticCurveTo(0, -s * 0.05, -s * 0.6, -s * 0.2); g.closePath(); g.fill(); g.stroke();
  drawEmblem(g, 0, -s * 0.65, s * 0.3, f);
  g.fillStyle = f === 'marinha' ? NAVY : RED; g.beginPath(); g.moveTo(0, -s * 1.3); g.lineTo(s * 0.35, -s * 1.22); g.lineTo(0, -s * 1.14); g.fill();
  g.restore();
}
// Emblema da vela: caveira com ossos (pirata) ou gaivota (Marinha).
function drawEmblem(g, x, y, r, f) {
  g.save(); g.translate(x, y); g.strokeStyle = f === 'marinha' ? NAVY : INK; g.fillStyle = f === 'marinha' ? NAVY : INK; g.lineWidth = r * 0.14; g.lineCap = 'round';
  if (f === 'marinha') {
    g.beginPath(); g.moveTo(-r, -r * 0.1); g.quadraticCurveTo(-r * 0.5, -r * 0.6, 0, 0); g.quadraticCurveTo(r * 0.5, -r * 0.6, r, -r * 0.1); g.stroke();
    g.beginPath(); g.arc(0, r * 0.05, r * 0.14, 0, 7); g.fill();
  } else {
    g.beginPath(); g.moveTo(-r * 0.8, -r * 0.6); g.lineTo(r * 0.8, r * 0.8); g.moveTo(r * 0.8, -r * 0.6); g.lineTo(-r * 0.8, r * 0.8); g.stroke();
    g.beginPath(); g.arc(0, -r * 0.05, r * 0.5, 0, 7); g.fill(); g.fillRect(-r * 0.3, r * 0.25, r * 0.6, r * 0.3);
    g.fillStyle = '#fbf7ea'; g.beginPath(); g.arc(-r * 0.2, -r * 0.08, r * 0.13, 0, 7); g.arc(r * 0.2, -r * 0.08, r * 0.13, 0, 7); g.fill();
  }
  g.restore();
}

// ---- d20 em SVG (animação de dado no palco) ----
function d20Svg(n, cor) {
  const P = (a, r) => [50 + Math.cos(a) * r, 50 + Math.sin(a) * r].map(v => v.toFixed(1));
  const H = [0, 1, 2, 3, 4, 5].map(i => P(-Math.PI / 2 + i * Math.PI / 3, 46));
  const T = [0, 1, 2].map(i => P(-Math.PI / 2 + i * 2 * Math.PI / 3, 26));
  const ln = (a, b) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${INK}" stroke-width="1.5"/>`;
  let lines = '';
  H.forEach((h, i) => { if (i % 2 === 0) lines += ln(h, T[i / 2]); else { lines += ln(h, T[(i - 1) / 2]) + ln(h, T[((i + 1) / 2) % 3]); } });
  return `<svg viewBox="0 0 100 100" width="120" height="120"><polygon points="${H.map(p => p.join(',')).join(' ')}" fill="${cor}" stroke="${INK}" stroke-width="3"/>` +
    `<polygon points="${T.map(p => p.join(',')).join(' ')}" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="2"/>` + lines +
    `<text x="50" y="55" text-anchor="middle" dominant-baseline="middle" font-family="Georgia,serif" font-weight="bold" font-size="24" fill="#fff" stroke="${INK}" stroke-width="1">${n}</text></svg>`;
}
