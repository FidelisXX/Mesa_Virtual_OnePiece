// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// O mundo: contas locais, roleta de raças, viagem automática pela carta náutica, eventos do mar,
// mestre automático, comércio e treino. Tudo atrás de funções pequenas, prontas para trocar por Supabase e Gemini.
'use strict';

// ======================================================================================
// Contas (stand-in do login do Supabase): salvas neste navegador, senha com hash simples
// ======================================================================================
const Acc = (() => {
  const key = u => String(u || '').trim().toLowerCase();
  const hash = (u, p) => String(hashStr('mdm:' + key(u) + ':' + p));
  return {
    cur: () => (myAcc && G.accounts[myAcc]) || null,
    register(user, pass) {
      const k = key(user);
      if (k.length < 3) return 'O usuário precisa de ao menos 3 letras.';
      if (String(pass || '').length < 4) return 'A senha precisa de ao menos 4 caracteres.';
      if (G.accounts[k]) return 'Esse usuário já existe.';
      commit('accounts', k, { key: k, user: String(user).trim(), pass: hash(user, pass), roleta: null, created: Date.now() });
      return this.login(user, pass);
    },
    login(user, pass) {
      const a = G.accounts[key(user)];
      if (!a || a.pass !== hash(user, pass)) return 'Usuário ou senha incorretos.';
      myAcc = a.key; sessionStorage.setItem('mdm-acc', myAcc); return null;
    },
    logout() { myAcc = null; myId = null; sessionStorage.removeItem('mdm-acc'); sessionStorage.removeItem('mdm-me'); },
    chars: () => Object.values(db.chars).filter(c => c.acc === myAcc),
    // Roleta: uma vez por conta; cada raça rara tem roletaChance (1%) de sair
    spin() {
      const a = this.cur(); if (!a || a.roleta) return null;
      const r = rng(), ch = tune.roletaChance;
      a.roleta = { res: r < ch ? 'ancestral' : r < ch * 2 ? 'lunariano' : 'nada', ts: Date.now() }; commit('accounts', a.key, a); return a.roleta.res;
    },
    unlocked: () => { const a = Acc.cur(); return a && a.roleta && a.roleta.res !== 'nada' ? [a.roleta.res] : []; },
  };
})();

