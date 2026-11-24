// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// Luta de ilha: ataques criados, efeitos de status, nocaute, recompensas, NPCs que agem sozinhos, missões e saque.
'use strict';

// Mensagem de rolagem num canal qualquer (o chat comum só posta no canal que a pessoa está vendo).
function postRollTo(chs, nome, r, opts) {
  opts = opts || {}; (Array.isArray(chs) ? chs : [chs]).forEach(ch => {
    const m = { id: uid(), ts: Date.now(), ch, uid: myId, tipo: 'rolagem', nome, fac: opts.fac, npc: opts.npc, roll: r };
    commit('msgs', m.id, m); Chat.onNew(m, false);
  });
}
// Mantém o token do personagem em dia com a ficha.
function syncPc(c) {
  Object.values(db.tokens).filter(t => t.owner === c.id && t.pc).forEach(t => {
    Object.assign(t, { hp: c.hp, hpMax: c.hpMax, st: c.st, stMax: c.stMax, img: c.img || null, nome: c.nome, lv: c.lv, tam: (RACES[c.raca] || {}).size || 1 }); commit('tokens', t.id, t);
  });
}

const Combat = (() => {
  let chain = false;
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const tokensOn = isl => Object.values(db.tokens).filter(t => t.isl === isl);
  const charOf = t => (t.owner !== 'gm' ? db.chars[t.owner] : null);
  const sideOfKind = k => (k === 'marujo' || k === 'oficial' || k === 'almirante' ? 'marinha' : (k === 'bandido' || k === 'rival' ? 'pirata' : 'neutro'));
  const sideOfToken = t => { const c = charOf(t); return c ? c.faccao : sideOfKind(t.kind); };
  const defOfToken = t => { const c = charOf(t); return c ? defOf(c) : npcDef(t.lv || 1) + (t.defB || 0); };
  const myTok = isl => Object.values(db.tokens).find(t => t.isl === isl && t.owner === myId && t.pc);

  // ---- Criar NPC com o nível manda nos números ----
  function spawnNpc(isl, kind, lv, extra) {
    const k = NPC_KINDS[kind], p = Island.freeSpot(isl, 15, 6), id = 'tk-' + uid(), hp = npcHp(kind, lv);
    const t = Object.assign({ id, isl, owner: 'gm', kind, nome: k.nome, img: null, x: p.x, y: p.y, hp, hpMax: hp, st: 0, stMax: 0, lv, tam: 1, pub: true, seed: Math.abs(hashStr(id)), status: {} }, extra || {});
    commit('tokens', id, t); return t;
  }

  // ---- Perfil de combate de um NPC: a vida, o ataque e a defesa mudam, sempre em cima do nível ----
  const PERFIL = { equilibrado: [1, 0, 0], tanque: [1.6, -1, 3], brutamontes: [1.3, 3, 0], agil: [0.8, 1, 2], atirador: [0.8, 2, -1], fraco: [0.6, -1, -2], chefe: [2.2, 2, 2] };
  function perfilExtra(kind, lv, perfil, nota) {
    const p = PERFIL[perfil] || PERFIL.equilibrado, hp = Math.max(1, Math.round(npcHp(kind, lv) * p[0])), esc = 1 + lv / 25;
    return { hp, hpMax: hp, atkB: Math.round(p[1] * esc), defB: Math.round(p[2] * esc), perfil: PERFIL[perfil] ? perfil : 'equilibrado', nota: nota || '' };
  }
  // Sem IA: lê as palavras da descrição e escolhe o tipo, o perfil e o nome
  function fichaLocal(desc) {
    const d = String(desc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), has = re => re.test(d);
    const tipo = has(/oficial|comandante|tenente|coronel|vice-almirante/) ? 'oficial' : has(/marinh|soldado|marujo|guarda/) ? 'marujo' : has(/cozinh|chef|cook/) ? 'cozinha'
      : has(/rival|cacador de recompensa|capita|pirata famoso/) ? 'rival' : has(/pirata|bandido|ladr|saque|assalt|bruto/) ? 'bandido' : 'aldeao';
    const perfil = has(/chefe|capita|comandante|lorde|lider|boss|lenda/) ? 'chefe' : has(/escudo|armadura|tanque|resistente|couraca/) ? 'tanque' : has(/gigante|forte|brutal|musculos|machado|marreta|bruto/) ? 'brutamontes'
      : has(/rapid|agil|ladino|ladra|ladrao|sorrateir|assassin/) ? 'agil' : has(/pistola|rifle|atirador|sniper|arco|besta|canhao/) ? 'atirador' : has(/fraco|crianca|velh|doente|medroso/) ? 'fraco' : 'equilibrado';
    const m = String(desc).match(/"([^"]{2,24})"/) || String(desc).match(/chamad[oa]\s+([A-ZÀ-Ú][\wÀ-ú]+(?:\s(?:d[aeo]s?\s)?[A-ZÀ-Ú][\wÀ-ú]+)*)/) || String(desc).match(/\b(?:Capit[aã]o|Capit[aã]|Dr\.?|Mestre|Velho|Velha)\s+([A-ZÀ-Ú][\wÀ-ú]+)/);
    return { nome: m ? m[1].trim().slice(0, 24) : '', tipo, perfil, nota: String(desc).trim().slice(0, 160) };
  }

  // ---- Dano e nocaute ----
  function damage(t, n, by) { // n > 0 dano, n < 0 cura; by = { side, nome, char }
    t.hp = clamp(t.hp - n, 0, t.hpMax); commit('tokens', t.id, t);
    const oc = charOf(t); if (oc) { oc.hp = t.hp; commit('chars', oc.id, oc); sheetDirty = true; }
    if (n > 0 && t.hp <= 0) onKO(t, by || {});
  }
  function onKO(t, by) {
    sysMsg(t.isl, t.nome + ' está Nocauteado!');
    const c = charOf(t);
    if (c) { // um personagem caiu
      if (c.faccao === 'pirata' && by.side === 'marinha') sendToPrison(c);
      else if (c.faccao === 'marinha' && by.side === 'pirata') navyDefeated(c);
      return;
    }
    // um NPC caiu: quem o derrubou ganha XP, Berries e reputação; os outros presentes dividem a metade do XP
    mission(t);
    const killer = by.char; if (!killer || killer.gm) return;
    const lv = t.lv || 1, ratio = clamp((lv + 5) / (killer.lv + 5), 0.2, 2.5);
    const xp = Math.max(1, Math.round(tune.xpPerNpcLv * lv * ratio)), money = Math.round(tune.berriesPerNpcLv * lv * (0.6 + rng() * 0.8));
    const got = addXp(killer, xp); killer.berries = (killer.berries || 0) + money;
    const rep = (killer.faccao === 'marinha' ? sideOfKind(t.kind) === 'pirata' : t.kind !== 'aldeao' && t.kind !== 'tenryu') ? tune.repPerKill + Math.floor(lv / 4) : 0;
    if (rep) addRep(killer, rep); else commit('chars', killer.id, killer);
    sysMsg(t.isl, killer.nome + ' vence ' + t.nome + ' (nv ' + lv + '): +' + got + ' XP, +' + money + ' Berries' + (rep ? ', +' + rep + ' de reputação' : '') + '.');
    const cb = db.combat[t.isl];
    if (cb && cb.on) tokensOn(t.isl).filter(o => o.pc && o.owner !== killer.id && o.hp > 0).forEach(o => { const oc = charOf(o); if (oc) addXp(oc, Math.round(xp / 2)); });
  }

  // ---- Alvo e alcance ----
  function getTarget(c, silent) {
    const isl = currentView(), t = db.tokens[Island.sel], mt = myTok(isl);
    if (!isIsland(isl)) { silent || toast('Só dá para atacar em terra, no mapa da ilha.'); return null; }
    if (!mt) { silent || toast('Você ainda não tem token nesta ilha.'); return null; }
    if (!t || t.isl !== isl || t.owner === myId) { silent || toast('Selecione um token alvo no mapa (que não seja o seu).'); return null; }
    if (t.hp <= 0) { silent || toast('Esse alvo já está Nocauteado.'); return null; }
    return { t, mt };
  }
  const canAct = c => {
    if (c.hp <= 0) { toast('Você está Nocauteado.'); return false; }
    const mt = myTok(currentView());
    if (mt && mt.status && mt.status.atordoar > 0) { toast('Você está atordoado.'); return false; }
    const cb = db.combat[currentView()];
    if (cb && cb.on && cb.order[cb.turn] !== (mt && mt.id)) { toast('Não é a sua vez.'); return false; }
    return true;
  };

  // ---- Usar um ataque ----
  function useAttack(atk, modo) {
    const c = me(); if (!c || c.gm) return; const g = getTarget(c); if (!g || !canAct(c)) return;
    const { t, mt } = g, reach = atkReach(c, atk.fx), dist = cheb(mt, t);
    if (dist > reach) { toast('Fora de alcance: o ataque alcança ' + reach + ' quadrado(s) e o alvo está a ' + dist + '. Arraste seu token para perto.'); return; }
    if (c.st < atk.custo) { toast('Pontos de Poder insuficientes: a técnica custa ' + atk.custo + ' PP.'); return; }
    c.st -= atk.custo; commit('chars', c.id, c); syncPc(c);
    if (atk.img && typeof Fx !== 'undefined') Fx.cast(currentView(), c.nome, atk);
    const cl = CLASSES[c.classe], race = RACES[c.raca] || {}, ch = currentView(), def = defOfToken(t);
    const r = rolarD20(attr(c, atkAttr(c)) + bonusProf(c.lv), modo || 'normal'); r.label = atk.nome + ' (' + cl.nome + ')'; r.vs = { nome: t.nome, def };
    postRollTo(ch, c.nome, r, { fac: c.faccao });
    const by = { side: c.faccao, nome: c.nome, char: c };
    if (r.nat === 1 || (r.nat !== 20 && r.total < def)) { sysMsg(ch, c.nome + ' erra ' + t.nome + '.'); sheetDirty = true; return; }
    const crit = r.nat === 20, n = countFx(atk.fx, 'dano'), mod = attr(c, atkAttr(c)) + (race.dmg || 0);
    const f = (crit ? 2 : 1) * 1 + 'd' + cl.dado + (n ? '+' + (n * (crit ? 2 : 1)) + 'd6' : '') + '+' + mod;
    const d = parseRolagem(f, null); d.label = 'Dano em ' + t.nome + (crit ? ' (crítico)' : ''); d.formula = f.toLowerCase();
    postRollTo(ch, c.nome, d, { fac: c.faccao });
    // efeitos de status (a resistência é uma rolagem à parte)
    t.status = t.status || {};
    const tc = charOf(t), cd = 8 + bonusProf(c.lv) + attr(c, atkAttr(c));
    const resist = (label, attrK) => {
      const rr = rolarD20(tc ? attr(tc, attrK) : Math.floor((t.lv || 1) / 2), 'normal'); rr.label = label + ' de ' + t.nome; rr.cd = cd; postRollTo(ch, t.nome, rr, { npc: tc ? undefined : t.id }); return rr.total >= cd;
    };
    if (atk.fx.includes('veneno') && !(tc && 0)) { t.status.veneno = tune.poisonTurns; sysMsg(ch, t.nome + ' foi envenenado!'); }
    if (atk.fx.includes('queimar') && !(race.fireImmune && false) && !(tc && (RACES[tc.raca] || {}).fireImmune)) { t.status.queimar = tune.burnTurns; sysMsg(ch, t.nome + ' está pegando fogo!'); }
    if (atk.fx.includes('atordoar') && !resist('Resistência (VIG)', 'VIG')) { t.status.atordoar = 1; sysMsg(ch, t.nome + ' fica atordoado!'); }
    if (atk.fx.includes('prender') && !resist('Resistência (AGI)', 'AGI')) { t.status.prender = tune.rootTurns; sysMsg(ch, t.nome + ' fica preso!'); }
    damage(t, d.total, by); sheetDirty = true; tone(120, 0.18, 'sawtooth', 0.22);
  }

  // ---- Turnos: status, regeneração, iniciativa ----
  function turnStart(t) { // devolve true se o token perde o turno
    t.status = t.status || {}; let skip = false; const by = { side: 'neutro', nome: 'status' };
    if (t.status.veneno > 0) { const n = roll(tune.statusDie); t.status.veneno--; sysMsg(t.isl, t.nome + ' sofre ' + n + ' de veneno.'); commit('tokens', t.id, t); damage(t, n, by); }
    if (t.status.queimar > 0 && t.hp > 0) { const n = roll(tune.statusDie + 2); t.status.queimar--; sysMsg(t.isl, t.nome + ' sofre ' + n + ' de queimadura.'); commit('tokens', t.id, t); damage(t, n, by); }
    if (t.status.atordoar > 0) { t.status.atordoar--; skip = true; sysMsg(t.isl, t.nome + ' está atordoado e perde o turno.'); }
    if (t.status.prender > 0) t.status.prender--;
    const c = charOf(t); if (c && c.hp > 0) { c.st = Math.min(c.stMax, c.st + tune.stRegen); commit('chars', c.id, c); syncPc(c); }
    commit('tokens', t.id, t); return skip || t.hp <= 0;
  }
  function start(isl) {
    const rows = tokensOn(isl).filter(t => t.hpMax > 0 && t.hp > 0 && t.kind !== 'tenryu').map(t => {
      const c = charOf(t), b = c ? attr(c, 'AGI') + ((RACES[c.raca] || {}).ini || 0) : Math.floor((t.lv || 1) / 3), r = roll(20);
      return { id: t.id, v: r + b, npc: !c, nome: t.nome };
    }).sort((a, b) => b.v - a.v || (a.npc - b.npc) || a.nome.localeCompare(b.nome));
    if (!rows.length) { toast('Nenhum token com Vida nesta ilha.'); return; }
    const cb = { on: true, order: rows.map(r => r.id), vals: Object.fromEntries(rows.map(r => [r.id, r.v])), turn: 0, round: 1 };
    commit('combat', isl, cb); sysMsg(isl, 'Iniciativa! ' + rows.map(r => r.nome + ' ' + r.v).join(' · '));
    beginTurn(isl);
  }
  function beginTurn(isl) {
    const cb = db.combat[isl]; if (!cb || !cb.on) return; const t = db.tokens[cb.order[cb.turn]]; if (!t) return;
    sysMsg(isl, 'Rodada ' + cb.round + ': vez de ' + t.nome + '.');
    if (t.owner === myId) { toast('É a sua vez!'); tone(784, 0.15, 'triangle', 0.3); }
    if (turnStart(t)) { later(0.5, () => next()); return; }
    if (t.owner === 'gm' && db.world.auto) runNpc(isl);
  }
  function next() {
    const isl = currentView(); const cb = db.combat[isl]; if (!cb || !cb.on) return;
    if (checkEnd(isl)) return;
    for (let i = 0; i < cb.order.length; i++) {
      cb.turn++; if (cb.turn >= cb.order.length) { cb.turn = 0; cb.round++; }
      const t = db.tokens[cb.order[cb.turn]]; if (t && t.hp > 0) break;
    }
    commit('combat', isl, cb); beginTurn(isl);
  }
  function end(isl, why) {
    commit('combat', isl, { on: false, order: [], vals: {}, turn: 0, round: 1 });
    tokensOn(isl).filter(t => t.pc && t.hp <= 0).forEach(t => { const c = charOf(t); if (c && !c.prisao) { c.hp = Math.max(1, Math.round(c.hpMax * 0.25)); commit('chars', c.id, c); syncPc(c); } });
    tokensOn(isl).forEach(t => { if (t.status && Object.keys(t.status).length) { t.status = {}; commit('tokens', t.id, t); } });
    sysMsg(isl, why || 'O combate terminou.'); mesaDirty = true;
  }
  function checkEnd(isl) {
    const L = tokensOn(isl).filter(t => t.hp > 0 && t.kind !== 'tenryu' && t.hpMax > 0);
    if (!L.some(t => t.owner === 'gm')) { end(isl, 'Vitória! Os inimigos foram vencidos.'); return true; }
    if (!L.some(t => t.owner !== 'gm')) { end(isl, 'A tripulação caiu. Quem sobrou acorda machucado.'); return true; }
    return false;
  }

  // ---- NPC age sozinho: avança até o alvo mais próximo e ataca ----
  function runNpc(isl) {
    if (chain) return; chain = true;
    later(0.9, () => {
      chain = false; const cb = db.combat[isl]; if (!cb || !cb.on) return;
      const t = db.tokens[cb.order[cb.turn]]; if (t && t.owner === 'gm' && t.hp > 0) npcAct(t);
      if (db.combat[isl] && db.combat[isl].on) next();
    });
  }
  function npcAct(t) {
    const isl = t.isl, foes = tokensOn(isl).filter(o => o.hp > 0 && o.hpMax > 0 && (o.owner !== 'gm' || (t.kind !== 'tenryu' && o.kind === 'tenryu')));
    if (!foes.length) return;
    let tg = foes.sort((a, b) => cheb(t, a) - cheb(t, b))[0], reach = t.kind === 'bandido' || t.kind === 'rival' ? 3 : 1;
    if (t.status && t.status.prender > 0) { /* preso: não anda */ }
    else {
      let steps = 3; while (steps-- > 0 && cheb(t, tg) > reach) {
        const nx = t.x + Math.sign(tg.x - t.x), ny = t.y + Math.sign(tg.y - t.y);
        if (!tokensOn(isl).some(o => o !== t && o.hp > 0 && o.x === nx && o.y === ny)) { t.x = nx; t.y = ny; } else break;
      }
      commit('tokens', t.id, t);
    }
    if (cheb(t, tg) > reach) { sysMsg(isl, t.nome + ' avança.'); return; }
    const c = charOf(tg), def = defOfToken(tg), lv = t.lv || 1;
    const r = rolarD20(npcAtk(lv) + (t.atkB || 0), 'normal'); r.label = 'Ataque de ' + t.nome; r.vs = { nome: tg.nome, def }; postRollTo(isl, t.nome, r, { npc: t.id });
    if (r.nat === 1 || (r.nat !== 20 && r.total < def)) { sysMsg(isl, t.nome + ' erra ' + tg.nome + '.'); return; }
    const n = 1 + Math.floor(lv / 6), f = (r.nat === 20 ? n * 2 : n) + 'd6+' + Math.floor(lv / 4), d = parseRolagem(f, null);
    d.label = 'Dano em ' + tg.nome; postRollTo(isl, t.nome, d, { npc: t.id });
    damage(tg, d.total, { side: sideOfKind(t.kind), nome: t.nome });
  }

  // ---- Saque (pirata) e missões da Marinha ----
  function saquear() {
    const c = me(), isl = currentView(); if (!c || c.gm || c.faccao !== 'pirata' || !isIsland(isl)) return;
    if ((c.saqueAt || 0) > Date.now()) { toast('Espere um pouco antes de saquear de novo.'); return; }
    c.saqueAt = Date.now() + 45000;
    const best = Math.max(attr(c, 'FOR'), attr(c, 'CAR')), cd = tune.cdMedia + (isBase(ISLAND[isl]) ? 3 : 0) + Math.floor(c.lv / 10);
    const r = rolarD20(best + Math.floor(c.lv / 5), 'normal'); r.label = 'Saque em ' + ISLAND[isl].nome; r.cd = cd; postRollTo(isl, c.nome, r, { fac: c.faccao });
    if (r.total >= cd) {
      const ouro = Math.round(tune.saqueBerries * (1 + c.lv / 4) * (0.7 + rng() * 0.6)); c.berries = (c.berries || 0) + ouro;
      sysMsg(isl, c.nome + ' saqueia a ilha e leva ' + ouro + ' Berries!'); addRep(c, tune.saqueRep + Math.floor(c.lv / 8));
    } else {
      sysMsg(isl, 'O saque de ' + c.nome + ' dá errado: soldados correm para o porto!'); addRep(c, 1);
      spawnNpc(isl, 'marujo', Math.max(1, c.lv), {}); spawnNpc(isl, 'marujo', Math.max(1, c.lv - 1), {}); commit('chars', c.id, c);
    }
    mesaDirty = true;
  }
  const MISSIONS = {
    proteger: { nome: 'Proteger a ilha', desc: 'Piratas atacam o porto. Derrote todos.' },
    capturar: { nome: 'Capturar um procurado', desc: 'Um pirata com cartaz está na ilha.' },
    escoltar: { nome: 'Escoltar um Tenryubito', desc: 'Proteja o nobre dos emboscados. Se ele cair, a missão falha.' },
  };
  function accept(tipo) {
    const c = me(), isl = currentView(); if (!c || c.faccao !== 'marinha' || !isIsland(isl)) return;
    if (c.missao && db.missions[c.missao] && !db.missions[c.missao].done) { toast('Termine a missão atual antes.'); return; }
    const lv = Math.max(1, c.lv), id = 'ms-' + uid(), ids = [];
    if (tipo === 'proteger') { for (let i = 0; i < 3; i++) ids.push(spawnNpc(isl, i === 2 ? 'rival' : 'bandido', Math.max(1, lv - 1 + i), { mission: id }).id); }
    else if (tipo === 'capturar') { ids.push(spawnNpc(isl, 'rival', lv + 2, { mission: id, nome: 'Procurado ' + ['Dente de Ferro', 'Coral Negro', 'Maré Vermelha'][roll(3) - 1] }).id); ids.push(spawnNpc(isl, 'bandido', lv, { mission: id }).id); }
    else { ids.push(spawnNpc(isl, 'tenryu', lv, { mission: id, aliado: true, nome: 'Tenryubito' }).id); for (let i = 0; i < 3; i++) ids.push(spawnNpc(isl, i ? 'bandido' : 'rival', lv + i, { mission: id }).id); }
    commit('missions', id, { id, isl, owner: c.id, tipo, ids, lv, done: false });
    c.missao = id; commit('chars', c.id, c);
    sysMsg(isl, c.nome + ' aceita a missão "' + MISSIONS[tipo].nome + '". ' + MISSIONS[tipo].desc);
    mesaDirty = true;
  }
  // Desafio a um almirante: uma luta contra o ocupante do cargo (slot 0 a 2: almirantes, 3: almirante de frota)
  function challenge(slot) {
    const c = me(), isl = currentView(); if (!c || c.faccao !== 'marinha' || !isIsland(isl)) return;
    if (!isBase(ISLAND[isl])) { toast('O desafio acontece numa ilha com base da Marinha.'); return; }
    const frota = slot === 3, need = frota ? RANK_FROTA : RANK_ALM;
    if (rankOf(c) < need - 1 || c.rep < rankRep(need)) { toast('Você ainda não tem a reputação e a patente para este cargo.'); return; }
    if (c.missao && db.missions[c.missao] && !db.missions[c.missao].done) { toast('Termine a missão atual antes.'); return; }
    const hid = frota ? db.cargos.frota : db.cargos.almirantes[slot], nome = hid && db.chars[hid] ? db.chars[hid].nome : (frota ? FROTA_NOME : ALM_NOMES[slot]);
    const lv = frota ? 96 : 86 + slot * 2, id = 'ms-' + uid(), boss = spawnNpc(isl, 'almirante', lv, { nome, mission: id, boss: true });
    commit('missions', id, { id, isl, owner: c.id, tipo: 'desafio', ids: [boss.id], slot, lv, done: false }); c.missao = id; commit('chars', c.id, c);
    sysMsg(isl, c.nome + ' desafia ' + nome + ' pelo cargo de ' + (frota ? 'Almirante de Frota' : 'Almirante') + '!'); mesaDirty = true;
  }
  function mission(t) { // um NPC caiu: a missão pode ter acabado
    if (!t.mission) return; const m = db.missions[t.mission]; if (!m || m.done) return;
    const kids = m.ids.map(i => db.tokens[i]).filter(Boolean), nobre = kids.find(k => k.kind === 'tenryu');
    const owner = db.chars[m.owner]; if (!owner) return;
    if (t.kind === 'tenryu') { m.done = true; commit('missions', m.id, m); sysMsg(m.isl, 'O Tenryubito caiu: a missão de ' + owner.nome + ' fracassou.'); owner.missao = null; commit('chars', owner.id, owner); return; }
    if (kids.filter(k => k.kind !== 'tenryu').every(k => k.hp <= 0)) {
      m.done = true; commit('missions', m.id, m);
      if (m.tipo === 'desafio') {
        const nm = db.cargos; nm.almirantes = nm.almirantes.map(x => (x === owner.id ? null : x)); if (nm.frota === owner.id) nm.frota = null;
        if (m.slot === 3) nm.frota = owner.id; else nm.almirantes[m.slot] = owner.id;
        commit('cargos', null, nm); owner.missao = null; refreshChar(owner, false);
        sysMsg(m.isl, owner.nome + ' vence o desafio e assume o cargo de ' + (m.slot === 3 ? 'Almirante de Frota' : 'Almirante') + '!'); return;
      }
      const bonus = m.tipo === 'escoltar' ? 2 : 1, rep = Math.round(tune.missaoRep * bonus + m.lv / 4), money = Math.round(tune.missaoBerries * (1 + m.lv / 4) * bonus), xp = Math.round(tune.xpPerNpcLv * m.lv * 3);
      owner.berries = (owner.berries || 0) + money; owner.missao = null; addXp(owner, xp); addRep(owner, rep);
      sysMsg(m.isl, 'Missão cumprida: ' + owner.nome + ' recebe +' + money + ' Berries, +' + xp + ' XP e +' + rep + ' de reputação.');
      if (nobre) commit('tokens', nobre.id, null);
    }
  }

  return { challenge, perfilExtra, fichaLocal, spawnNpc, damage, useAttack, start, next, end, npcAct, saquear, accept, MISSIONS, charOf, myTok, defOfToken, sideOfKind, cheb, getTarget };
})();
