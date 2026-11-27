// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// O Mundo: a visão do narrador. Os quatro mares lado a lado, ou um mar só em tela cheia, com as ilhas e quem está em cada uma;
// dali o mestre escolhe uma ilha, abre o mapa dela, leva um jogador para lá, cria ilhas novas e arrasta qualquer ilha para outro lugar.
'use strict';
const World = (() => {
  let sel = null, pick = null, rects = [], drag = null, nova = false;
  let foco = (function () { try { return sessionStorage.getItem('mdm-foco') || null; } catch (e) { return null; } })();
  const MARES = Object.keys(SEAS);
  const TEMAS = { vila: 'Vila', cidade: 'Cidade', base: 'Base da Marinha', navio: 'Navio / flutuante' };
  const TELHADOS = [0xc4472f, 0x8a5a3a, 0xb05a2e, 0xe08a2a, 0x6b6b7a, 0x7a8a4a, 0x8a5aa8, 0xe07a6a, 0x6a8aa8];
  const aqui = id => Object.values(db.chars).filter(c => !c.gm && !c.prisao && chanOf(c) === id);
  const mares = () => (foco && SEAS[foco] ? [foco] : MARES);
  function layout(W, H) {
    const top = 56, base = 128, pad = 12, aw = W - pad * 2, ah = H - top - base, ms = mares();
    if (ms.length === 1) { rects = [{ mar: ms[0], x: pad, y: top, w: aw, h: ah }]; return; }
    const wide = W >= H * 1.05, cols = wide ? 2 : 1, rows = wide ? 2 : 4, gap = 10, w = (aw - gap * (cols - 1)) / cols, h = (ah - gap * (rows - 1)) / rows;
    rects = ms.map((mar, i) => ({ mar, x: pad + (i % cols) * (w + gap), y: top + Math.floor(i / cols) * (h + gap), w, h }));
  }
  const pos = (r, isl) => [r.x + isl.cx * r.w, r.y + isl.cy * r.h];
  function draw(g, W, H) {
    layout(W, H); g.fillStyle = canvasBg(); g.fillRect(0, 0, W, H);
    const um = rects.length === 1;
    rects.forEach(r => {
      g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 14; g.drawImage(Travel.chart(r.mar, Math.round(r.w), Math.round(r.h)), r.x, r.y, r.w, r.h); g.restore();
      Travel.vida(g, r.mar, r.x, r.y, r.w, r.h);
      const rad = Math.max(10, Math.min(r.w, r.h) * (um ? 0.05 : 0.07));
      Object.values(db.ships).filter(s => s.mar === r.mar && s.travel).forEach(s => { const q = Travel.boatPos(s); drawBoat(g, r.x + q.x * r.w, r.y + q.y * r.h, 34, q.ang, s.fac === 'marinha' ? 'marinha' : 'pirata'); });
      islandsOf(r.mar).forEach(isl => {
        const [x, y] = pos(r, isl), arrastando = drag && drag.id === isl.id && drag.moved;
        if (arrastando) { g.save(); g.globalAlpha = 0.85; }
        Travel.islet(g, isl, x, y, rad, sel === isl.id);
        if (arrastando) g.restore();
        const fs = um ? 14 : 12; g.font = '600 ' + fs + 'px Georgia, serif'; const tw = g.measureText(isl.nome).width + 12, lh = fs + 7;
        g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = 1.2; g.fillRect(x - tw / 2, y + rad * 0.95, tw, lh); g.strokeRect(x - tw / 2, y + rad * 0.95, tw, lh);
        g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(isl.nome, x, y + rad * 0.95 + lh / 2 + 1);
        const who = aqui(isl.id), shown = who.slice(0, 5);
        shown.forEach((c, i) => {
          const bx = x + (i - (shown.length - 1) / 2) * 20, by = y - rad * 1.15 - 8;
          g.fillStyle = c.faccao === 'marinha' ? NAVY : RED; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(bx, by, 9, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#fff'; g.font = '700 11px Segoe UI, sans-serif'; g.fillText((c.nome || '?')[0].toUpperCase(), bx, by + 1);
        });
        if (who.length > 5) { g.fillStyle = INK; g.font = '700 11px Segoe UI, sans-serif'; g.fillText('+' + (who.length - 5), x + 56, y - rad * 1.15 - 8); }
      });
      const nome = SEAS[r.mar].nome; g.font = 'italic bold ' + (um ? 26 : 18) + 'px Georgia, serif'; const tw = g.measureText(nome).width + 24, th = um ? 42 : 30;
      g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = 2; g.fillRect(r.x + 16, r.y + 16, tw, th); g.strokeRect(r.x + 16, r.y + 16, tw, th);
      g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(nome, r.x + 28, r.y + 16 + th / 2 + 1);
      if (nova && um) {
        g.font = '600 14px Segoe UI, sans-serif'; const msg = 'Clique no mar onde a ilha nova vai ficar', mw = g.measureText(msg).width + 24;
        g.fillStyle = 'rgba(43,33,24,.82)'; g.fillRect(r.x + r.w / 2 - mw / 2, r.y + 20, mw, 28); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(msg, r.x + r.w / 2, r.y + 35);
      }
    });
  }
  // ---- Ponteiro: tocar numa ilha seleciona; arrastar muda o lugar; com "Nova ilha" ligado, tocar no mar cria ----
  const ponto = (e, canvas) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const rectEm = (x, y) => rects.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
  function ilhaEm(x, y) {
    let best = null, bd = 38;
    rects.forEach(r => islandsOf(r.mar).forEach(isl => { const [ix, iy] = pos(r, isl), d = Math.hypot(x - ix, y - iy); if (d < bd) { bd = d; best = { isl, r }; } }));
    return best;
  }
  const lim = v => Math.max(0.05, Math.min(0.95, v));
  function down(e, canvas) {
    const [x, y] = ponto(e, canvas), hit = ilhaEm(x, y);
    if (nova) { const r = rectEm(x, y); if (r && rects.length === 1) { criar(r.mar, lim((x - r.x) / r.w), lim((y - r.y) / r.h)); return; } }
    if (!hit) return;
    sel = hit.isl.id; tone(420, 0.05, 'triangle', 0.1); mesaDirty = true;
    if (isGM()) { drag = { id: hit.isl.id, r: hit.r, x0: x, y0: y, cx: hit.isl.cx, cy: hit.isl.cy, moved: false }; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* tudo bem */ } }
  }
  function move(e, canvas) {
    if (!drag) return; const [x, y] = ponto(e, canvas), isl = ISLAND[drag.id]; if (!isl) { drag = null; return; }
    if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) < 5) return; drag.moved = true;
    isl.cx = lim(drag.cx + (x - drag.x0) / drag.r.w); isl.cy = lim(drag.cy + (y - drag.y0) / drag.r.h);
  }
  function up() {
    if (!drag) return; const d = drag; drag = null; const isl = ISLAND[d.id]; if (!d.moved || !isl) return;
    salvar(d.id, { cx: +isl.cx.toFixed(3), cy: +isl.cy.toFixed(3) }); tone(300, 0.06, 'triangle', 0.1);
  }
  function salvar(id, patch) {
    const w = db.world; w.ilhas = Object.assign({}, w.ilhas || {}); w.ilhas[id] = Object.assign({}, w.ilhas[id] || {}, patch);
    commit('world', null, w); mesaDirty = true;
  }
  function criar(mar, cx, cy) {
    const id = 'ilha-' + uid(), R = artRng(hashStr(id)), n = ISLANDS.filter(i => i.nova).length + 1;
    salvar(id, { id, mar, nova: true, canon: false, nome: 'Ilha Nova ' + n, cx: +cx.toFixed(3), cy: +cy.toFixed(3), tema: 'vila', telhado: TELHADOS[Math.floor(R() * TELHADOS.length)], intro: 'Uma ilha ainda sem história. O Mestre conta como ela é.' });
    nova = false; sel = id; tone(620, 0.12, 'sine', 0.2); toast('Ilha criada. Dê um nome a ela no painel; arraste para mudar o lugar.');
  }
  function editar(id, patch) { const isl = ISLAND[id]; if (!isl) return; salvar(id, patch); }
  // Uma ilha nova só sai se ninguém estiver nela; uma do catálogo só volta para o lugar de origem
  function apagar(id) {
    const isl = ISLAND[id]; if (!isl || !isl.nova) return false;
    if (aqui(id).length || Object.values(db.ships).some(s => s.at === id || (s.travel && (s.travel.to === id || s.travel.from === id)))) { toast('Tem gente ou navio nessa ilha: leve-os para outro lugar antes.'); return false; }
    Object.keys(db.tokens).forEach(k => { if (db.tokens[k].isl === id) commit('tokens', k, null); });
    const w = db.world; w.ilhas = Object.assign({}, w.ilhas || {}); delete w.ilhas[id]; commit('world', null, w);
    if (db.islandCfg[id]) commit('islandCfg', id, null);
    sel = null; mesaDirty = true; toast(isl.nome + ' foi apagada.'); return true;
  }
  function voltarLugar(id) { const w = db.world; if (!w.ilhas || !w.ilhas[id] || ISLAND[id].nova) return; w.ilhas = Object.assign({}, w.ilhas); delete w.ilhas[id]; commit('world', null, w); mesaDirty = true; }
  const movida = id => !!(db.world.ilhas && db.world.ilhas[id] && !db.world.ilhas[id].nova);
  function setFoco(m) { foco = m && SEAS[m] ? m : null; nova = nova && !!foco; if (sel && ISLAND[sel] && foco && ISLAND[sel].mar !== foco) sel = null; try { if (foco) sessionStorage.setItem('mdm-foco', foco); else sessionStorage.removeItem('mdm-foco'); } catch (e) { /* tudo bem */ } }
  function attach(canvas) {
    const noMundo = () => scene === 'play' && stageMode() === 'world';
    canvas.addEventListener('pointerdown', e => { if (noMundo()) down(e, canvas); });
    canvas.addEventListener('pointermove', e => { if (noMundo()) move(e, canvas); });
    ['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { if (noMundo()) up(); else drag = null; }));
  }
  // Leva a tripulação do jogador para uma ilha: o navio atraca lá (e muda de mar, se for preciso)
  function inserir(charId, islId) {
    const c = db.chars[charId], isl = ISLAND[islId]; if (!c || !isl || c.gm) return;
    if (c.prisao) { c.prisao = null; }
    if (c.mar !== isl.mar) c.mar = isl.mar;
    commit('chars', c.id, c); ensureShip(c.faccao, c.mar, islId);
    const s = db.ships[shipKey(c)]; s.at = islId; s.travel = null; commit('ships', s.key, s);
    sysMsg(islId, c.nome + ' chega a ' + isl.nome + '.'); toast(c.nome + ' foi levado(a) para ' + isl.nome + '.');
  }
  return {
    draw, attach, inserir, criar, editar, apagar, voltarLugar, movida, TEMAS,
    get sel() { return sel; }, set sel(v) { sel = v; }, get pick() { return pick; }, set pick(v) { pick = v; },
    get foco() { return foco; }, set foco(v) { setFoco(v); }, get nova() { return nova; }, set nova(v) { nova = !!v && !!foco; },
    get arrastando() { return !!(drag && drag.moved); },
  };
})();
