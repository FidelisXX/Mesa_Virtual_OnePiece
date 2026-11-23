// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// Batalha naval por turnos: mapa de mar em grade, ficha do navio, postos da tripulação, tiro com d20 + TEC.
// Estado durável em db.naval.cur (sincronizado entre abas como o resto). Cada ação é calculada pela aba que a faz.
'use strict';

const Naval = (() => {
  // 8 rumos. O rumo i aponta para o vetor (sin(i·45°), cos(i·45°)) do mundo, no mapa: x para a direita, y para baixo.
  // i+1 vira para bombordo (esquerda), i−1 para boreste (direita).
  const DIRS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
  const DIRN = ['sul', 'sudeste', 'leste', 'nordeste', 'norte', 'noroeste', 'oeste', 'sudoeste'];
  const POSTS = { timoneiro: 'Timoneiro', artilheiro: 'Artilheiro', carpinteiro: 'Carpinteiro', capitao: 'Capitão' };
  const ENEMIES = {
    pescador: { nome: 'Barco de pescador', emb: 'pescador', casco: 20, canhoes: 1, vel: 3, def: 10, atk: 1, moral: 6 },
    patrulha: { nome: 'Patrulha da Marinha', emb: 'marinha', casco: 36, canhoes: 3, vel: 4, def: 12, atk: 3, moral: 12 },
    rival:    { nome: 'Pirata rival', emb: 'rival', casco: 30, canhoes: 2, vel: 4, def: 12, atk: 2, moral: 10 },
  };
  let target = null, cv = null, npcWait = 0, bgKey = '', bg = null, lay = { cell: 40, ox: 0, oy: 0 };

  const cur = () => (db.naval && db.naval.cur && db.naval.cur.on && db.naval.cur.mode === 'turnos' ? db.naval.cur : null);
  const save = () => { commit('naval', 'cur', db.naval.cur); };
  const shipList = c => c.order.map(id => c.ships[id]).filter(Boolean);
  const alive = s => !s.out;
  const here = c => c.order[c.turn] && c.ships[c.order[c.turn]];
  const isNpc = s => s.side === 'npc';

  // Quem vê o mapa de mar: o Narrador e a tripulação de um navio que está na batalha.
  function visible() {
    const c = cur(), m = me(); if (!c || !m) return false;
    return m.gm || Object.values(c.ships).some(s => s.side === 'pj' && s.key === shipKey(m));
  }
  // Para o 3D parar de ouvir o teclado enquanto a batalha corre.
  const lockedFor = () => !!(cur() && visible() && !isGM());

  // ---- Vento (vem do mesmo db.world.wind do mar 3D) ----
  function windIdx() { return ((Math.round(db.world.wind / (Math.PI / 4)) % 8) + 8) % 8; }
  function windMod(h) { const d = ((h - windIdx()) % 8 + 8) % 8, a = Math.min(d, 8 - d); return a <= 1 ? 1 : (a >= 3 ? -1 : 0); }
  const windText = h => { const m = windMod(h); return m > 0 ? 'a favor (+1)' : m < 0 ? 'contra (−1)' : 'de lado'; };

  // ---- Postos ----
  function autoPosts(key) {
    const crew = crewOf(key), posts = { timoneiro: null, artilheiro: null, carpinteiro: null, capitao: null };
    const taken = () => Object.values(posts);
    const take = (post, pred, score) => {
      const c = crew.filter(x => !taken().includes(x.id) && pred(x)).sort((a, b) => score(b) - score(a))[0]; if (c) posts[post] = c.id;
    };
    const tec = x => attr(x, 'TEC');
    take('timoneiro', x => x.prof === 'navegador' || x.prof === 'timoneiro', tec);
    take('artilheiro', x => x.classe === 'atirador', tec);
    take('carpinteiro', x => x.prof === 'carpinteiro' || x.prof === 'medico' || x.prof === 'cozinheiro', tec);
    take('capitao', () => true, x => attr(x, 'CAR'));
    ['timoneiro', 'artilheiro', 'carpinteiro'].forEach(p => take(p, () => true, tec));
    // equipe pequena: a mesma pessoa cobre mais de um posto
    Object.keys(posts).forEach(p => { if (!posts[p] && crew.length) posts[p] = crew.slice().sort((a, b) => (p === 'capitao' ? attr(b, 'CAR') - attr(a, 'CAR') : tec(b) - tec(a)))[0].id; });
    return posts;
  }

  // ---- Começar e terminar ----
  function start(opts) {
    if (cur()) { toast('Já existe uma batalha naval em andamento.'); return; }
    const cols = tune.navalCols, rows = tune.navalRows, ships = {}, order = [];
    const keys = opts.keys.filter(k => db.ships[k] && !db.ships[k].at);
    if (!keys.length) { toast('Os navios escolhidos estão atracados: zarpem antes.'); return; }
    const n = opts.count, spread = (i, k) => Math.round(rows / 2 - (k - 1) * 1.5 + i * 3);
    const lvE = opts.lv || 1, scale = 1 + (lvE - 1) * 0.06;
    keys.forEach((k, i) => {
      const sh = db.ships[k], nav = profOn(k, 'navegador'), id = 'pj-' + k; if (sh.travel) Travel.pause(sh);
      ships[id] = { id, side: 'pj', key: k, fac: sh.fac, nome: shipName(sh), emb: sh.fac, x: 3, y: clamp(spread(i, keys.length), 1, rows - 2), h: 2,
        casco: sh.casco, cascoMax: sh.cascoMax, moral: tune.navalMoral, moralMax: tune.navalMoral, canhoes: sh.canhoes,
        vel: tune.navalVel + (nav ? tune.navalNavVel : 0) + Math.min(sh.velas || 0, 2), def: tune.navalDef, atk: tune.navalFillerAtk, posts: autoPosts(k), out: null };
    });
    const E = ENEMIES[opts.enemy];
    for (let i = 0; i < n; i++) {
      const id = 'npc-' + i;
      ships[id] = { id, side: 'npc', fac: null, nome: n > 1 ? E.nome + ' ' + (i + 1) : E.nome, emb: E.emb, x: cols - 4, y: clamp(spread(i, n), 1, rows - 2), h: 6,
        casco: Math.round(E.casco * scale), cascoMax: Math.round(E.casco * scale), moral: E.moral, moralMax: E.moral, canhoes: E.canhoes, vel: E.vel, def: E.def, atk: E.atk + Math.floor(lvE / 3), posts: {}, out: null, lv: lvE };
    }
    const ini = Object.values(ships).map(s => {
      const tim = db.chars[s.posts && s.posts.timoneiro], b = s.side === 'pj' ? (tim ? attr(tim, 'TEC') : 0) : s.atk;
      return { id: s.id, v: roll(20) + b, side: s.side };
    }).sort((a, b) => b.v - a.v || (a.side === 'pj' ? -1 : 1));
    ini.forEach(r => order.push(r.id));
    const c = { on: true, mode: 'turnos', enemyLv: lvE, cols, rows, ships, order, ini: Object.fromEntries(ini.map(r => [r.id, r.v])), turn: 0, round: 1 };
    db.naval.cur = c; turnStart(here(c)); target = null; save();
    say('Navios à vista! Batalha naval por turnos: ' + ini.map(r => c.ships[r.id].nome + ' ' + r.v).join(' · ') + '.');
    say('Rodada 1: vez de ' + here(c).nome + '.'); announce(c);
  }
  function end(why) {
    const c = cur(); if (!c) return; c.on = false; save();
    Object.values(c.ships).filter(x => x.side === 'pj').forEach(x => { const sh = db.ships[x.key]; if (sh) { sh.casco = Math.max(1, x.casco); commit('ships', sh.key, sh); Travel.resume(sh); } });
    say(why || 'A batalha naval terminou.'); mesaDirty = true;
  }
  // espólio da vitória: XP, Berries e reputação para cada tripulante dos navios dos jogadores
  function reward(c) {
    const lv = c.enemyLv || 1, npc = Object.values(c.ships).filter(x => x.side === 'npc');
    const xp = Math.round(tune.xpPerNpcLv * lv * npc.length * 2), money = Math.round(tune.berriesPerNpcLv * lv * npc.length * 3 * (0.7 + rng() * 0.6));
    Object.values(c.ships).filter(x => x.side === 'pj').forEach(p => { const crew = crewOf(p.key); crew.forEach(x => { x.berries = (x.berries || 0) + Math.round(money / Math.max(1, crew.length)); addXp(x, xp); addRep(x, tune.repPerKill * npc.length + Math.floor(lv / 4)); }); });
    say('Espólio: cada tripulante recebe +' + xp + ' XP e parte de ' + money + ' Berries.');
  }
  function checkEnd() {
    const c = cur(); if (!c) return false; const L = shipList(c);
    if (!L.some(s => s.side === 'npc' && alive(s))) { reward(c); end('Vitória! Os navios inimigos foram vencidos ou fugiram.'); return true; }
    if (!L.some(s => s.side === 'pj' && alive(s))) { end('Derrota: a tripulação não tem mais navio em condições de lutar. O Narrador decide as consequências.'); return true; }
    return false;
  }

  // ---- Mensagens: vão para o convés de cada navio de jogador que está na batalha ----
  function chans(c) { const s = new Set(); Object.values((c || cur()).ships).forEach(sh => { if (sh.side === 'pj') s.add('navio-' + sh.key); }); return [...s]; }
  function say(txt) { const c = cur() || db.naval.cur; chans(c).forEach(ch => sysMsg(ch, txt)); }
  function postRoll(r, nome, ship) {
    chans().forEach(ch => {
      const m = { id: uid(), ts: Date.now(), ch, uid: myId, tipo: 'rolagem', nome, fac: ship.fac || undefined, npc: ship.side === 'npc' ? 'navio' : undefined, roll: r };
      commit('msgs', m.id, m); Chat.onNew(m, false);
    });
  }
  function announce(c) { const s = here(c); if (s && canControl(s) && !isGM()) { toast('É a vez do seu navio!'); tone(784, 0.15, 'triangle', 0.3); } }

  // ---- Permissão e quem rola ----
  function canControl(s) { if (!s || s.out || !visible()) return false; return isGM() || (s.side === 'pj' && s.key === shipKey(me())); }
  // Quem executa um posto: o dono do posto rola com a ficha dele; qualquer outro da tripulação cobre com penalidade; o Narrador usa o bônus do navio.
  function actor(s, post) {
    const m = me();
    if (isGM()) return { c: null, bonus: s.atk, nome: s.nome };
    if (s.side !== 'pj' || s.key !== shipKey(m)) return null;
    const holder = s.posts[post];
    if (holder === myId) return { c: m, bonus: statOf(m, post), nome: m.nome };
    if (holder && db.chars[holder]) { toast('O posto de ' + POSTS[post] + ' é de ' + db.chars[holder].nome + '. Peça para assumir o posto na barra de baixo.'); return null; }
    return { c: m, bonus: statOf(m, post) - tune.navalVacantPen, nome: m.nome };
  }
  function statOf(c, post) {
    if (post === 'capitao') return attr(c, 'CAR');
    return attr(c, 'TEC') + (post === 'artilheiro' && c.classe === 'atirador' ? 1 : 0) + (post === 'timoneiro' && (c.prof === 'navegador' || c.prof === 'timoneiro') ? 2 : 0) + (post === 'carpinteiro' && c.prof === 'carpinteiro' ? 1 : 0);
  }
  const mode = s => (s.adv ? 'vantagem' : 'normal');
  function d20(s, bonus, label, extra) {
    const r = rolarD20(bonus, mode(s)); r.label = label; r.modo = mode(s); Object.assign(r, extra || {}); s.adv = false; return r;
  }

  // ---- Turnos ----
  function turnStart(s) {
    if (!s) return; s.mp = Math.max(1, s.vel + windMod(s.h)); s.shotP = s.shotS = s.fixed = s.cmd = s.man = false;
  }
  function endTurn() {
    const c = cur(); if (!c) return; const s = here(c); if (s) s.adv = false;
    if (checkEnd()) return;
    for (let i = 0; i < c.order.length; i++) {
      c.turn++; if (c.turn >= c.order.length) { c.turn = 0; c.round++; }
      if (alive(here(c))) break;
    }
    const n = here(c); turnStart(n); target = null; save();
    say('Rodada ' + c.round + ': vez de ' + n.nome + '.'); announce(c); npcWait = 0;
  }
  const myTurn = () => { const c = cur(), s = c && here(c); return s && canControl(s) ? s : null; };

  // ---- Movimento: cada ponto é avançar 1 quadrado no rumo ou virar 45° ----
  const occupied = (c, x, y, but) => Object.values(c.ships).some(o => o !== but && alive(o) && o.x === x && o.y === y);
  function forward(s) {
    const c = cur(); if (!c || s.mp < 1) { toast('Sem pontos de movimento.'); return false; }
    const nx = s.x + DIRS[s.h][0], ny = s.y + DIRS[s.h][1];
    if (nx < 0 || ny < 0 || nx >= c.cols || ny >= c.rows) { toast('Fim do mapa. Na borda dá para tentar fugir.'); return false; }
    if (occupied(c, nx, ny, s)) { toast('Há um navio no caminho.'); return false; }
    s.x = nx; s.y = ny; s.mp--; save(); tone(200 + s.mp * 20, 0.06, 'triangle', 0.12); return true;
  }
  function turn(s, dir) {
    if (s.mp < 1) { toast('Sem pontos de movimento.'); return false; }
    s.h = ((s.h + dir) % 8 + 8) % 8; s.mp--; save(); tone(260, 0.05, 'triangle', 0.1); return true;
  }
  function maneuver(s) {
    if (s.man) { toast('A manobra já foi tentada neste turno.'); return; }
    const a = actor(s, 'timoneiro'); if (!a) return; s.man = true;
    const r = d20(s, a.bonus, 'Manobra de ' + s.nome, { cd: tune.cdMedia });
    postRoll(r, a.nome, s);
    if (r.total >= tune.cdMedia) { s.mp += tune.navalManeuver; say(a.nome + ' arranca mais do vento: +' + tune.navalManeuver + ' pontos de movimento.'); }
    else if (r.nat === 1) { s.mp = Math.max(0, s.mp - 1); say(a.nome + ' erra o leme: −1 ponto de movimento.'); }
    save();
  }

  // ---- Tiro: de que lado e a que distância o alvo está ----
  function bearing(s, t) {
    const dx = t.x - s.x, dy = t.y - s.y, dist = Math.hypot(dx, dy); if (!dist) return null;
    const hv = DIRS[s.h], hl = Math.hypot(hv[0], hv[1]), hx = hv[0] / hl, hy = hv[1] / hl;
    const cross = hx * dy - hy * dx, dot = hx * dx + hy * dy;
    const inArc = Math.abs(dot) / dist <= Math.sin(tune.navalArc * Math.PI / 180);
    return { dist, side: cross > 0 ? 's' : 'p', ok: inArc && dist <= tune.navalRange };
  }
  const foes = (c, s) => shipList(c).filter(o => alive(o) && o.side !== s.side);
  function pickTarget(c, s, side) {
    const cands = foes(c, s).map(t => ({ t, b: bearing(s, t) })).filter(x => x.b && x.b.ok && x.b.side === side);
    if (!cands.length) return null;
    const sel = cands.find(x => x.t.id === target); if (sel) return sel;
    return cands.sort((a, b) => a.b.dist - b.b.dist)[0];
  }
  function fire(s, side, quiet) {
    const c = cur(); if (!c) return false;
    if (side === 'p' ? s.shotP : s.shotS) { if (!quiet) toast('Este bordo já atirou neste turno.'); return false; }
    const pick = pickTarget(c, s, side);
    if (!pick) { if (!quiet) toast('Nenhum alvo no arco de ' + (side === 'p' ? 'bombordo' : 'boreste') + ' e no alcance (' + tune.navalRange + ').'); return false; }
    const a = actor(s, 'artilheiro'); if (!a) return false;
    if (side === 'p') s.shotP = true; else s.shotS = true;
    const t = pick.t, pen = Math.floor(pick.b.dist / tune.navalRangePen);
    const lado = side === 'p' ? 'bombordo' : 'boreste';
    const r = d20(s, a.bonus - pen, 'Tiro de ' + lado + ' (' + s.nome + ')', { vs: { nome: t.nome, def: t.def } });
    postRoll(r, a.nome, s);
    if (r.nat === 1 || (r.nat !== 20 && r.total < t.def)) { say('Os tiros de ' + s.nome + ' caem na água perto de ' + t.nome + '.'); save(); return true; }
    const crit = r.nat === 20, dd = parseRolagem((s.canhoes * (crit ? 2 : 1)) + 'd' + tune.navalDmgDie, null);
    dd.label = 'Dano em ' + t.nome + (crit ? ' (crítico)' : ''); postRoll(dd, a.nome, s);
    hit(t, dd.total, crit ? 2 : 1); save(); tone(110, 0.2, 'sawtooth', 0.25); return true;
  }
  function hit(t, dmg, moralLoss) {
    t.casco = Math.max(0, t.casco - dmg); t.moral = Math.max(0, t.moral - moralLoss);
    say(t.nome + ' leva ' + dmg + ' de dano: Casco ' + t.casco + '/' + t.cascoMax + ', Moral ' + t.moral + '/' + t.moralMax + '.');
    if (t.casco <= 0) { t.out = 'afundou'; say(t.nome + ' está afundando!'); }
    else if (t.moral <= 0) { t.out = 'rendeu'; say('A tripulação de ' + t.nome + ' joga as armas e se rende.'); }
    if (t.out) checkEnd();
  }

  // ---- Outros postos ----
  function repair(s) {
    if (s.fixed) { toast('O conserto já foi feito neste turno.'); return; }
    if (s.casco >= s.cascoMax) { toast('O casco está inteiro.'); return; }
    const a = actor(s, 'carpinteiro'); if (!a) return; s.fixed = true;
    const r = parseRolagem('1d6+' + Math.max(0, a.bonus), null); r.label = 'Conserto do casco (' + s.nome + ')'; postRoll(r, a.nome, s);
    s.casco = Math.min(s.cascoMax, s.casco + r.total); s.moral = Math.min(s.moralMax, s.moral + 1);
    say(a.nome + ' remenda o casco: Casco ' + s.casco + '/' + s.cascoMax + '.'); save();
  }
  function command(s) {
    if (s.cmd) { toast('O comando já foi dado neste turno.'); return; }
    const a = actor(s, 'capitao'); if (!a) return; s.cmd = true;
    const r = d20(s, a.bonus, 'Comando de ' + s.nome, { cd: tune.cdMedia }); postRoll(r, a.nome, s);
    if (r.total >= tune.cdMedia) { s.adv = true; say(a.nome + ' ruge uma ordem: o próximo teste do navio sai com vantagem.'); }
    else if (r.nat === 1) { s.moral = Math.max(0, s.moral - 1); say('A ordem de ' + a.nome + ' sai confusa: −1 de Moral.'); }
    save();
  }
  const onEdge = (c, s) => s.x === 0 || s.y === 0 || s.x === c.cols - 1 || s.y === c.rows - 1;
  function flee(s) {
    const c = cur(); if (!onEdge(c, s)) { toast('Para fugir, o navio precisa estar na borda do mapa.'); return; }
    const a = actor(s, 'timoneiro'); if (!a) return;
    const r = d20(s, a.bonus, 'Fuga de ' + s.nome, { cd: tune.navalFleeCD }); postRoll(r, a.nome, s);
    if (r.total >= tune.navalFleeCD) { s.out = 'fugiu'; say(s.nome + ' escapa para o mar aberto!'); save(); if (!checkEnd()) endTurn(); }
    else { say('O vento não ajuda: ' + s.nome + ' não consegue escapar.'); s.mp = 0; save(); }
  }
  function claim(s, post) {
    const m = me(); if (!m || m.gm || s.key !== shipKey(m)) return;
    s.posts[post] = myId; save(); say(m.nome + ' assume o posto de ' + POSTS[post] + '.');
  }

  // ---- Navio inimigo (NPC): aproxima, vira o costado e atira ----
  function npcScore(c, s) {
    const f = foes(c, s); if (!f.length) return 0;
    let best = -1e9;
    f.forEach(t => {
      const dx = t.x - s.x, dy = t.y - s.y, d = Math.hypot(dx, dy) || 0.01, hv = DIRS[s.h], hl = Math.hypot(hv[0], hv[1]);
      const side = Math.abs((hv[0] / hl) * dy - (hv[1] / hl) * dx) / d; // 1 = o alvo está de lado
      // longe: só se aproxima; perto: vira o costado para o alvo
      best = Math.max(best, -Math.abs(d - tune.navalRange * 0.55) + (d <= tune.navalRange * 1.6 ? side * 3 : 0));
    });
    return best;
  }
  function npcTurn() {
    const c = cur(), s = c && here(c); if (!s || !isNpc(s) || s.out) return;
    let guard = 12;
    while (s.mp > 0 && guard-- > 0) {
      const base = npcScore(c, s), x0 = s.x, y0 = s.y, h0 = s.h; let pick = null, bestS = base;
      // avançar
      const nx = s.x + DIRS[s.h][0], ny = s.y + DIRS[s.h][1];
      if (nx >= 0 && ny >= 0 && nx < c.cols && ny < c.rows && !occupied(c, nx, ny, s)) { s.x = nx; s.y = ny; const v = npcScore(c, s) - 0.1; if (v > bestS) { bestS = v; pick = 'f'; } s.x = x0; s.y = y0; }
      for (const dir of [1, -1]) { s.h = ((h0 + dir) % 8 + 8) % 8; const v = npcScore(c, s) - 0.15; if (v > bestS) { bestS = v; pick = dir; } s.h = h0; }
      if (pick === 'f') forwardQuiet(s); else if (pick) { s.h = ((s.h + pick) % 8 + 8) % 8; s.mp--; } else break;
    }
    ['p', 's'].forEach(side => { if (!(side === 'p' ? s.shotP : s.shotS)) fire(s, side, true); });
    save(); endTurn();
  }
  function forwardQuiet(s) { s.x += DIRS[s.h][0]; s.y += DIRS[s.h][1]; s.mp--; }

  // ---- Entrada: teclas e clique ----
  function update(dt) {
    const c = cur(); if (!c || !visible()) return;
    const s = here(c);
    if (isGM() && s && isNpc(s) && !s.out) { npcWait += dt; if (npcWait > tune.navalNpcDelay) { npcWait = 0; npcTurn(); } }
    const mine = myTurn(); if (!mine || isNpc(mine) && !isGM()) return;
    if (pressed('KeyW')) forward(mine);
    if (pressed('KeyA')) turn(mine, 1);
    if (pressed('KeyD')) turn(mine, -1);
    if (pressed('KeyQ')) fire(mine, 'p');
    if (pressed('KeyE')) fire(mine, 's');
    if (pressed('KeyR')) repair(mine);
    if (pressed('KeyT')) endTurn();
  }
  function attach(canvas) {
    cv = canvas;
    canvas.addEventListener('pointerdown', e => {
      const c = cur(); if (!c || !visible() || scene !== 'play') return;
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const hitS = shipList(c).filter(alive).find(s => Math.hypot(x - (lay.ox + (s.x + 0.5) * lay.cell), y - (lay.oy + (s.y + 0.5) * lay.cell)) < lay.cell * 0.8);
      target = hitS && hitS.side === 'npc' ? hitS.id : null;
    });
  }

  // ---- Desenho ----
  function chart(cols, rows, cell) {
    const key = cols + 'x' + rows + 'x' + cell; if (key === bgKey) return bg; bgKey = key;
    const w = cols * cell, h = rows * cell, cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h; const g = cv2.getContext('2d');
    const R = artRng(4242);
    g.fillStyle = PARCH; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) { const x = R() * w, y = R() * h, r = cell * (1 + R() * 4), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(150,110,60,${0.04 + R() * 0.06})`); gr.addColorStop(1, 'rgba(150,110,60,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.strokeStyle = 'rgba(52,96,112,.5)'; g.lineWidth = Math.max(1, cell * 0.04);
    for (let y = cell * 0.4; y < h; y += cell * 0.5) for (let x = (Math.floor(y / cell * 2) % 2) * cell * 0.5; x < w; x += cell * 1.1) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + cell * 0.14, y - cell * 0.1, x + cell * 0.28, y); g.quadraticCurveTo(x + cell * 0.42, y + cell * 0.1, x + cell * 0.56, y); g.stroke(); }
    g.strokeStyle = 'rgba(110,80,45,.4)'; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= cols; x++) { g.moveTo(x * cell, 0); g.lineTo(x * cell, h); } for (let y = 0; y <= rows; y++) { g.moveTo(0, y * cell); g.lineTo(w, y * cell); } g.stroke();
    drawCompass(g, w - cell * 1.6, cell * 1.7, cell * 1.0);
    g.strokeStyle = INK; g.lineWidth = cell * 0.08; g.strokeRect(2, 2, w - 4, h - 4);
    return (bg = cv2);
  }
  function shipTop(g, x, y, L, ang, s, opts) {
    const cor = { pirata: ['#6b3a1f', '#b9854f', RED], marinha: ['#e9e6dc', '#f7f4ea', NAVY], pescador: ['#9b7a4a', '#c9a96f', '#6b8a3a'], rival: ['#3a2a3e', '#6b4f6e', '#1e1a22'] }[s.emb] || ['#6b3a1f', '#b9854f', RED];
    g.save(); g.translate(x, y); g.rotate(ang);
    if (s.out === 'afundou') g.globalAlpha = 0.45;
    if (opts.glow) { g.shadowColor = '#ffd75a'; g.shadowBlur = L * 0.4; }
    const hw = L * 0.2;
    const hull = k => { g.beginPath(); g.moveTo(L / 2 * k, 0); g.quadraticCurveTo(L * 0.25 * k, -hw * 1.1 * k, -L * 0.35 * k, -hw * k); g.lineTo(-L / 2 * k, -hw * 0.7 * k); g.lineTo(-L / 2 * k, hw * 0.7 * k); g.lineTo(-L * 0.35 * k, hw * k); g.quadraticCurveTo(L * 0.25 * k, hw * 1.1 * k, L / 2 * k, 0); g.closePath(); };
    hull(1); g.fillStyle = cor[0]; g.fill(); g.shadowBlur = 0; g.lineWidth = Math.max(1.5, L * 0.04); g.strokeStyle = INK; g.stroke();
    hull(0.78); g.fillStyle = cor[1]; g.fill(); g.lineWidth = 1; g.stroke();
    g.fillStyle = INK; const n = Math.min(s.canhoes, 4);
    for (let i = 0; i < n; i++) { const px = L * (0.22 - i * (0.5 / Math.max(1, n))); for (const sd of [-1, 1]) g.fillRect(px - L * 0.03, sd * hw * 0.82 - L * 0.015, L * 0.07, L * 0.03); }
    g.fillStyle = '#fbf7ea'; g.beginPath(); g.ellipse(L * 0.03, 0, L * 0.06, hw * 1.0, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 1.2; g.stroke();
    g.fillStyle = cor[2]; g.beginPath(); g.moveTo(L * 0.03, 0); g.lineTo(-L * 0.12, -hw * 0.35); g.lineTo(-L * 0.12, hw * 0.35); g.closePath(); g.fill();
    g.fillStyle = INK; g.beginPath(); g.arc(L * 0.03, 0, L * 0.03, 0, Math.PI * 2); g.fill();
    if (s.out === 'rendeu') { g.fillStyle = '#fff'; g.fillRect(-L * 0.05, -hw * 0.2, L * 0.16, hw * 0.45); g.strokeRect(-L * 0.05, -hw * 0.2, L * 0.16, hw * 0.45); }
    g.restore();
    if (s.out === 'afundou') { g.save(); g.strokeStyle = INK; g.lineWidth = L * 0.06; g.beginPath(); g.moveTo(x - L * 0.2, y - L * 0.2); g.lineTo(x + L * 0.2, y + L * 0.2); g.moveTo(x + L * 0.2, y - L * 0.2); g.lineTo(x - L * 0.2, y + L * 0.2); g.stroke(); g.restore(); }
  }
  function draw(g, W, H) {
    const c = cur(); if (!c) return;
    const top = 92, bottom = 168, cell = Math.max(16, Math.floor(Math.min((W - 24) / c.cols, (H - top - bottom) / c.rows)));
    const ox = Math.round((W - cell * c.cols) / 2), oy = Math.round(top + (H - top - bottom - cell * c.rows) / 2);
    lay = { cell, ox, oy };
    g.fillStyle = canvasBg(); g.fillRect(0, 0, W, H);
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 24; g.drawImage(chart(c.cols, c.rows, cell), ox, oy); g.restore();
    const now = here(c), mine = myTurn();
    // arcos de tiro e alcance do navio da vez (quando é minha vez)
    if (now && !now.out && (mine || isGM())) {
      const hv = DIRS[now.h], th = Math.atan2(hv[1], hv[0]), rad = tune.navalRange * cell, arc = tune.navalArc * Math.PI / 180, cx = ox + (now.x + 0.5) * cell, cy = oy + (now.y + 0.5) * cell;
      [[th + Math.PI / 2, now.shotS], [th - Math.PI / 2, now.shotP]].forEach(([a, used]) => {
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, rad, a - arc, a + arc); g.closePath();
        g.fillStyle = used ? 'rgba(90,90,90,.12)' : 'rgba(179,38,30,.16)'; g.fill(); g.strokeStyle = used ? 'rgba(90,90,90,.4)' : 'rgba(179,38,30,.5)'; g.setLineDash([6, 5]); g.lineWidth = 1.5; g.stroke(); g.setLineDash([]);
      });
    }
    // navios (os que saíram da cena por fuga não aparecem)
    shipList(c).filter(s => s.out !== 'fugiu').sort((a, b) => (a.out ? 0 : 1) - (b.out ? 0 : 1)).forEach(s => {
      const cx = ox + (s.x + 0.5) * cell, cy = oy + (s.y + 0.5) * cell, v = DIRS[s.h], ang = Math.atan2(v[1], v[0]), L = cell * 2.3;
      if (target === s.id) { g.strokeStyle = '#d8a21a'; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.arc(cx, cy, cell * 0.95, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
      shipTop(g, cx, cy, L, ang, s, { glow: now && now.id === s.id });
      // placa com nome e barras
      const fs = Math.max(11, Math.round(cell * 0.3)); g.font = `600 ${fs}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(s.nome).width + fs, ny = cy + cell * 1.25;
      g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = 1; g.fillRect(cx - tw / 2, ny - fs * 0.7, tw, fs * 1.4); g.strokeRect(cx - tw / 2, ny - fs * 0.7, tw, fs * 1.4);
      g.fillStyle = INK; g.fillText(s.nome, cx, ny);
      const bw = cell * 1.8, bx = cx - bw / 2, by = cy - cell * 1.3, bh = Math.max(4, cell * 0.12);
      g.fillStyle = 'rgba(43,33,24,.8)'; g.fillRect(bx - 1, by - 1, bw + 2, bh * 2 + 3);
      g.fillStyle = '#c0392b'; g.fillRect(bx, by, bw * s.casco / s.cascoMax, bh);
      g.fillStyle = '#d8a21a'; g.fillRect(bx, by + bh + 1, bw * s.moral / s.moralMax, bh);
    });
    // seta do vento
    const wi = windIdx(), wv = DIRS[wi], wa = Math.atan2(wv[1], wv[0]), wx = ox + 46, wy = oy + 46;
    g.save(); g.translate(wx, wy); g.fillStyle = PARCH2; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 32, 0, Math.PI * 2); g.fill(); g.stroke();
    g.rotate(wa); g.fillStyle = NAVY; g.beginPath(); g.moveTo(24, 0); g.lineTo(2, -10); g.lineTo(2, -4); g.lineTo(-22, -4); g.lineTo(-22, 4); g.lineTo(2, 4); g.lineTo(2, 10); g.closePath(); g.fill(); g.stroke(); g.restore();
    g.fillStyle = INK; g.font = '600 13px Georgia, serif'; g.textAlign = 'center'; g.fillText('vento', wx, wy + 46);
  }

  // ---- Barra da batalha (HTML): lista de navios, postos e ações ----
  const bars = (s) => `<div class="bar hp"><i style="width:${s.casco / s.cascoMax * 100}%"></i><span>Casco ${s.casco}/${s.cascoMax}</span></div><div class="bar st"><i style="width:${s.moral / s.moralMax * 100}%"></i><span>Moral ${s.moral}/${s.moralMax}</span></div>`;
  let hudSig = '';
  function hud(el) {
    const c = cur(), show = !!(c && visible() && scene === 'play');
    el.hidden = !show; if (!show) { hudSig = ''; return; }
    const s = here(c), mine = myTurn(), m = me();
    const sig = JSON.stringify([c.turn, c.round, Object.values(c.ships).map(x => [x.x, x.y, x.h, x.casco, x.moral, x.mp, x.shotP, x.shotS, x.fixed, x.cmd, x.man, x.adv, x.out, JSON.stringify(x.posts)]), target, myId, db.world.wind]);
    if (sig === hudSig) return; hudSig = sig;
    const sh = shipList(c);
    let h = `<div class="nv-top plate"><b>Batalha naval</b> · Rodada ${c.round} · vez de <b>${esc(s.nome)}</b>` +
      (s && !s.out ? ` · movimento <b>${s.mp}</b> · vento ${windText(s.h)}${s.adv ? ' · <b>vantagem</b>' : ''}` : '') + `</div>`;
    h += `<div class="nv-list">${sh.map(x => `<div class="nv-row plate ${x.id === s.id ? 'turn' : ''} ${x.out ? 'out' : ''}"><b>${esc(x.nome)}</b><span class="nv-tag" style="background:${x.side === 'npc' ? '#555' : (x.fac === 'marinha' ? '#1f4f9a' : '#b3261e')}">${x.out ? x.out : x.side === 'npc' ? 'inimigo' : 'aliado'}</span><span>Casco <b>${x.casco}/${x.cascoMax}</b></span><span>Moral <b>${x.moral}/${x.moralMax}</b></span></div>`).join('')}</div>`;
    // postos do meu navio, dentro da barra de ações
    const mineShip = m && !m.gm ? sh.find(x => x.side === 'pj' && x.key === shipKey(m)) : null;
    const postsRow = mineShip ? `<div class="row nv-postsrow"><b>Postos:</b> ${Object.entries(POSTS).map(([k, n]) => { const holder = db.chars[mineShip.posts[k]]; return `<button class="nv-post ${mineShip.posts[k] === myId ? 'mine' : ''}" data-post="${k}" title="Assumir o posto">${n}: ${holder ? esc(holder.nome) : 'vago'}</button>`; }).join('')}</div>` : '';
    if (mine && s) {
      const cmpTarget = target && c.ships[target] ? c.ships[target].nome : 'o mais próximo';
      h += `<div class="nv-actions plate">${postsRow}<div class="nv-lbl">${isGM() && isNpc(s) ? 'O navio inimigo age sozinho em instantes.' : 'Seu turno'} · alvo: <b>${esc(cmpTarget)}</b> <small>(clique num inimigo para mirar)</small></div><div class="row">
        <button class="btn sm" data-n="fwd" title="W">Avançar</button><button class="btn sm" data-n="port" title="A">Virar a bombordo</button><button class="btn sm" data-n="star" title="D">Virar a boreste</button>
        <button class="btn sm wood" data-n="man">Manobra (TEC)</button><span class="sep"></span>
        <button class="btn sm red" data-n="fp" title="Q">Tiro de bombordo</button><button class="btn sm red" data-n="fs" title="E">Tiro de boreste</button><span class="sep"></span>
        <button class="btn sm wood" data-n="fix" title="R">Consertar</button><button class="btn sm wood" data-n="cmd">Comandar</button><button class="btn sm wood" data-n="flee">Fugir</button><button class="btn sm" data-n="end" title="T">Terminar turno</button></div></div>`;
    } else if (s) h += `<div class="nv-actions plate">${postsRow}<div class="nv-lbl">Aguarde: vez de <b>${esc(s.nome)}</b>.</div></div>`;
    el.innerHTML = h;
    el.querySelectorAll('[data-post]').forEach(b => b.onclick = () => mineShip && claim(mineShip, b.dataset.post));
    el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
      const k = b.dataset.n, t = myTurn(); if (!t) return;
      ({ fwd: () => forward(t), port: () => turn(t, 1), star: () => turn(t, -1), man: () => maneuver(t), fp: () => fire(t, 'p'), fs: () => fire(t, 's'), fix: () => repair(t), cmd: () => command(t), flee: () => flee(t), end: () => endTurn() })[k]();
    });
  }

  return { ENEMIES, start, end, endTurn, npcTurn, update, attach, draw, hud, visible, lockedFor, cur, get target() { return target; } };
})();
