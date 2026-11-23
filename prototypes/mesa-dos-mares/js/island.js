// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// A mesa da ilha: battlemap 2D em pergaminho com grade, tokens arrastáveis, câmera com pan e zoom.
'use strict';

const Island = (() => {
  const cams = {};
  // a ilha com o que o gerador do mestre mudou (semente e tema)
  const IS = id => Object.assign({}, ISLAND[id], (db.islandCfg && db.islandCfg[id]) || {});
  let sel = null, drag = null, pan = null, isl = null, cv = null, spaceDown = false;
  let tmoveClock = 0;

  function cam(id) {
    if (!cams[id]) {
      let c = null; try { c = JSON.parse(localStorage.getItem('mdm-cam-' + id)); } catch (e) { c = null; }
      cams[id] = c || { x: 0, y: 0, z: 0, fit: true };
    }
    return cams[id];
  }
  let camSaveT = 0;
  function saveCam(id) { clearTimeout(camSaveT); camSaveT = setTimeout(() => { try { localStorage.setItem('mdm-cam-' + id, JSON.stringify(cams[id])); } catch (e) { /* sem armazenamento: tudo bem */ } }, 400); }
  function fitCam(id, W, H) {
    const c = cam(id), L = islandMap(IS(id), tune.cellPx).L, mw = L.cols * tune.cellPx, mh = L.rows * tune.cellPx;
    c.z = Math.min(W / mw, H / mh) * 0.96; c.x = (W - mw * c.z) / 2; c.y = (H - mh * c.z) / 2; c.fit = false;
  }
  const tokensOn = id => Object.values(db.tokens).filter(t => t.isl === id);
  const canMove = t => isGM() || t.owner === myId;
  const canSeeBars = t => t.pub || isGM() || t.owner === myId || t.owner !== 'gm';

  function toWorld(e) {
    const r = cv.getBoundingClientRect(), c = cam(isl);
    return { x: (e.clientX - r.left - c.x) / c.z, y: (e.clientY - r.top - c.y) / c.z };
  }
  function hitToken(w) {
    const cell = tune.cellPx, list = tokensOn(isl).sort(drawOrder).reverse();
    return list.find(t => { const z = t.tam || 1; return w.x >= t.x * cell && w.x <= (t.x + z) * cell && w.y >= t.y * cell && w.y <= (t.y + z) * cell; }) || null;
  }
  const drawOrder = (a, b) => (a.owner === 'gm' ? 0 : 1) - (b.owner === 'gm' ? 0 : 1);

  function attach(canvas) {
    cv = canvas;
    cv.addEventListener('pointerdown', e => {
      if (!isl || scene !== 'play' || stageMode() !== 'island') return;
      cv.setPointerCapture(e.pointerId);
      const w = toWorld(e), t = (e.button === 0 && !spaceDown) ? hitToken(w) : null;
      if (t) {
        sel = t.id; dirty.tokens = true; uiSelChanged();
        drag = { id: t.id, ox: w.x - t.x * tune.cellPx, oy: w.y - t.y * tune.cellPx, x0: t.x, y0: t.y, sx: e.clientX, sy: e.clientY, moved: false, ok: canMove(t) };
      } else {
        if (e.button === 0 && !spaceDown) { sel = null; uiSelChanged(); }
        const c = cam(isl); pan = { sx: e.clientX, sy: e.clientY, cx: c.x, cy: c.y };
      }
    });
    cv.addEventListener('pointermove', e => {
      if (drag) {
        if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
        if (!drag.moved && !drag.ok) { toast('Esse token não é seu.'); drag = null; return; }
        { const tt = db.tokens[drag.id]; if (!drag.moved && tt && tt.status && tt.status.prender > 0) { toast(tt.nome + ' está preso e não anda.'); drag = null; return; } }
        drag.moved = true;
        const t = db.tokens[drag.id], w = toWorld(e); if (!t) { drag = null; return; }
        t.x = (w.x - drag.ox) / tune.cellPx; t.y = (w.y - drag.oy) / tune.cellPx; dirty.tokens = true;
        tmoveClock++; if (tmoveClock % 3 === 0) sendTokMove(t.id, t.x, t.y);
      } else if (pan) {
        const c = cam(isl); c.x = pan.cx + e.clientX - pan.sx; c.y = pan.cy + e.clientY - pan.sy; dirty.tokens = true; saveCam(isl);
      }
    });
    const up = () => {
      if (drag && drag.moved) {
        const t = db.tokens[drag.id];
        if (t) { t.x = Math.round(t.x); t.y = Math.round(t.y); commit('tokens', t.id, t); tone(220, 0.06, 'square', 0.12); }
      }
      drag = null; pan = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => {
      if (!isl || stageMode() !== 'island') return; e.preventDefault();
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, c = cam(isl);
      const z = clamp(c.z * (e.deltaY > 0 ? 0.9 : 1.1), tune.zoomMin, tune.zoomMax), k = z / c.z;
      c.x = px - (px - c.x) * k; c.y = py - (py - c.y) * k; c.z = z; dirty.tokens = true; saveCam(isl);
    }, { passive: false });
    cv.addEventListener('dragstart', e => e.preventDefault());
    addEventListener('keydown', e => { if (e.code === 'Space' && !typing(e)) spaceDown = true; });
    addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
  }

  // Um lugar vazio perto do cais para um token novo.
  function freeSpot(id, cx, cy) {
    cx = cx == null ? 12 : cx; cy = cy == null ? 13 : cy;
    const occ = new Set(tokensOn(id).map(t => t.x + ',' + t.y)), L = islandMap(IS(id), tune.cellPx).L;
    for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 1 || y < 1 || x >= L.cols - 1 || y >= L.rows - 1) continue;
      if (!occ.has(x + ',' + y) && (L.inside(x + 0.5, y + 0.5) || L.special === 'navio')) return { x, y };
    }
    return { x: 12, y: 12 };
  }
  // Meu personagem ganha um token na ilha onde chegou (uma vez por ilha).
  function ensureMyToken(id) {
    const c = me(); if (!c || c.gm || !isIsland(id)) return;
    if (tokensOn(id).some(t => t.owner === myId && t.pc)) return;
    const p = freeSpot(id), tid = 'pc-' + myId + '-' + id;
    commit('tokens', tid, { id: tid, isl: id, owner: myId, pc: true, nome: c.nome, img: c.img || null, x: p.x, y: p.y,
      hp: c.hp, hpMax: c.hpMax, st: c.st, stMax: c.stMax, pub: true, seed: Math.abs(hashStr(myId)), lv: c.lv, tam: (RACES[c.raca] || {}).size || 1, status: {} });
  }
  function addToken(id, row) { const p = freeSpot(id), tid = 'tk-' + uid(); const t = Object.assign({ id: tid, isl: id, x: p.x, y: p.y, seed: Math.abs(hashStr(tid)) }, row); commit('tokens', tid, t); sel = tid; uiSelChanged(); return t; }

  // pequenos selos de status em cima do token
  function statusIcons(g, t, x, y, size) {
    const st = t.status || {}, keys = ['veneno', 'queimar', 'atordoar', 'prender'].filter(k => st[k] > 0); if (!keys.length) return;
    const s = size * 0.26; keys.forEach((k, i) => {
      const cx = x + size - s * 0.6 - i * s * 1.15, cy = y + s * 0.6; g.save(); g.translate(cx, cy); g.lineWidth = Math.max(1, s * 0.12); g.strokeStyle = INK;
      g.fillStyle = { veneno: '#5fb04a', queimar: '#e8742a', atordoar: '#f0cf3c', prender: '#8a6a3a' }[k]; g.beginPath();
      if (k === 'veneno') { g.moveTo(0, -s * 0.55); g.quadraticCurveTo(s * 0.55, s * 0.1, 0, s * 0.5); g.quadraticCurveTo(-s * 0.55, s * 0.1, 0, -s * 0.55); }
      else if (k === 'queimar') { g.moveTo(0, -s * 0.6); g.quadraticCurveTo(s * 0.6, 0, s * 0.2, s * 0.5); g.quadraticCurveTo(0, s * 0.3, -s * 0.2, s * 0.5); g.quadraticCurveTo(-s * 0.6, 0, 0, -s * 0.6); }
      else if (k === 'atordoar') { for (let q = 0; q < 10; q++) { const a = q * Math.PI / 5 - Math.PI / 2, r = q % 2 ? s * 0.22 : s * 0.55; q ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } }
      else { g.rect(-s * 0.5, -s * 0.28, s, s * 0.56); }
      g.closePath(); g.fill(); g.stroke(); g.restore();
    });
  }
  function draw(g, W, H, id) {
    if (isl !== id) { isl = id; sel = null; uiSelChanged(); }
    const c = cam(id); if (c.fit || !c.z) fitCam(id, W, H);
    // mesa de madeira escura em volta do mapa
    g.fillStyle = '#2a1d14'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; for (let y = 0; y < H; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + 8); g.stroke(); }
    const m = islandMap(IS(id), tune.cellPx), cell = tune.cellPx, L = m.L;
    g.save(); g.translate(c.x, c.y); g.scale(c.z, c.z);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 30; g.drawImage(m.canvas, 0, 0); g.shadowBlur = 0;
    // grade sépia
    g.strokeStyle = 'rgba(110,80,45,.32)'; g.lineWidth = 1 / c.z;
    g.beginPath(); for (let x = 0; x <= L.cols; x++) { g.moveTo(x * cell, 0); g.lineTo(x * cell, L.rows * cell); } for (let y = 0; y <= L.rows; y++) { g.moveTo(0, y * cell); g.lineTo(L.cols * cell, y * cell); } g.stroke();
    // tokens: NPCs embaixo dos jogadores
    const cb = db.combat[id], turnId = cb && cb.on ? cb.order[cb.turn] : null;
    tokensOn(id).sort(drawOrder).forEach(t => {
      const z = t.tam || 1; drawToken(g, t, t.x * cell, t.y * cell, cell * z, { sel: t.id === sel, turn: t.id === turnId, bars: canSeeBars(t), label: true }); statusIcons(g, t, t.x * cell, t.y * cell, cell * z);
    });
    g.restore();
  }

  return { attach, draw, ensureMyToken, addToken, tokensOn, canMove, freeSpot, get sel() { return sel; }, set sel(v) { sel = v; }, fit: id => { cam(id).fit = true; dirty.tokens = true; } };
})();
