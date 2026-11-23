// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// Regras da carreira: nível e XP, recompensa e patente, prisões, ataques criados. Só números e commits; sem tela.
'use strict';

// ---- Nível 1 a 100 ----
const xpNext = lv => Math.round(tune.xpBase * Math.pow(lv, tune.xpExp));
const xpTotal = c => { let t = c.xp || 0; for (let l = 1; l < (c.lv || 1); l++) t += xpNext(l); return t; };
function levelMsg(c, txt) { const ch = chanOf(c); if (ch) sysMsg(ch, txt); }

// Recalcula Vida e Energia máximas (nível, raça e carreira mudam os números) e mantém o token em dia.
function refreshChar(c, heal) {
  c.hpMax = hpMaxOf(c); c.stMax = stMaxOf(c);
  c.hp = heal ? c.hpMax : Math.min(c.hp, c.hpMax); c.st = heal ? c.stMax : Math.min(c.st, c.stMax);
  commit('chars', c.id, c); syncPc(c);
}
function addXp(c, n) {
  if (c.gm || n <= 0 || c.lv >= tune.maxLv) return 0;
  n = Math.round(n * ((RACES[c.raca] || {}).xpMul || 1)); c.xp += n; let up = 0;
  while (c.lv < tune.maxLv && c.xp >= xpNext(c.lv)) {
    c.xp -= xpNext(c.lv); c.lv++; up++;
    if (c.lv % tune.ptsEvery === 0) c.pts = (c.pts || 0) + 1;
  }
  if (c.lv >= tune.maxLv) c.xp = 0;
  if (up) { refreshChar(c, true); levelMsg(c, c.nome + ' chegou ao nível ' + c.lv + '!'); tone(660, 0.12, 'triangle', 0.3); setTimeout(() => tone(880, 0.2, 'triangle', 0.3), 130); }
  else { commit('chars', c.id, c); }
  return n;
}
// Perde XP e, se faltar, nível. O Médico a bordo reduz a perda.
function loseXp(c, n) {
  if (c.gm) return 0;
  const key = shipKey(c); if (key && profOn(key, 'medico')) n = Math.round(n * tune.medicoLossMul);
  n = Math.max(0, Math.round(n)); c.xp -= n; let down = 0;
  while (c.xp < 0 && c.lv > 1) { c.lv--; c.xp += xpNext(c.lv); down++; }
  if (c.xp < 0) c.xp = 0;
  if (down) { if ((c.pts || 0) > 0 && c.lv % tune.ptsEvery === tune.ptsEvery - 1) c.pts--; refreshChar(c, false); levelMsg(c, c.nome + ' desceu para o nível ' + c.lv + '.'); }
  else commit('chars', c.id, c);
  return n;
}
function loseLevels(c, n) {
  const was = c.lv; c.lv = Math.max(1, c.lv - n); c.xp = 0; c.pts = Math.min(c.pts || 0, Math.floor(c.lv / tune.ptsEvery));
  refreshChar(c, false); return was - c.lv;
}

// ---- Pirata: reputação → recompensa → bônus de atributos ----
const BOUNTY_TIERS = [1e6, 1e7, 5e7, 1e8, 3e8, 5e8, 1e9, 2e9, 3e9];
function bountyFromRep(rep) {
  if (rep < tune.repFirstBounty) return 0;
  const b = tune.bountyBase * Math.pow(rep / tune.repFirstBounty, tune.bountyExp);
  return Math.min(tune.bountyCap, Math.round(b / 100000) * 100000);
}
function repFromBounty(b) {
  if (b <= 0) return 0;
  return Math.round(tune.repFirstBounty * Math.pow(b / tune.bountyBase, 1 / tune.bountyExp));
}
const bountyTier = b => BOUNTY_TIERS.filter(t => b >= t).length;
const berry = n => Math.round(n).toLocaleString('pt-BR');
const isPesada = c => c.faccao === 'pirata' && (c.recompensa || 0) >= tune.bountyWorst;

// ---- Marinha: reputação → patente (cargos de almirante por desafio) ----
const rankRep = i => Math.round(PATENTES[i][1] * tune.rankRepMul);
function rankOf(c) {
  if (c.faccao !== 'marinha') return 0;
  if (db.cargos.frota === c.id) return RANK_FROTA;
  if (db.cargos.almirantes.includes(c.id)) return RANK_ALM;
  let r = 0; for (let i = 0; i < PATENTES.length; i++) if ((c.rep || 0) >= rankRep(i)) r = i;
  return Math.min(r, RANK_ALM - 1); // sem vaga de almirante, o teto é Vice-Almirante
}
function careerBonus(c) {
  if (c.gm) return 0;
  if (c.faccao === 'pirata') return Math.floor(bountyTier(c.recompensa || 0) * tune.bountyAttrTier);
  return Math.floor(rankOf(c) * tune.rankAttrPer);
}
function titulo(c) {
  if (c.gm) return 'Mestre';
  if (c.faccao === 'marinha') return PATENTES[rankOf(c)][0];
  const b = c.recompensa || 0;
  return b >= tune.bountyYonkou ? 'Yonkou' : b >= tune.bountyWorst ? 'Pior Geração' : b >= 1e8 ? 'Supernova' : b >= 1e7 ? 'Procurado' : b > 0 ? 'Cartaz de procurado' : 'Sem cartaz';
}
function addRep(c, n) {
  if (c.gm || !n) return;
  const was = c.recompensa || 0, wasRank = rankOf(c);
  c.rep = Math.max(0, Math.round((c.rep || 0) + n));
  if (c.faccao === 'pirata') {
    const nb = bountyFromRep(c.rep);
    if (nb > was) { c.recompensa = nb; levelMsg(c, 'O cartaz de procurado de ' + c.nome + ' subiu para ' + berry(nb) + ' Berries. (' + titulo(c) + ')'); refreshChar(c, false); return; }
  } else if (rankOf(c) > wasRank) { levelMsg(c, c.nome + ' foi promovido a ' + PATENTES[rankOf(c)][0] + '!'); refreshChar(c, false); return; }
  commit('chars', c.id, c);
}