// ======================================================================================
// Mesas e convites: cada mesa tem o seu estado, o seu Mestre e um código de convite
// ======================================================================================
const Mesas = (() => {
  const ALFA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I/L, para ninguém errar ao ditar
  const novoCodigo = () => { for (let k = 0; k < 50; k++) { let c = ''; for (let i = 0; i < 6; i++) c += ALFA[Math.floor(rng() * ALFA.length)]; if (!Object.values(G.mesas).some(m => m.codigo === c)) return c; } return uid().slice(0, 6).toUpperCase(); };
  return {
    minhas: () => Object.values(G.mesas).filter(m => m.membros.includes(myAcc)).sort((a, b) => b.criada - a.criada),
    atual: () => (myMesa && G.mesas[myMesa]) || null,
    criar(nome) {
      const m = { id: uid(), codigo: novoCodigo(), nome: String(nome || '').trim().slice(0, 40) || 'Nossa mesa', owner: myAcc, membros: [myAcc], criada: Date.now() };
      commit('mesas', m.id, m); return m;
    },
    // entra por código (ou pelo código de um link); devolve a mesa ou um texto de erro
    entrar(codigo) {
      const cod = String(codigo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (cod.length !== 6) return 'O código de convite tem 6 letras e números.';
      const m = Object.values(G.mesas).find(x => x.codigo === cod); if (!m) return 'Nenhuma mesa com esse convite. Confira o código ou peça outro.';
      if (!m.membros.includes(myAcc)) { m.membros.push(myAcc); commit('mesas', m.id, m); }
      return m;
    },
    sair(m) { if (m.owner === myAcc) return 'Quem criou a mesa não pode sair dela; apague a mesa se quiser acabar com ela.'; m.membros = m.membros.filter(x => x !== myAcc); commit('mesas', m.id, m); return null; },
    // o endereço que o convidado abre: o do Wi-Fi (se o servidor estiver com --lan) ou o da própria página
    link: m => ((Net.sb && SB.siteUrl) || Net.urls[0] || (Net.on ? location.origin : '')) + '/?convite=' + m.codigo,
  };
})();

// ======================================================================================
// Carta náutica e viagem automática
// ======================================================================================
const Travel = (() => {
  const aspect = 0.62;
  const dist = (a, b) => Math.hypot(a.cx - b.cx, (a.cy - b.cy) * aspect);
  let sel = null, layout = { x: 0, y: 0, w: 1, h: 1 };
  const crewTab = s => { const m = me(); return !!m && (m.gm || shipKey(m) === s.key); };

  function duration(s, from, to) {
    let ms = dist(from, to) * tune.chartSecPerUnit * 1000;
    if (profOn(s.key, 'navegador')) ms *= tune.navegadorMul;
    ms *= Math.max(0.3, 1 - (s.velas || 0) * tune.velaMul);
    return Math.max(4000, Math.round(ms));
  }
  function foodNeed(s, from, to) {
    let n = Math.max(1, Math.ceil(dist(from, to) * tune.foodPerUnit));
    if (profOn(s.key, 'cozinheiro')) n = Math.max(1, Math.ceil(n / 2));
    return n;
  }
  const progress = s => {
    const t = s.travel; if (!t) return 0;
    const end = t.paused ? t.paused.since : Date.now();
    return clamp((end - t.start - t.lost) / t.dur, 0, 1);
  };
  const eta = s => { const t = s.travel; return t ? Math.max(0, Math.round(t.dur * (1 - progress(s)) / 1000)) : 0; };

  function start(s, toId) {
    if (!s || s.travel || !s.at) return; const from = ISLAND[s.at], to = ISLAND[toId];
    if (!to || to.id === from.id || to.mar !== s.mar) return;
    const need = foodNeed(s, from, to);
    if (s.comida < need) { toast('Comida insuficiente: a viagem pede ' + need + ' e o navio tem ' + s.comida + '. Compre no comércio.'); return; }
    if (s.casco <= 0) { toast('O casco está destruído: conserte o navio no comércio.'); return; }
    s.comida -= need; const dur = duration(s, from, to);
    s.travel = { from: from.id, to: to.id, start: Date.now(), dur, lost: 0, paused: null, evAt: (db.world.auto && rng() < tune.eventChance) ? tune.eventAtMin + rng() * (tune.eventAtMax - tune.eventAtMin) : null, evDone: false };
    s.at = null; commit('ships', s.key, s);
    sysMsg(from.id, shipName(s) + ' zarpa de ' + from.nome + ' rumo a ' + to.nome + ' (' + Math.round(dur / 1000) + ' s, ' + need + ' de comida).');
    sysMsg('navio-' + s.key, 'Zarpamos para ' + to.nome + '. O mar nos leva: a viagem é automática.');
    sel = null; mesaDirty = true;
  }
  function arrive(s) {
    const to = ISLAND[s.travel.to]; s.at = to.id; s.travel = null; commit('ships', s.key, s);
    sysMsg(to.id, shipName(s) + ' atraca em ' + to.nome + '.'); tone(880, 0.25, 'sine', 0.3); setTimeout(() => tone(660, 0.4, 'sine', 0.25), 180);
    // profissões que ajudam ao chegar
    crewOf(s.key).forEach(c => {
      if (profOn(s.key, 'cozinheiro') && c.st < c.stMax) c.st = Math.min(c.stMax, c.st + roll(6) + 1);
      if (profOn(s.key, 'medico') && c.hp < c.hpMax) c.hp = Math.min(c.hpMax, c.hp + roll(6) + 1);
      commit('chars', c.id, c); syncPc(c);
    });
    if (profOn(s.key, 'cozinheiro')) sysMsg(to.id, 'O cozinheiro serve uma refeição quente: a tripulação recupera Energia.');
    if (profOn(s.key, 'medico')) sysMsg(to.id, 'O médico cuida dos ferimentos: a tripulação recupera Vida.');
    Master.arrival(to.id, s);
  }
  function pause(s) { s.travel.paused = { since: Date.now() }; commit('ships', s.key, s); }
  function resume(s) { if (s.travel && s.travel.paused) { s.travel.lost += Date.now() - s.travel.paused.since; s.travel.paused = null; commit('ships', s.key, s); } }

  let acc = 0;
  function tick(dt) {
    acc += dt; if (acc < 0.4) return; acc = 0;
    Object.values(db.ships).forEach(s => {
      const t = s.travel; if (!t || t.paused || !crewTab(s)) return;
      const p = progress(s);
      if (t.evAt != null && !t.evDone && p >= t.evAt) { t.evDone = true; commit('ships', s.key, s); Events.random(s); return; }
      if (p >= 1) arrive(s);
    });
  }
  function boatPos(s) { // posição do barco na carta (0 a 1)
    const t = s.travel, a = ISLAND[t ? t.from : s.at], b = t ? ISLAND[t.to] : a, p = t ? progress(s) : 0;
    return { x: a.cx + (b.cx - a.cx) * p, y: a.cy + (b.cy - a.cy) * p, ang: Math.atan2((b.cy - a.cy) * aspect, b.cx - a.cx) };
  }

  // ---- A carta desenhada ----
  const bgCache = {};
  function chart(mar, W, H) {
    const k = mar + W + 'x' + H; if (bgCache[k]) return bgCache[k];
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = artRng(hashStr(mar));
    g.fillStyle = PARCH; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 36; i++) { const x = R() * W, y = R() * H, r = 40 + R() * 160, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(150,110,60,${0.05 + R() * 0.07})`); gr.addColorStop(1, 'rgba(150,110,60,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.fillStyle = SEAS[mar].cor + '22'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(52,96,112,.5)'; g.lineWidth = 1.6;
    for (let y = 20; y < H; y += 26) for (let x = ((y / 26) % 2) * 28; x < W; x += 74) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 6, x + 16, y); g.quadraticCurveTo(x + 24, y + 6, x + 32, y); g.stroke(); }
    // meridianos e paralelos sépia
    g.strokeStyle = 'rgba(110,80,45,.28)'; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= W; x += W / 10) { g.moveTo(x, 0); g.lineTo(x, H); } for (let y = 0; y <= H; y += H / 6) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke();
    drawCompass(g, W - 90, H - 90, 54);
    g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(4, 4, W - 8, H - 8);
    return (bgCache[k] = cv);
  }
  function islet(g, isl, x, y, r, docked) {
    const R = artRng(hashStr(isl.id)); g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(43,33,24,.25)'; g.beginPath(); g.ellipse(4, 6, r * 1.15, r * 0.7, 0, 0, 7); g.fill();
    g.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, rr = r * (0.85 + R() * 0.3); const px = Math.cos(a) * rr * 1.15, py = Math.sin(a) * rr * 0.72; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath();
    g.fillStyle = isl.tema === 'base' ? '#cfd8e6' : isl.tema === 'navio' ? '#c99c62' : '#a9cf7c'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
    const roof = '#' + (isl.telhado || 0xc4472f).toString(16).padStart(6, '0'), n = isl.tema === 'cidade' ? 5 : 3;
    for (let i = 0; i < n; i++) { const hx = (R() - 0.5) * r * 1.2, hy = (R() - 0.5) * r * 0.5; g.fillStyle = '#f7efd6'; g.fillRect(hx - 5, hy - 3, 10, 8); g.strokeRect(hx - 5, hy - 3, 10, 8); g.fillStyle = roof; g.beginPath(); g.moveTo(hx - 7, hy - 3); g.lineTo(hx, hy - 10); g.lineTo(hx + 7, hy - 3); g.closePath(); g.fill(); g.stroke(); }
    if (isl.tema === 'base') { g.fillStyle = NAVY; g.fillRect(-2, -r * 0.7, 3, 14); g.fillRect(1, -r * 0.7, 12, 7); }
    if (docked) { g.strokeStyle = '#d8a21a'; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 1.05, 0, 0, 7); g.stroke(); g.setLineDash([]); }
    g.restore();
  }
  function draw(g, W, H, key) {
    const s = db.ships[key]; if (!s) return;
    const top = 64, bottom = 84, pad = 24; layout = { x: pad, y: top, w: W - pad * 2, h: H - top - bottom };
    g.fillStyle = canvasBg(); g.fillRect(0, 0, W, H);
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 20; g.drawImage(chart(s.mar, layout.w, layout.h), layout.x, layout.y); g.restore();
    const P = (cx, cy) => [layout.x + cx * layout.w, layout.y + cy * layout.h];
    // rota
    const t = s.travel, dest = t ? ISLAND[t.to] : sel ? ISLAND[sel] : null, orig = t ? ISLAND[t.from] : s.at ? ISLAND[s.at] : null;
    if (dest && orig) { const a = P(orig.cx, orig.cy), b = P(dest.cx, dest.cy); g.save(); g.setLineDash([3, 9]); g.lineCap = 'round'; g.lineWidth = 4; g.strokeStyle = t ? (s.fac === 'marinha' ? NAVY : RED) : 'rgba(43,33,24,.7)'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); }
    islandsOf(s.mar).forEach(isl => {
      const [x, y] = P(isl.cx, isl.cy), here = s.at === isl.id; islet(g, isl, x, y, Math.min(layout.w, layout.h) * 0.055, here || sel === isl.id);
      const fs = 15; g.font = `600 ${fs}px Georgia, serif`; const label = isl.nome + (isl.canon === false ? ' (original)' : ''), tw = g.measureText(label).width + 14;
      g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = 1; g.fillRect(x - tw / 2, y + 26, tw, 22); g.strokeRect(x - tw / 2, y + 26, tw, 22);
      g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x, y + 37);
    });
    // o barco
    const bp = boatPos(s), [bx, by] = P(bp.x, bp.y), by2 = t ? by : by - 30;
    drawBoat(g, bx, by2 - (t ? 0 : 0), 56, t ? bp.ang : -0.3, s.fac === 'marinha' ? 'marinha' : 'pirata');
    // outros navios do mesmo mar
    Object.values(db.ships).filter(o => o.key !== s.key && o.mar === s.mar).forEach(o => { const q = boatPos(o), [ox, oy] = P(q.x, q.y); drawBoat(g, ox + 18, o.travel ? oy : oy + 30, 40, o.travel ? q.ang : 0.3, o.fac === 'marinha' ? 'marinha' : 'pirata'); });
    // título do mar
    const label = SEAS[s.mar].nome; g.font = 'italic bold 30px Georgia, serif'; const tw = g.measureText(label).width + 40;
    g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = 3; g.fillRect(layout.x + 14, layout.y + 12, tw, 46); g.strokeRect(layout.x + 14, layout.y + 12, tw, 46);
    g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, layout.x + 34, layout.y + 36);
  }
  function click(e, canvas, s) {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = islandsOf(s.mar).find(i => Math.hypot(x - (layout.x + i.cx * layout.w), y - (layout.y + i.cy * layout.h)) < 40);
    if (hit && !s.travel) { sel = hit.id === s.at ? null : hit.id; mesaDirty = true; tone(400, 0.05, 'triangle', 0.1); }
  }
  return { dist, duration, foodNeed, progress, eta, start, arrive, pause, resume, tick, draw, click, boatPos, chart, islet, get sel() { return sel; }, set sel(v) { sel = v; } };
})();

// ======================================================================================
// Eventos do mar: clima (as profissões decidem) e briga naval. O mestre humano ou o automático sorteia.
// ======================================================================================
const Events = (() => {
  const CLIMA = {
    tempestade: { nome: 'Tempestade', cd: 4, txt: 'O céu fecha em segundos. Ondas altas varrem o convés e o vento uiva nas velas.', fail: 'dano', dmg: 2 },
    ventania:   { nome: 'Ventania', cd: 2, txt: 'Um vento forte e traiçoeiro vira de lado e puxa o navio para fora da rota.', fail: 'dano', dmg: 1 },
    nevoeiro:   { nome: 'Nevoeiro', cd: 0, txt: 'Uma neblina espessa engole o mar. Ninguém enxerga a própria proa.', fail: 'atraso' },
    calmaria:   { nome: 'Calmaria', cd: -2, txt: 'O vento morre. As velas pendem e o mar vira vidro.', fail: 'comida' },
    corrente:   { nome: 'Corrente favorável', cd: 0, txt: 'Uma corrente quente corre na direção da rota. Com um bom leme, ela empurra o navio.', fail: 'nada', bom: true },
  };
  // quem rola: o melhor da tripulação para o mar (Navegador, depois Timoneiro, depois maior TEC)
  function helmsman(s) {
    const crew = crewOf(s.key); if (!crew.length) return null;
    const score = c => attr(c, 'TEC') + (c.prof === 'navegador' ? 3 : c.prof === 'timoneiro' ? 2 : 0) + ((RACES[c.raca] || {}).evento || 0);
    return crew.slice().sort((a, b) => score(b) - score(a))[0];
  }
  const deck = s => 'navio-' + s.key;
  function clima(s, kind) {
    const e = CLIMA[kind] || CLIMA.ventania; if (!s.travel) return; Travel.pause(s);
    sysMsg(deck(s), e.nome + '! ' + e.txt); const m = Master.cls(s);
    const h = helmsman(s), bonus = h ? attr(h, 'TEC') + (h.prof === 'navegador' ? 3 : h.prof === 'timoneiro' ? 2 : 0) + ((RACES[h.raca] || {}).evento || 0) : 0, cd = tune.climaCD + e.cd + Math.floor(m.lvMed / 8);
    const r = rolarD20(bonus, 'normal'); r.label = e.nome + ': teste do mar'; r.cd = cd; postRollTo(deck(s), h ? h.nome : 'A tripulação', r, { fac: s.fac });
    if (r.total >= cd) {
      if (e.bom) { s.travel.lost -= Math.round(s.travel.dur * 0.15); sysMsg(deck(s), 'O leme acerta a corrente: a viagem encurta.'); }
      else sysMsg(deck(s), (h ? h.nome : 'A tripulação') + ' leva o navio pela ' + e.nome.toLowerCase() + ' sem estragos.');
    } else if (e.fail === 'dano') { const d = roll(tune.climaDano) * e.dmg; s.casco = Math.max(0, s.casco - d); sysMsg(deck(s), 'O navio apanha: −' + d + ' de Casco (' + s.casco + '/' + s.cascoMax + ').'); }
    else if (e.fail === 'atraso') { s.travel.lost += Math.round(s.travel.dur * 0.2); sysMsg(deck(s), 'A tripulação perde o rumo e a viagem atrasa.'); }
    else if (e.fail === 'comida') { s.comida = Math.max(0, s.comida - 2); sysMsg(deck(s), 'Sem vento, a viagem se arrasta e a comida acaba mais rápido (−2).'); }
    commit('ships', s.key, s); Travel.resume(s);
  }
  function bau(s) {
    Travel.pause(s); const money = Math.round(60 * (1 + Master.cls(s).lvMed / 3) * (0.7 + rng() * 0.6)), c = crewOf(s.key)[0];
    sysMsg(deck(s), 'Um baú boia à deriva! Dentro, ' + money + ' Berries encharcados.'); crewOf(s.key).forEach(x => { x.berries = (x.berries || 0) + Math.round(money / Math.max(1, crewOf(s.key).length)); commit('chars', x.id, x); }); Travel.resume(s);
  }
  function naufrago(s) {
    Travel.pause(s); const lv = Master.cls(s).lvMed; sysMsg(deck(s), 'Um náufrago agarrado a uma tábua pede ajuda. A tripulação o resgata e ele conta histórias do mar.');
    crewOf(s.key).forEach(x => { addXp(x, Math.round(tune.xpPerNpcLv * lv)); addRep(x, 2); }); Travel.resume(s);
  }
  function naval(s, diff) {
    Travel.pause(s); const m = Master.cls(s), d = diff || Master.difficulty(m.lvMed);
    const kind = d === 'facil' ? 'pescador' : d === 'dificil' ? (s.fac === 'marinha' ? 'rival' : 'patrulha') : (s.fac === 'marinha' ? 'rival' : 'patrulha');
    const count = d === 'dificil' ? 2 : 1;
    sysMsg(deck(s), 'Velas à vista! ' + Master.text('naval', d) + ' (' + { facil: 'luta fácil', moderada: 'luta moderada', dificil: 'luta difícil' }[d] + ')');
    Fight3D.start(s.key, { enemy: kind, count, lv: m.lvMed + (d === 'facil' ? -2 : d === 'dificil' ? 4 : 0) });
  }
  function random(s) {
    const r = rng();
    if (r < tune.eventNaval) return naval(s);
    const kinds = ['tempestade', 'ventania', 'nevoeiro', 'calmaria', 'corrente'], q = rng();
    if (q < 0.12) return bau(s); if (q < 0.2) return naufrago(s);
    clima(s, kinds[Math.floor(rng() * kinds.length)]);
  }
  return { CLIMA, clima, naval, bau, naufrago, random, helmsman };
})();

// ======================================================================================
// Narrador de IA: fala com o servidor local (server/narrador.js), que guarda a chave do Gemini
// ======================================================================================
const Ia = (() => {
  let on = false, modelo = '', mock = false, erro = 'ainda não verificado', last = 0;
  const DEF = /^https?:$/.test(location.protocol) ? location.origin : 'http://127.0.0.1:8787';
  const base = () => { try { return (localStorage.getItem('mdm-ia-url') || DEF).replace(/\/$/, ''); } catch (e) { return DEF; } };
  const setBase = u => { try { localStorage.setItem('mdm-ia-url', u || DEF); } catch (e) { /* tudo bem */ } last = 0; };
  async function check() {
    last = Date.now();
    try { const r = await fetch(base() + '/saude', { signal: AbortSignal.timeout(2500) }), j = await r.json(); on = !!j.ok; modelo = j.modelo || ''; mock = !!j.mock; erro = j.ok ? '' : 'o servidor está no ar, mas sem a chave do Gemini'; }
    catch (e) { on = false; erro = 'servidor do narrador fora do ar'; }
    return on;
  }
  async function narrar(ctx) {
    const h = { 'Content-Type': 'application/json' };
    if (typeof Net !== 'undefined' && Net.sb) { try { h.Authorization = 'Bearer ' + await SB.token(); h['x-mesa'] = myMesa || ''; } catch (e) { /* sem sessão: o servidor recusa */ } }
    const r = await fetch(base() + '/narrar', { method: 'POST', headers: h, body: JSON.stringify(ctx), signal: AbortSignal.timeout(90000) });
    const j = await r.json(); if (!r.ok) throw new Error(j.erro || 'HTTP ' + r.status); return j;
  }
  // A chave vai do jogo só para o servidor local (que a guarda na memória e, se pedido, em server/.env); ela nunca é guardada no navegador
  async function salvar(corpo) {
    const r = await fetch(base() + '/chave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(6000) });
    const j = await r.json(); if (!r.ok) throw new Error(j.erro || 'HTTP ' + r.status); return j;
  }
  // Uma chamada mínima ao Gemini, para ver se a chave, o modelo e a rede funcionam de verdade
  async function testar() {
    const r = await fetch(base() + '/teste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30000) });
    return r.json();
  }
  return { check, narrar, salvar, testar, base, setBase, get on() { return on; }, get modelo() { return modelo; }, get mock() { return mock; }, get erro() { return erro; }, get last() { return last; } };
})();

// ======================================================================================
// Mestre automático: a mesma interface que o Gemini usaria (contexto entra, texto e luta saem)
// ======================================================================================
const Master = (() => {
  let thinking = false;
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const TXT = {
    chegada: {
      vila:   ['O cais range sob as botas. Crianças correm entre as redes secas e um cheiro de pão sobe da colina.', 'A vila acorda devagar: galinhas, um sino distante e olhares curiosos para o navio recém-chegado.'],
      cidade: ['Ruas estreitas, vozes de mercado e vendedores gritando preços. A cidade nunca para, e você sente que também está sendo vigiado.', 'A multidão se abre e fecha como a maré. Entre os toldos coloridos, alguém acompanha o seu navio com atenção demais.'],
      base:   ['Bandeiras azuis tremulam no alto do muro. Soldados perfilados vigiam o porto, e cada passo ecoa no pátio de pedra.', 'A Marinha domina esta ilha: o cais é limpo, as ordens são secas e ninguém sorri sem motivo.'],
      navio:  ['O restaurante flutuante balança suave. Panelas, gritos de cozinha e um aroma que desperta fome até em quem acabou de comer.', 'Garçons desviam de marujos famintos enquanto o chef berra pedidos em tom de comando.'],
    },
    naval: {
      facil: ['Um barco pequeno e remendado se aproxima, mais curioso do que ameaçador.', 'Uma vela desbotada surge ao longe: parece apenas um pesqueiro com ideias demais.'],
      moderada: ['Uma bandeira se ergue no horizonte e os canhões do outro navio giram devagar na sua direção.', 'Um navio de guerra corta as ondas e vira o costado para a sua proa.'],
      dificil: ['Dois navios fecham o cerco, um de cada lado, e o vento traz o som de canhões sendo carregados.', 'O mar escurece com a sombra de um navio enorme, escoltado por outro, e a bandeira deles não promete misericórdia.'],
    },
    luta: {
      facil: ['Dois arruaceiros bloqueiam a rua principal, mais barulhentos do que perigosos.', 'Uma dupla de valentões testa a paciência de quem passa pelo cais.'],
      moderada: ['Um grupo armado cerca a praça e exige que os forasteiros se identifiquem.', 'Homens de cara fechada saem das sombras e puxam as armas ao mesmo tempo.'],
      dificil: ['Uma figura temida caminha pela rua e todos a evitam. Atrás dela, capangas fortes esperam um sinal.', 'O chão treme: alguém muito mais forte que todos os outros acaba de chegar à ilha, e vem direto até você.'],
    },
  };
  const text = (tipo, diff, tema) => pick(tipo === 'chegada' ? TXT.chegada[tema] || TXT.chegada.vila : TXT[tipo][diff]);
  // Classifica a tripulação para escalar a luta
  function cls(s) { const cr = crewOf(s.key); const lvs = cr.map(c => c.lv); return { n: cr.length, lvMed: lvs.length ? Math.round(lvs.reduce((a, b) => a + b, 0) / lvs.length) : 1, lvMax: lvs.length ? Math.max(...lvs) : 1 }; }
  function difficulty(lv) { const r = rng(); return r < 0.3 ? 'facil' : r < 0.8 ? 'moderada' : 'dificil'; }
  // a interface que o Gemini também teria: ask({ tipo, ilha, nivelMedio, faccao }) → { texto, encontro:[{kind, lv}] }
  function ask(ctx) {
    const d = difficulty(ctx.nivelMedio), tema = ctx.ilha ? ctx.ilha.tema : 'vila', lv = ctx.nivelMedio;
    const pirata = ctx.faccao === 'pirata', baseIsl = isBase(ctx.ilha);
    const mk = (k, l) => ({ kind: k, lv: Math.max(1, l) });
    let enc = [];
    if (d === 'facil') enc = [mk(pirata ? 'marujo' : 'bandido', lv - 2), mk(pirata ? 'marujo' : 'bandido', lv - 2)];
    else if (d === 'moderada') enc = [mk(pirata ? 'marujo' : 'bandido', lv), mk(pirata ? 'marujo' : 'bandido', lv), mk(pirata ? 'oficial' : 'rival', lv)];
    else enc = [mk(pirata ? 'oficial' : 'rival', lv + 4), mk(pirata ? 'marujo' : 'bandido', lv + 1), mk(pirata ? 'marujo' : 'bandido', lv + 1)];
    if (baseIsl && pirata) enc = enc.map(e => ({ ...e, kind: e.kind === 'bandido' ? 'marujo' : e.kind }));
    return { texto: text('luta', d, tema), dificuldade: d, encontro: enc };
  }
  function say(ch, txt, ask, asks, extra) { commit('msgs', null, Object.assign({ id: uid(), ts: Date.now(), ch, uid: 'mestre', nome: extra && extra.ia ? 'Narrador IA' : 'Mestre automático', tipo: 'narra', txt, ask: ask || undefined, asks: asks && asks.length ? asks : undefined }, extra || {})); }
  // O mestre automático responde ao que o jogador faz (na interface que a IA também teria): texto entra, narração e pedido de teste saem
  const DET = {
    vila: ['Há pegadas frescas na terra perto do cais.', 'Uma criança observa você de longe e some atrás de um barril.', 'Redes de pesca remendadas à pressa, como se alguém tivesse fugido.'],
    cidade: ['Um homem de capa evita o seu olhar e muda de calçada.', 'Cartazes de procurado cobrem uma parede inteira, alguns rasgados.', 'O barulho do mercado esconde uma conversa baixa atrás de uma barraca.'],
    base: ['As sentinelas trocam de posto com precisão de relógio.', 'Há uma janela aberta no segundo andar do quartel, sem ninguém à vista.', 'O estandarte azul bate forte no vento; ninguém aqui está distraído.'],
    navio: ['O cheiro de molho vem da cozinha, e dali ouvem-se gritos de pedidos.', 'Um garçom desvia de três cozinheiros e entrega um prato sem derramar nada.', 'Perto do convés há uma mesa vazia, reservada com um bilhete misterioso.'],
  };
  const INTENTS = [
    { k: 'luta', re: /(atac|luto|lutar|enfrent|procuro briga|procura briga|desafio|puxo a|puxa a)/i },
    { k: 'olhar', re: /(olh|procur|investig|examin|vasculh|observ|inspeciona|escuta)/i, attr: 'ESP', t: ['Você examina tudo com calma.', 'Seus olhos percorrem o lugar atrás de qualquer detalhe fora do lugar.'] },
    { k: 'conversar', re: /(fal[ao]|convers|pergunt|negoci|convenc|persuad|cumprimenta|chama|puxa conversa|\bol[aá]\b|\boi\b|bom dia|boa tarde|boa noite|\be a[ií]\b|quem )/i, attr: 'CAR', t: ['Você se aproxima e puxa assunto.', 'Alguém por perto parece disposto a ouvir, mas ainda desconfia.'] },
    { k: 'furtivo', re: /(esgueir|escond|furtiv|sorrate|rouba|fuj|corr[eo]|escal)/i, attr: 'AGI', t: ['Você escolhe o caminho mais discreto, longe das luzes.', 'Cada passo é medido, e a sombra ajuda.'] },
    { k: 'forca', re: /(empurr|quebr|arromb|levant|carreg|forç|derrub|trancad)/i, attr: 'FOR', t: ['Você apoia o corpo e testa a resistência do que está na frente.', 'A madeira range sob o seu peso, e algo cede aos poucos.'] },
    { k: 'tecnica', re: /(conserta|monta|improvis|desarm|decifr|navega|constr)/i, attr: 'TEC', t: ['Suas mãos trabalham com cuidado, peça por peça.', 'Você estuda o mecanismo antes de mexer em qualquer coisa.'] },
    { k: 'descanso', re: /(descans|durm|relax)/i },
    { k: 'loja', re: /(compr|vend|loja|mercad)/i },
  ];
  const pick2 = a => a[Math.floor(rng() * a.length)];
  const FALA = ['Algumas cabeças se viram na sua direção. A conversa em volta diminui um instante e logo volta, mais baixa.', 'Quem estava por perto pesa as palavras antes de responder. Ninguém parece ter pressa.', 'A sua voz atravessa o lugar. Alguém sorri de canto, alguém finge não ter ouvido.', 'Uma resposta vem de trás de você, curta e sem muita simpatia.'];
  // O que os jogadores escreveram desde a última fala do narrador neste lugar
  function lastNarr(ch) { for (let i = db.msgs.length - 1; i >= 0; i--) { const m = db.msgs[i]; if (m.ch === ch && m.uid === 'mestre') return m.ts; } return 0; }
  function pending(ch) { const t0 = lastNarr(ch); return db.msgs.filter(m => m.ch === ch && m.ts > t0 && (m.tipo === 'fala' || m.tipo === 'acao') && db.chars[m.uid] && !db.chars[m.uid].gm); }
  const limpaTxt = t => String(t || '').replace(/\{[#a-z0-9]+\|/gi, '').replace(/\(\(|\)\)/g, '').replace(/[*_~{}|]/g, '').trim().slice(0, 500);
  // O que a IA recebe: o lugar, quem está na cena, a conversa anterior e só o que é novo
  function montarCtx(ch, msgs) {
    const isl = ISLAND[ch], aqui = whoIn(ch).filter(x => !x.gm), sh = isDeck(ch) ? db.ships[ch.slice(6)] : null, t0 = msgs[0].ts;
    const lvs = aqui.map(x => x.lv), nivelMedio = lvs.length ? Math.round(lvs.reduce((a, b) => a + b, 0) / lvs.length) : 1;
    return {
      lugar: isl ? { nome: isl.nome, mar: SEAS[isl.mar].nome, tema: isl.tema, descricao: isl.intro } : { nome: 'Convés do navio', mar: sh ? SEAS[sh.mar].nome : '', tema: 'navio no mar', descricao: sh && sh.travel ? 'Viajando para ' + ISLAND[sh.travel.to].nome : '' },
      nivelMedio, jogadores: aqui.map(c => ({ nome: c.nome, raca: RACES[c.raca].nome, classe: CLASSES[c.classe].nome, profissao: PROFS[c.prof].nome, lado: c.faccao, nivel: c.lv, vida: c.hp + '/' + c.hpMax })),
      historico: db.msgs.filter(m => m.ch === ch && m.ts < t0 && (m.tipo === 'fala' || m.tipo === 'acao' || m.tipo === 'narra')).slice(-10).map(m => ({ quem: m.uid === 'mestre' ? 'Narrador' : m.nome, texto: limpaTxt(m.txt) })),
      novas: msgs.map(m => ({ quem: m.nome, tipo: m.tipo, texto: limpaTxt(m.txt) })),
    };
  }
  function aplicarIa(ch, r) {
    const aqui = whoIn(ch).filter(x => !x.gm), porNome = n => aqui.find(x => norm(x.nome) === norm(n)) || aqui.find(x => norm(x.nome).split(' ')[0] === norm(n).split(' ')[0]);
    const asks = (r.testes || []).map(t => { const p = porNome(t.jogador); return p ? { attr: t.atributo, cd: t.cd, who: p.id, nome: p.nome, motivo: t.motivo } : null; }).filter(Boolean);
    say(ch, r.narracao, null, asks, { ia: true, uso: r.uso || 0 });
    if (r.luta && isIsland(ch)) {
      later(1.2, () => { r.luta.inimigos.forEach(e => Combat.spawnNpc(ch, e.tipo, e.nivel)); later(1.4, () => { if (!(db.combat[ch] && db.combat[ch].on)) Combat.start(ch); }); });
    }
  }
  // Chamar o narrador: com o servidor de IA no ar, uma chamada lê tudo e responde; senão, a tabela responde
  function call(c, ch) {
    if (!db.world.auto || !c || c.gm || !(isIsland(ch) || isDeck(ch)) || thinking) return;
    const msgs = pending(ch); if (!msgs.length) { toast('Nada novo para o narrador ler. Escreva o que seu personagem faz ou diz e chame de novo.'); return; }
    if (!Ia.on) { callTabela(c, ch); return; }
    thinking = true;
    Ia.narrar(montarCtx(ch, msgs)).then(r => aplicarIa(ch, r)).catch(e => { toast('A IA falhou (' + e.message + '). O narrador de tabela responde.'); Ia.check(); callTabela(c, ch); }).finally(() => { thinking = false; });
  }
  // A tabela: a reserva de quando a IA não está no ar. Lê tudo de uma vez e responde a todos.
  function callTabela(c, ch) {
    if (!db.world.auto || !c || c.gm || !(isIsland(ch) || isDeck(ch))) return;
    const msgs = pending(ch); if (!msgs.length) { toast('Nada novo para o narrador ler. Escreva o que seu personagem faz ou diz e chame de novo.'); return; }
    const porJogador = new Map(); msgs.forEach(m => { const a = porJogador.get(m.uid) || []; a.push(m); porJogador.set(m.uid, a); });
    const isl = ISLAND[ch], tema = isl ? isl.tema : 'vila', partes = [], asks = []; let luta = null;
    porJogador.forEach((lista, id) => {
      const ch2 = db.chars[id], cd = tune.cdMedia + Math.floor(ch2.lv / 10), its = [];
      lista.forEach(m => { const t = String(m.txt || '').replace(/[*_~{}|\[\]()]/g, ''), x = INTENTS.find(i => i.re.test(t)); if (x && !its.includes(x)) its.push(x); });
      if (!its.length) { partes.push('**' + ch2.nome + '**: ' + pick2(FALA)); asks.push({ attr: 'CAR', cd, who: id, nome: ch2.nome }); return; }
      its.slice(0, 2).forEach(it => {
        if (it.k === 'luta') { luta = luta || ch2; partes.push('**' + ch2.nome + '** parte para cima de alguém, e o clima da cena muda de uma vez.'); return; }
        if (it.k === 'descanso') { partes.push('**' + ch2.nome + '** aproveita um instante de descanso.'); return; }
        if (it.k === 'loja') { partes.push('**' + ch2.nome + '** olha as barracas. O comércio está aberto (aba Mesa).'); return; }
        partes.push('**' + ch2.nome + '**: ' + pick2(it.t) + (it.k === 'olhar' ? ' ' + pick2(DET[tema] || DET.vila) : ''));
        asks.push({ attr: it.attr, cd, who: id, nome: ch2.nome });
      });
    });
    const abre = porJogador.size > 1 ? 'O narrador lê o que cada um fez e a cena se mexe ao mesmo tempo.' : 'O narrador lê o que você fez.';
    later(0.8, () => {
      say(ch, abre + '\n\n' + partes.join('\n\n'), null, asks);
      if (luta && isl) {
        const r = ask({ ilha: isl, nivelMedio: Math.max(1, luta.lv), faccao: luta.faccao });
        later(1.2, () => { say(ch, r.texto + ' (' + { facil: 'luta fácil', moderada: 'luta moderada', dificil: 'luta difícil' }[r.dificuldade] + ')'); r.encontro.forEach(e => Combat.spawnNpc(ch, e.kind, e.lv)); later(1.4, () => { if (!(db.combat[ch] && db.combat[ch].on)) Combat.start(ch); }); });
      }
    });
  }
  const pendingCount = ch => pending(ch).length;
  function arrival(islId, s) {
    if (!db.world.auto) return; const isl = ISLAND[islId], c = cls(s);
    say(islId, '**' + isl.nome + '.** ' + text('chegada', null, isl.tema));
    if (rng() >= tune.autoEncounter) return;
    const r = ask({ ilha: isl, nivelMedio: c.lvMed, faccao: s.fac });
    later(1.2, () => {
      say(islId, r.texto + ' (' + { facil: 'luta fácil', moderada: 'luta moderada', dificil: 'luta difícil' }[r.dificuldade] + ')');
      r.encontro.forEach(e => Combat.spawnNpc(islId, e.kind, e.lv));
      later(1.6, () => { if (!(db.combat[islId] && db.combat[islId].on) && whoIn(islId).some(x => !x.gm)) Combat.start(islId); });
    });
  }
  return { ask, say, call, pendingCount, arrival, text, cls, difficulty, get thinking() { return thinking; } };
})();

// ======================================================================================
// Comércio de cada ilha, descanso e treino AFK
// ======================================================================================
const Shop = (() => {
  const mod = isl => 0.85 + (Math.abs(hashStr(isl)) % 36) / 100; // 0,85 a 1,20 conforme a ilha
  const price = (isl, base) => Math.max(1, Math.round(base * mod(isl)));
  const items = (c, s, isl) => {
    const carp = profOn(s.key, 'carpinteiro') ? 1 - tune.carpDiscount : 1, falta = s.cascoMax - s.casco;
    return [
      { k: 'comida', nome: 'Comida (5 porções)', pr: price(isl, tune.priceFood * 5), nota: 'No navio: ' + s.comida, ok: true },
      { k: 'reparo', nome: 'Reparo do casco (completo)', pr: Math.round(price(isl, tune.priceRepair) * falta * carp), nota: 'Casco ' + s.casco + '/' + s.cascoMax + (carp < 1 ? ' · desconto do Carpinteiro' : ''), ok: falta > 0 },
      { k: 'curativo', nome: 'Curativo (metade da Vida)', pr: price(isl, tune.priceHeal), nota: 'Vida ' + c.hp + '/' + c.hpMax, ok: c.hp < c.hpMax },
      { k: 'refeicao', nome: 'Refeição (metade da Energia)', pr: price(isl, tune.priceFood * 3), nota: 'Energia ' + c.st + '/' + c.stMax, ok: c.st < c.stMax },
      { k: 'canhao', nome: 'Canhão extra em cada bordo', pr: price(isl, tune.priceCannon), nota: 'Canhões por bordo: ' + s.canhoes + '/' + tune.cannonMax, ok: s.canhoes < tune.cannonMax },
      { k: 'velas', nome: 'Velas melhores (viagem mais curta)', pr: price(isl, tune.priceSails), nota: 'Nível ' + (s.velas || 0) + '/' + tune.sailsMax, ok: (s.velas || 0) < tune.sailsMax },
    ];
  };
  function buy(k) {
    const c = me(), s = shipOf(c); if (!c || !s || !s.at) return; const it = items(c, s, s.at).find(x => x.k === k);
    if (!it || !it.ok) return; if ((c.berries || 0) < it.pr) { toast('Berries insuficientes: custa ' + berry(it.pr) + '.'); return; }
    c.berries -= it.pr;
    if (k === 'comida') s.comida += 5;
    if (k === 'reparo') s.casco = s.cascoMax;
    if (k === 'curativo') c.hp = Math.min(c.hpMax, c.hp + Math.ceil(c.hpMax / 2));
    if (k === 'refeicao') c.st = Math.min(c.stMax, c.st + Math.ceil(c.stMax / 2));
    if (k === 'canhao') s.canhoes++;
    if (k === 'velas') s.velas = (s.velas || 0) + 1;
    commit('ships', s.key, s); commit('chars', c.id, c); syncPc(c);
    sysMsg(s.at, c.nome + ' compra: ' + it.nome + ' (−' + berry(it.pr) + ' Berries).'); tone(520, 0.08, 'triangle', 0.2); sheetDirty = true; mesaDirty = true;
  }
  return { items, buy };
})();

const Train = (() => {
  const rate = c => tune.trainXpHour * Math.pow(Math.max(1, c.lv), tune.trainLvExp) * (c.faccao === 'marinha' ? tune.navyTrainMul : 1);
  const hours = c => c.treino ? Math.min(tune.trainCapH, (Date.now() - c.treino.desde) / 3600000 * tune.trainSpeed) : 0;
  const pending = c => Math.round(rate(c) * hours(c));
  function start(c) {
    if (c.treino || c.prisao) return;
    c.treino = { desde: Date.now() }; commit('chars', c.id, c);
    sysMsg(chanOf(c), c.nome + ' começa a treinar' + (c.faccao === 'marinha' ? ' sob a orientação dos superiores' : '') + '. O treino rende XP mesmo com o jogo fechado.');
  }
  function stop(c, quiet) {
    if (!c.treino) return 0; const xp = pending(c); c.treino = null; const got = addXp(c, xp); commit('chars', c.id, c);
    if (!quiet || got) sysMsg(chanOf(c), c.nome + ' termina o treino e ganha +' + got + ' XP.'); return got;
  }
  return { rate, hours, pending, start, stop };
})();
