// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// O Mundo: a visão do narrador. Os quatro mares lado a lado, com as ilhas e quem está em cada uma;
// dali o mestre escolhe uma ilha, abre o mapa dela ou leva um jogador para lá.
'use strict';
const World = (() => {
  let sel = null, pick = null, rects = [];
  const MARES = Object.keys(SEAS);
  const aqui = id => Object.values(db.chars).filter(c => !c.gm && !c.prisao && chanOf(c) === id);
  function layout(W, H) {
    const top = 56, base = 128, pad = 12, aw = W - pad * 2, ah = H - top - base;
    const wide = W >= H * 1.05, cols = wide ? 2 : 1, rows = wide ? 2 : 4, gap = 10, w = (aw - gap * (cols - 1)) / cols, h = (ah - gap * (rows - 1)) / rows;
    rects = MARES.map((mar, i) => ({ mar, x: pad + (i % cols) * (w + gap), y: top + Math.floor(i / cols) * (h + gap), w, h }));
  }
  const pos = (r, isl) => [r.x + isl.cx * r.w, r.y + isl.cy * r.h];
  function draw(g, W, H) {
    layout(W, H); g.fillStyle = canvasBg(); g.fillRect(0, 0, W, H);
    rects.forEach(r => {
      g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 14; g.drawImage(Travel.chart(r.mar, Math.round(r.w), Math.round(r.h)), r.x, r.y, r.w, r.h); g.restore();
      const rad = Math.max(10, Math.min(r.w, r.h) * 0.07);
      Object.values(db.ships).filter(s => s.mar === r.mar && s.travel).forEach(s => { const q = Travel.boatPos(s); drawBoat(g, r.x + q.x * r.w, r.y + q.y * r.h, 34, q.ang, s.fac === 'marinha' ? 'marinha' : 'pirata'); });
      islandsOf(r.mar).forEach(isl => {
        const [x, y] = pos(r, isl); Travel.islet(g, isl, x, y, rad, sel === isl.id);
        g.font = '600 12px Georgia, serif'; const tw = g.measureText(isl.nome).width + 10;
        g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = 1; g.fillRect(x - tw / 2, y + rad * 0.9, tw, 17); g.strokeRect(x - tw / 2, y + rad * 0.9, tw, 17);
        g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(isl.nome, x, y + rad * 0.9 + 9);
        const who = aqui(isl.id), shown = who.slice(0, 5);
        shown.forEach((c, i) => {
          const bx = x + (i - (shown.length - 1) / 2) * 20, by = y - rad * 1.15 - 8;
          g.fillStyle = c.faccao === 'marinha' ? NAVY : RED; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(bx, by, 9, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#fff'; g.font = '700 11px Segoe UI, sans-serif'; g.fillText((c.nome || '?')[0].toUpperCase(), bx, by + 1);
        });
        if (who.length > 5) { g.fillStyle = INK; g.font = '700 11px Segoe UI, sans-serif'; g.fillText('+' + (who.length - 5), x + 56, y - rad * 1.15 - 8); }
      });
      const nome = SEAS[r.mar].nome; g.font = 'italic bold 18px Georgia, serif'; const tw = g.measureText(nome).width + 22;
      g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = 2; g.fillRect(r.x + 10, r.y + 10, tw, 30); g.strokeRect(r.x + 10, r.y + 10, tw, 30);
      g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(nome, r.x + 21, r.y + 26);
    });
  }
  function click(e, canvas) {
    const b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top; let best = null, bd = 38;
    rects.forEach(r => islandsOf(r.mar).forEach(isl => { const [ix, iy] = pos(r, isl), d = Math.hypot(x - ix, y - iy); if (d < bd) { bd = d; best = isl.id; } }));
    if (best) { sel = best; tone(420, 0.05, 'triangle', 0.1); }
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
  return { draw, click, inserir, get sel() { return sel; }, set sel(v) { sel = v; }, get pick() { return pick; }, set pick(v) { pick = v; } };
})();