// ---- Derrotas e prisões ----
function sendToPrison(c) {
  if (c.gm || c.faccao !== 'pirata' || c.prisao) return;
  const pesada = isPesada(c), lugar = pesada ? 'impel' : 'enies', ch = chanOf(c), antes = c.recompensa || 0;
  if (pesada) { loseLevels(c, tune.impelLv); c.recompensa = Math.round(antes * (1 - tune.impelBounty)); }
  else { loseXp(c, tune.enieXp * xpNext(c.lv)); c.recompensa = Math.round(antes * (1 - tune.enieBounty)); }
  c.rep = Math.min(c.rep || 0, c.recompensa ? repFromBounty(c.recompensa) : tune.repFirstBounty - 1);
  c.prisao = { lugar, ate: Date.now() + (pesada ? tune.impelSec : tune.enieSec) * 1000 };
  Object.values(db.tokens).filter(t => t.owner === c.id && t.pc).forEach(t => commit('tokens', t.id, null));
  commit('chars', c.id, c);
  sysMsg(ch, c.nome + ' foi capturado pela Marinha e levado para ' + (pesada ? 'Impel Down' : 'Enies Lobby') + '! Recompensa: ' + berry(antes) + ' → ' + berry(c.recompensa) + ' Berries.');
  sysMsg('prisao-' + lugar, c.nome + ' chega acorrentado. Pena: ' + Math.round((pesada ? tune.impelSec : tune.enieSec) / 60 * 10) / 10 + ' minutos.');
}
function releasePrison(c, why) {
  if (!c.prisao) return;
  const lugar = c.prisao.lugar; c.prisao = null; refreshChar(c, true);
  sysMsg('prisao-' + lugar, c.nome + ' ' + (why || 'cumpriu a pena e é solto') + '.');
  sysMsg(chanOf(c), c.nome + ' volta à tripulação.');
}
function navyDefeated(c) { // marinheiro vencido por pirata
  if (c.gm || c.faccao !== 'marinha') return;
  const lost = loseXp(c, tune.navyLoseXp * xpNext(c.lv)); const r = Math.round((c.rep || 0) * tune.navyLoseRep); c.rep = Math.max(0, (c.rep || 0) - r);
  commit('chars', c.id, c); sysMsg(chanOf(c), c.nome + ' foi derrotado por piratas: −' + lost + ' XP e −' + r + ' de reputação.');
}

// ---- Ataques criados: dano inicial + efeitos comprados com Energia ----
const FX = {
  dano:     { nome: '+Dano',     max: 3, desc: '+1d6 de dano por compra' },
  veneno:   { nome: 'Veneno',    max: 1, desc: 'Dano por 3 turnos' },
  atordoar: { nome: 'Atordoar',  max: 1, desc: 'O alvo perde o próximo turno se falhar no teste' },
  prender:  { nome: 'Prender',   max: 1, desc: 'O alvo não anda por 2 turnos se falhar no teste' },
  queimar:  { nome: 'Queimar',   max: 1, desc: 'Dano de fogo por 2 turnos' },
  alcance:  { nome: '+Alcance',  max: 2, desc: '+2 quadrados por compra' },
};
function fxCost(c, k) {
  let v = tune['fx' + k[0].toUpperCase() + k.slice(1)];
  if (k === 'atordoar' && (RACES[c.raca] || {}).electro) v = Math.max(1, v - 1);
  return v;
}
const atkCost = (c, fx) => tune.atkBase + fx.reduce((a, k) => a + fxCost(c, k), 0);
const atkCap = c => tune.atkCapBase + Math.floor((c.lv || 1) / tune.atkCapLv);
const countFx = (fx, k) => fx.filter(x => x === k).length;
// "Golpe básico": sempre à mão, custa 0 de Energia
const BASIC = { id: 'basico', nome: 'Golpe básico', fx: [], custo: 0 };
function atkDice(c, fx) { // texto do dano: dado da classe + dados de +dano
  const cl = CLASSES[c.classe] || CLASSES.lutador, n = countFx(fx, 'dano');
  return '1d' + cl.dado + (n ? '+' + n + 'd6' : '');
}
function atkReach(c, fx) { return ((CLASSES[c.classe] || {}).reach || 1) + ((RACES[c.raca] || {}).reach || 0) + countFx(fx, 'alcance') * 2; }
