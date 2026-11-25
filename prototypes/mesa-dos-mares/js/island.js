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
  let tmoveClock = 0, editTool = null, lastPing = 0;
  const MPQ = 1.5;   // metros por quadrado (o livro usa a grade de 1,5 m)
  const pings = [];  // pontos marcados no mapa: { x, y, t, nome, cor } (x e y em quadrados)
  function addPing(p) { pings.push({ x: p.x, y: p.y, t: state.t, nome: p.nome || '', cor: p.cor || null }); if (pings.length > 12) pings.shift(); }
  function ping(w) {
    const agora = clock.now(); if (agora - lastPing < 0.35) return; lastPing = agora;   // sem metralhadora de pings
    const c = me(), x = w.x / tune.cellPx, y = w.y / tune.cellPx, p = { x, y, nome: c ? c.nome : '', cor: c ? c.cor : null };
    addPing(p); broadcast({ t: 'ping', isl, x, y, nome: p.nome, cor: p.cor }); tone(660, 0.12, 'sine', 0.18);
  }
  bcHandlers.ping = m => { if (m.isl === currentView()) { addPing(m); tone(660, 0.12, 'sine', 0.12); } };
  // ---- O mestre desenha a ilha: casa, casa grande, árvore ou borracha. O que ele põe substitui o que o gerador sorteou. ----
  function editAt(w) {
    const id = isl, cell = tune.cellPx, x = w.x / cell, y = w.y / cell, L = islandMap(IS(id), cell).L, cfg = Object.assign({}, db.islandCfg[id] || {});
    if (!cfg.manual) cfg.manual = { houses: L.houses.map(b => Object.assign({}, b)), trees: L.trees.map(t => t.slice()) };
    const m = cfg.manual;
    if (editTool === 'apagar') {
      const hi = m.houses.findIndex(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      if (hi >= 0) m.houses.splice(hi, 1);
      else { let bi = -1, bd = 0.9; m.trees.forEach((t, i) => { const d = Math.hypot(t[0] - x, t[1] - y); if (d < bd) { bd = d; bi = i; } }); if (bi < 0) return; m.trees.splice(bi, 1); }
    } else if (editTool === 'arvore') {
      if (!L.inside(x, y)) { toast('Árvore só em terra.'); return; }
      m.trees.push([+x.toFixed(2), +y.toFixed(2), +(0.45 + rng() * 0.35).toFixed(2)]);
    } else {
      const bw = editTool === 'casaG' ? 3 : 2, bx = Math.round(x - bw / 2), by = Math.round(y - bw / 2);
      if (!(L.inside(bx, by) && L.inside(bx + bw, by) && L.inside(bx, by + bw) && L.inside(bx + bw, by + bw))) { toast('A casa precisa caber em terra.'); return; }
      m.houses.push({ x: bx, y: by, w: bw, h: bw, tipo: 'casa' });
    }
    commit('islandCfg', id, cfg); dirty.tokens = true; tone(300, 0.05, 'square', 0.1);
  }

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
    // Pinça com dois dedos: zoom e arrasto do mapa no celular
    const pts = new Map(); let pinch = null;
    const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
    cv.addEventListener('pointerdown', e => {
      if (!isl || scene !== 'play' || stageMode() !== 'island') return;
      cv.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { drag = null; pan = null; const c = cam(isl), s = two(); pinch = { d: s.d, z: c.z, mx: s.mx, my: s.my, cx: c.x, cy: c.y }; return; }
      if (pts.size > 2) return;
      if (editTool && isGM() && e.button === 0 && !spaceDown) { editAt(toWorld(e)); return; }
      const w = toWorld(e), t = (e.button === 0 && !spaceDown) ? hitToken(w) : null;
      if (t) {
        sel = t.id; dirty.tokens = true; uiSelChanged();
        drag = { id: t.id, ox: w.x - t.x * tune.cellPx, oy: w.y - t.y * tune.cellPx, x0: t.x, y0: t.y, sx: e.clientX, sy: e.clientY, moved: false, ok: canMove(t) };
      } else {
        if (e.button === 0 && !spaceDown) { sel = null; uiSelChanged(); }
        const c = cam(isl); pan = { sx: e.clientX, sy: e.clientY, cx: c.x, cy: c.y, moved: false, ping: e.button === 0 && !spaceDown && !editTool };
      }
    });
    cv.addEventListener('pointermove', e => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        const s = two(), c = cam(isl), r = cv.getBoundingClientRect();
        const z = clamp(pinch.z * s.d / pinch.d, tune.zoomMin, tune.zoomMax), k = z / pinch.z, px = pinch.mx - r.left, py = pinch.my - r.top;
        c.z = z; c.x = px - (px - pinch.cx) * k + (s.mx - pinch.mx); c.y = py - (py - pinch.cy) * k + (s.my - pinch.my); dirty.tokens = true; saveCam(isl); return;
      }
      if (drag) {
        if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
        if (!drag.moved && !drag.ok) { toast('Esse token não é seu.'); drag = null; return; }
        { const tt = db.tokens[drag.id]; if (!drag.moved && tt && tt.status && tt.status.prender > 0 && !isGM()) { toast(tt.nome + ' está preso e não anda.'); drag = null; return; } }
        drag.moved = true;
        const t = db.tokens[drag.id], w = toWorld(e); if (!t) { drag = null; return; }
        t.x = (w.x - drag.ox) / tune.cellPx; t.y = (w.y - drag.oy) / tune.cellPx; dirty.tokens = true;
        tmoveClock++; if (tmoveClock % 3 === 0) sendTokMove(t.id, t.x, t.y);
      } else if (pan) {
        if (!pan.moved && Math.hypot(e.clientX - pan.sx, e.clientY - pan.sy) < 4) return; pan.moved = true;
        const c = cam(isl); c.x = pan.cx + e.clientX - pan.sx; c.y = pan.cy + e.clientY - pan.sy; dirty.tokens = true; saveCam(isl);
      }
    });
    const up = e => {
      if (e && e.pointerId != null) pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
      if (e && pts.size > 0 && !drag) return; // sobrou um dedo depois da pinça: não vira arrasto
      if (drag && drag.moved) {
        const t = db.tokens[drag.id];
        if (t) { t.x = Math.round(t.x); t.y = Math.round(t.y); commit('tokens', t.id, t); tone(220, 0.06, 'square', 0.12); }
      }
      else if (drag && !drag.moved) { const t = db.tokens[drag.id]; if (t && t.loja && typeof Shop !== 'undefined' && Shop.open) Shop.open(t.id); } // clicar num lojista abre o balcão
      if (pan && pan.ping && !pan.moved && !drag && e && e.type === 'pointerup' && isl && scene === 'play' && stageMode() === 'island') ping(toWorld(e));   // um toque num lugar vazio marca o ponto
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
    const occ = new Set(tokensOn(id).map(t => t.x + ',' + t.y)), L = islandMap(IS(id), tune.cellPx).L;
    cx = cx == null ? Math.round(L.cols / 2 - 1) : cx; cy = cy == null ? Math.round(L.rows * 0.72) : cy;
    for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 1 || y < 1 || x >= L.cols - 1 || y >= L.rows - 1) continue;
      if (!occ.has(x + ',' + y) && (L.inside(x + 0.5, y + 0.5) || L.special === 'navio')) return { x, y };
    }
    return { x: 12, y: 12 };
  }
  // Toda ilha nasce com moradores e lojas: o lojista fica perto de uma casa, e clicar nele abre o balcão.
  // Ids e lugares saem da semente da ilha, então todo aparelho que povoar primeiro chega ao mesmo resultado.
  function populate(id, force) {
    if (!isIsland(id) || !db.world) return;
    const pop = db.world.pop || {}; if (pop[id] && !force) return;
    if (force) Object.values(db.tokens).filter(t => t.isl === id && t.res).forEach(t => commit('tokens', t.id, null));
    const I = IS(id), def = MORADORES[I.tema] || MORADORES.vila, L = islandMap(I, tune.cellPx).L, R = artRng(hashStr('res' + id + (I.seed || '')));
    const casas = L.houses.filter(b => ['casa', 'bar', 'praca', 'cozinha', 'moinho'].includes(b.tipo)).slice();
    for (let i = casas.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [casas[i], casas[j]] = [casas[j], casas[i]]; }
    const nomes = NOMES_NPC.slice(); for (let i = nomes.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [nomes[i], nomes[j]] = [nomes[j], nomes[i]]; }
    const lista = def.lojas.map(loja => ({ loja })).concat(Array.from({ length: def.gente }, () => ({ loja: null })));
    lista.forEach((q, i) => {
      const b = casas.length ? casas[i % casas.length] : { x: L.cols / 2 - 1, y: L.rows / 2 - 1, w: 2, h: 2 }, tid = 'res-' + id + '-' + i;
      const p = freeSpot(id, Math.round(b.x + b.w / 2) + (i >= casas.length ? 1 : 0), Math.round(b.y + b.h) + 1), nome = nomes[i % nomes.length];
      const kind = q.loja === 'taverna' ? 'cozinha' : q.loja ? 'aldeao' : def.tipo;
      commit('tokens', tid, { id: tid, isl: id, owner: 'gm', kind, nome: q.loja ? nome + ' (' + LOJAS[q.loja].nome + ')' : nome, img: null, x: p.x, y: p.y, hp: 0, hpMax: 0, st: 0, stMax: 0, lv: 1, tam: 1, pub: true, seed: Math.abs(hashStr(tid)), status: {}, res: true, loja: q.loja || null });
    });
    db.world.pop = Object.assign({}, db.world.pop, { [id]: true }); commit('world', null, db.world);
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

  // selo dourado de quem vende alguma coisa
  function shopBadge(g, x, y, size) {
    const s = size * 0.3, cx = x + s * 0.6, cy = y + s * 0.6; g.save();
    g.fillStyle = '#e0a21a'; g.strokeStyle = INK; g.lineWidth = Math.max(1, s * 0.1); g.beginPath(); g.arc(cx, cy, s * 0.55, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = '700 ' + Math.round(s * 0.75) + 'px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', cx, cy + s * 0.04); g.restore();
  }
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
    g.fillStyle = canvasBg(); g.fillRect(0, 0, W, H);
    const m = islandMap(IS(id), tune.cellPx), cell = tune.cellPx, L = m.L;
    g.save(); g.translate(c.x, c.y); g.scale(c.z, c.z);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 30; g.drawImage(m.canvas, 0, 0); g.shadowBlur = 0;
    // grade sépia
    g.strokeStyle = 'rgba(110,80,45,.32)'; g.lineWidth = 1 / c.z;
    g.beginPath(); for (let x = 0; x <= L.cols; x++) { g.moveTo(x * cell, 0); g.lineTo(x * cell, L.rows * cell); } for (let y = 0; y <= L.rows; y++) { g.moveTo(0, y * cell); g.lineTo(L.cols * cell, y * cell); } g.stroke();
    // tokens: NPCs embaixo dos jogadores
    const cb = db.combat[id], turnId = cb && cb.on ? cb.order[cb.turn] : null;
    tokensOn(id).sort(drawOrder).forEach(t => {
      const z = t.tam || 1; drawToken(g, t, t.x * cell, t.y * cell, cell * z, { sel: t.id === sel, turn: t.id === turnId, bars: canSeeBars(t), label: true }); statusIcons(g, t, t.x * cell, t.y * cell, cell * z); if (t.loja) shopBadge(g, t.x * cell, t.y * cell, cell * z);
    });
    // a metragem do arrasto: de onde o token saiu até onde ele está (1 quadrado = 1,5 m; a diagonal conta como 1)
    if (drag && drag.moved && db.tokens[drag.id]) {
      const t = db.tokens[drag.id], z = t.tam || 1, sx = (drag.x0 + z / 2) * cell, sy = (drag.y0 + z / 2) * cell, ex = (t.x + z / 2) * cell, ey = (t.y + z / 2) * cell;
      const sq = Math.max(Math.abs(Math.round(t.x - drag.x0)), Math.abs(Math.round(t.y - drag.y0))), metros = sq * MPQ, dono = db.chars[t.owner];
      const max = dono && !dono.gm ? ((RACES[dono.raca] || {}).desloc || 9) : 0, alem = max && metros > max, cor = alem ? '#e0533d' : '#2f8f5b';
      g.save(); g.setLineDash([cell * 0.2, cell * 0.14]); g.lineWidth = cell * 0.09; g.strokeStyle = cor; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(sx, sy, cell * 0.2, 0, 7); g.fillStyle = cor; g.fill();
      const txt = metros.toLocaleString('pt-BR') + ' m' + (max ? ' / ' + max + ' m' : '') + ' · ' + sq + (sq === 1 ? ' quadrado' : ' quadrados');
      g.font = '700 ' + Math.round(cell * 0.34) + 'px Segoe UI, sans-serif'; const tw = g.measureText(txt).width + cell * 0.5, bx = ex - tw / 2, by = ey - z * cell / 2 - cell * 0.95;
      g.fillStyle = 'rgba(20,24,28,.88)'; g.beginPath(); g.roundRect ? g.roundRect(bx, by, tw, cell * 0.6, cell * 0.2) : g.rect(bx, by, tw, cell * 0.6); g.fill();
      g.fillStyle = alem ? '#ff9a8a' : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, ex, by + cell * 0.31); g.restore();
    }
    // os pings: anéis que se abrem e somem
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i], idade = state.t - p.t; if (idade > 2.4) { pings.splice(i, 1); continue; }
      const px = p.x * cell, py = p.y * cell, a = 1 - idade / 2.4, cor = p.cor ? tc(p.cor) : '#d8a21a';
      g.save(); g.strokeStyle = cor; g.lineWidth = cell * 0.1; for (let k = 0; k < 2; k++) { const r = cell * (0.3 + Math.max(0, idade - k * 0.35) * 1.5); g.globalAlpha = Math.max(0, a * (k ? 0.6 : 1)); g.beginPath(); g.arc(px, py, r, 0, 7); g.stroke(); }
      g.globalAlpha = a; g.fillStyle = cor; g.beginPath(); g.arc(px, py, cell * 0.16, 0, 7); g.fill();
      if (p.nome) { g.font = '700 ' + Math.round(cell * 0.3) + 'px Segoe UI, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(20,24,28,.85)'; const tw = g.measureText(p.nome).width + cell * 0.4; g.fillRect(px - tw / 2, py - cell * 1.05, tw, cell * 0.5); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(p.nome, px, py - cell * 0.8); }
      g.restore();
    }
    g.restore();
  }

  return { attach, draw, populate, ensureMyToken, addToken, tokensOn, canMove, freeSpot, get sel() { return sel; }, set sel(v) { sel = v; }, get editTool() { return editTool; }, set editTool(v) { editTool = v || null; dirty.tokens = true; uiSelChanged(); }, fit: id => { cam(id).fit = true; dirty.tokens = true; } };
})();
