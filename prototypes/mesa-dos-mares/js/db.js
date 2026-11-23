// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// Estado compartilhado: stand-in do Supabase. Cada aba é um participante.
//  - durável: tabelas em localStorage, mudanças enviadas por BroadcastChannel (como postgres_changes)
//  - efêmero: posições ao vivo e golpes da luta 3D por BroadcastChannel (como broadcast)
// Trocar pelo Supabase real = reescrever commit(), loadDb() e o receptor do canal; o resto do jogo só fala com estas funções.
'use strict';

const DB_KEY = 'mdm-db-v2';

// ---- Os quatro mares e as ilhas (canon:false = ilha original desta mesa) ----
const SEAS = {
  east:  { nome: 'East Blue',  cor: '#2a9bb8' },
  north: { nome: 'North Blue', cor: '#3f6fa8' },
  west:  { nome: 'West Blue',  cor: '#2f8f7a' },
  south: { nome: 'South Blue', cor: '#3a86c4' },
};
// cx, cy: lugar na carta náutica do mar (0 a 1)
const ISLANDS = [
  { id: 'foosha',     mar: 'east',  nome: 'Vila Foosha',      cx: 0.14, cy: 0.70, tema: 'vila',   telhado: 0xc4472f, intro: 'Um vilarejo pacato de moinhos e campos de trigo. No porto, pescadores remendam redes; no alto da colina, um bar de madeira cheira a carne assada.' },
  { id: 'shimotsuki', mar: 'east',  nome: 'Vila Shimotsuki',  cx: 0.30, cy: 0.28, tema: 'vila',   telhado: 0x8a5a3a, intro: 'Um vilarejo de telhados escuros em volta de um dojo antigo. O som de espadas de madeira começa antes do sol.' },
  { id: 'shells',     mar: 'east',  nome: 'Shells Town',      cx: 0.36, cy: 0.60, tema: 'base',   telhado: 0x2f5fa8, intro: 'Uma cidade portuária dominada pela Base da Marinha. O muro alto e o pátio de treino fazem os moradores falarem baixo pelas ruas.' },
  { id: 'syrup',      mar: 'east',  nome: 'Vila Syrup',       cx: 0.52, cy: 0.36, tema: 'vila',   telhado: 0xb05a2e, intro: 'Um vilarejo de colinas e uma mansão branca no alto. As crianças juram que piratas chegam toda manhã.' },
  { id: 'orange',     mar: 'east',  nome: 'Orange Town',      cx: 0.56, cy: 0.68, tema: 'cidade', telhado: 0xe08a2a, intro: 'Telhados laranja, ruas estreitas e janelas fechadas. Dizem que um bando de piratas tomou a cidade na semana passada.' },
  { id: 'baratie',    mar: 'east',  nome: 'Baratie',          cx: 0.72, cy: 0.46, tema: 'navio',  telhado: 0xd8c08a, intro: 'Um restaurante flutuante em forma de navio, ancorado em mar aberto. Da cozinha saem gritos, panelas voando e o melhor cheiro do East Blue.' },
  { id: 'cocoyasi',   mar: 'east',  nome: 'Vila Cocoyasi',    cx: 0.82, cy: 0.72, tema: 'vila',   telhado: 0xd06a3a, intro: 'Pomares de tangerina e casas baixas. Os moradores olham o mar com desconfiança.' },
  { id: 'logue',      mar: 'east',  nome: 'Loguetown',        cx: 0.88, cy: 0.24, tema: 'cidade', telhado: 0x6b6b7a, intro: 'A cidade do começo e do fim. Um cadafalso na praça, uma base da Marinha atenta e o caminho para a Grand Line logo ali.' },
  { id: 'flevance',   mar: 'north', nome: 'Flevance',         cx: 0.20, cy: 0.40, tema: 'cidade', telhado: 0xe8e8e8, intro: 'Uma cidade de ruas brancas, bonita demais para ser tranquila.' },
  { id: 'minion',     mar: 'north', nome: 'Ilha Minion',      cx: 0.38, cy: 0.72, tema: 'vila',   telhado: 0x9aa8b0, intro: 'Neve o ano inteiro e um vilarejo pequeno onde todo forasteiro é notado.' },
  { id: 'spider',     mar: 'north', nome: 'Spider Miles',     cx: 0.56, cy: 0.30, tema: 'cidade', telhado: 0x5a4a3a, intro: 'Um porto de sucata e fumaça. Quem manda aqui não usa uniforme.' },
  { id: 'lvneel',     mar: 'north', nome: 'Reino de Lvneel',  cx: 0.74, cy: 0.58, tema: 'cidade', telhado: 0x8a3a3a, intro: 'Um reino antigo de histórias de ouro e mentirosos famosos.' },
  { id: 'swallow',    mar: 'north', nome: 'Ilha Swallow',     cx: 0.86, cy: 0.26, tema: 'vila',   telhado: 0x6a8aa8, intro: 'Uma ilha fria e tranquila, boa para quem precisa sumir por um tempo.' },
  { id: 'fortenorte', mar: 'north', nome: 'Forte Norte',      cx: 0.50, cy: 0.86, tema: 'base',   telhado: 0x2f5fa8, canon: false, intro: 'Uma base da Marinha de pedra cinza, castigada pelo gelo.' },
  { id: 'ohara',      mar: 'west',  nome: 'Ohara',            cx: 0.24, cy: 0.52, tema: 'vila',   telhado: 0x7a8a4a, intro: 'Uma ilha de estudiosos em volta de uma árvore gigante cheia de livros.' },
  { id: 'ventania',   mar: 'west',  nome: 'Porto Ventania',   cx: 0.50, cy: 0.28, tema: 'cidade', telhado: 0xa86a3a, canon: false, intro: 'Um porto de contrabandistas onde o vento nunca para.' },
  { id: 'serena',     mar: 'west',  nome: 'Ilha Serena',      cx: 0.70, cy: 0.66, tema: 'vila',   telhado: 0xc49a5a, canon: false, intro: 'Praias calmas e uma vila de pescadores que esconde mais do que mostra.' },
  { id: 'fortewest',  mar: 'west',  nome: 'Forte Oeste',      cx: 0.86, cy: 0.40, tema: 'base',   telhado: 0x2f5fa8, canon: false, intro: 'A base da Marinha que vigia as rotas do West Blue.' },
  { id: 'baterilla',  mar: 'south', nome: 'Baterilla',        cx: 0.22, cy: 0.40, tema: 'vila',   telhado: 0xc4872f, intro: 'Uma ilha de casas coloridas e um passado que ninguém comenta.' },
  { id: 'sorbet',     mar: 'south', nome: 'Reino de Sorbet',  cx: 0.48, cy: 0.68, tema: 'cidade', telhado: 0x8a5aa8, intro: 'Um reino de igrejas e conventos, cheio de gente que precisa de proteção.' },
  { id: 'coral',      mar: 'south', nome: 'Recife Coral',     cx: 0.70, cy: 0.32, tema: 'vila',   telhado: 0xe07a6a, canon: false, intro: 'Uma vila sobre corais, onde tritões e humanos dividem o mercado.' },
  { id: 'fortesul',   mar: 'south', nome: 'Forte Sul',        cx: 0.86, cy: 0.66, tema: 'base',   telhado: 0x2f5fa8, canon: false, intro: 'A base da Marinha do South Blue, sempre à espera de reforços.' },
];
const ISLAND = Object.fromEntries(ISLANDS.map(i => [i.id, i]));
const islandsOf = mar => ISLANDS.filter(i => i.mar === mar);
const isBase = isl => !!isl && isl.tema === 'base';

const ATTRS = [
  { k: 'FOR', nome: 'Força' }, { k: 'AGI', nome: 'Agilidade' }, { k: 'VIG', nome: 'Vigor' },
  { k: 'TEC', nome: 'Técnica' }, { k: 'ESP', nome: 'Espírito' }, { k: 'CAR', nome: 'Carisma' },
];

// ---- Raças: atributos e um especial cada. As duas raras só saem na roleta (1% cada, uma vez por conta) ----
const RACES = {
  humano:    { nome: 'Humano', mods: { CAR: 1, TEC: 1 }, esp: 'Versátil: ganha 10% mais XP.', xpMul: 1.1 },
  bracos:    { nome: 'Braços Longos', mods: { FOR: 1, TEC: 1 }, esp: 'Alcance: +1 quadrado em todo ataque.', reach: 1 },
  pernas:    { nome: 'Pernas Longas', mods: { AGI: 2 }, esp: 'Passada longa: +2 na iniciativa e +1 na Defesa.', ini: 2, def: 1 },
  pescoco:   { nome: 'Pescoço Longo', mods: { ESP: 1, TEC: 1 }, esp: 'Vigia: +3 nos testes contra eventos do mar.', evento: 3 },
  tritao:    { nome: 'Tritão / Sereiano', mods: { VIG: 1, AGI: 1 }, esp: 'Filho do mar: +2 nos testes do mar e nunca se afoga.', evento: 2 },
  gigante:   { nome: 'Gigante', mods: { FOR: 3, VIG: 2, AGI: -2 }, esp: 'Enorme: Vida +50% e token 2x2.', hpMul: 1.5, size: 2 },
  tontatta:  { nome: 'Tontatta', mods: { AGI: 3, FOR: -1 }, esp: 'Miúdo e veloz: Defesa +3; difícil de acertar.', def: 3, size: 0.7 },
  mink:      { nome: 'Mink', mods: { AGI: 1, FOR: 1 }, esp: 'Electro: seus golpes que atordoam custam 1 Energia a menos.', electro: true },
  ancestral: { nome: 'Gigante Ancestral', rare: true, mods: { FOR: 5, VIG: 4, AGI: -1 }, esp: 'Lendário: Vida em dobro, token 3x3 e +2 de dano em todo ataque.', hpMul: 2, size: 3, dmg: 2 },
  lunariano: { nome: 'Lunariano', rare: true, mods: { FOR: 2, AGI: 2, VIG: 2, ESP: 2 }, esp: 'Chama nas costas: Defesa +3 enquanto tiver Energia e imune a queimadura.', def: 3, fireImmune: true },
};
const CLASSES = {
  lutador:    { nome: 'Lutador',    atk: 'FOR', dado: 6, hp: 3, reach: 1, desc: 'Punhos e chutes: +3 de Vida, dano 1d6 e ataca de perto.' },
  espadachim: { nome: 'Espadachim', atk: 'FOR', dado: 8, hp: 0, reach: 1, desc: 'Lâminas: dano base 1d8, ataca de perto.' },
  atirador:   { nome: 'Atirador',   atk: 'TEC', dado: 8, hp: 0, reach: 6, desc: 'Armas de fogo: dano base 1d8, ataca de longe (6 quadrados).' },
};
const PROFS = {
  carpinteiro: { nome: 'Carpinteiro', desc: 'Conserta o casco em viagem e na luta naval, e paga metade no reparo do comércio.' },
  navegador:   { nome: 'Navegador',   desc: 'A viagem é 25% mais curta e +3 nos testes de clima.' },
  timoneiro:   { nome: 'Timoneiro',   desc: '+2 nos testes de clima; o navio vira melhor e desvia de tiros na luta 3D.' },
  cozinheiro:  { nome: 'Cozinheiro',  desc: 'A tripulação gasta metade da comida e recupera Energia ao chegar.' },
  medico:      { nome: 'Médico',      desc: 'A tripulação recupera Vida ao chegar e perde menos XP nas derrotas.' },
};
// NPCs: o nível manda na Vida, no ataque e na defesa (veja npcHp, npcAtk, npcDef)
const NPC_KINDS = {
  aldeao:    { nome: 'Aldeão',             lv: 1,  mul: 0.6, cor: '#7a5a34' },
  bandido:   { nome: 'Bandido',            lv: 3,  mul: 0.9, cor: '#5b4636' },
  marujo:    { nome: 'Marinheiro',         lv: 4,  mul: 1.0, cor: '#2f5fa8' },
  cozinha:   { nome: 'Cozinheiro',         lv: 5,  mul: 0.9, cor: '#a0782a' },
  rival:     { nome: 'Pirata Rival',       lv: 8,  mul: 1.2, cor: '#8f2222' },
  oficial:   { nome: 'Oficial da Marinha', lv: 12, mul: 1.5, cor: '#1f3f7a' },
  tenryu:    { nome: 'Tenryubito',         lv: 1,  mul: 0.8, cor: '#d8c08a' },
  almirante: { nome: 'Almirante',          lv: 90, mul: 2.0, cor: '#1f3f7a' },
};
const npcHp = (kind, lv) => Math.round((10 + lv * 6) * ((NPC_KINDS[kind] || {}).mul || 1));
const npcAtk = lv => 2 + Math.floor(lv / 2);
const npcDef = lv => 10 + Math.floor(lv / 3);
// Patentes da Marinha e a reputação de cada uma (multiplicada por rankRepMul em config.js)
const PATENTES = [
  ['Marinheiro Raso', 0], ['Cabo', 50], ['Sargento', 150], ['Sargento-Mor', 300], ['Tenente', 600], ['Tenente-Comandante', 1000],
  ['Comandante', 1600], ['Capitão', 2500], ['Comodoro', 4000], ['Contra-Almirante', 6500], ['Vice-Almirante', 10000],
  ['Almirante', 16000], ['Almirante de Frota', 25000],
];
const RANK_ALM = 11, RANK_FROTA = 12;
const ALM_NOMES = ['Almirante Granizo', 'Almirante Magma', 'Almirante Raio'], FROTA_NOME = 'Almirante de Frota Ferro';

// ---- Identidade da aba ----
function uid() { // ids de linha, não jogo
  const a = new Uint32Array(2); crypto.getRandomValues(a); return a[0].toString(36) + a[1].toString(36);
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h | 0; }
let myId = sessionStorage.getItem('mdm-me') || null;
let myAcc = sessionStorage.getItem('mdm-acc') || null;

// ---- Banco ----
let db = null;
function emptyDb() {
  return {
    accounts: {}, chars: {}, tokens: {}, msgs: [], combat: {}, naval: {}, ships: {}, islandCfg: {}, missions: {},
    world: { wind: Math.PI * 0.75, created: Date.now(), auto: true },
    cargos: { almirantes: [null, null, null], frota: null },
  };
}
function loadDb() {
  try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { db = null; }
  if (!db || !db.chars) db = emptyDb();
  const e = emptyDb(); Object.keys(e).forEach(k => { if (db[k] === undefined) db[k] = e[k]; });
}
let saveTimer = 0;
function saveDb() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch (e) { toast('Armazenamento cheio: imagens grandes demais?'); }
  }, 150);
}
function resetDb() { localStorage.removeItem(DB_KEY); sessionStorage.removeItem('mdm-me'); sessionStorage.removeItem('mdm-acc'); bc && bc.postMessage({ t: 'reset' }); }

// ---- Canal entre abas ----
const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('mesa-dos-mares') : null;
const dirty = { accounts: true, chars: true, tokens: true, msgs: true, combat: true, ships: true, world: true, naval: true, cargos: true, islandCfg: true, missions: true };
const listeners = []; // fn(table, row, remote) chamado em toda mudança (local ou remota)
const bcHandlers = {}; // mensagens efêmeras de outros módulos: bcHandlers[tipo] = fn(msg)
function emit(table, row, remote) { dirty[table] = true; listeners.forEach(f => f(table, row, remote)); }

// commit: grava local (otimista), persiste e avisa as outras abas. key === null: a tabela inteira é a linha (cargos, world).
function commit(table, key, row) {
  if (table === 'msgs') { db.msgs.push(row); trimMsgs(); }
  else if (key === null) db[table] = row;
  else if (row === null) delete db[table][key];
  else db[table][key] = row;
  saveDb(); emit(table, row, false);
  bc && bc.postMessage({ t: 'row', table, key, row });
}
function trimMsgs() { const cap = tune.msgCap; if (db.msgs.length > cap) db.msgs.splice(0, db.msgs.length - cap); }
function clearChannel(ch) {
  db.msgs = db.msgs.filter(m => m.ch !== ch); saveDb(); emit('msgs', null, false);
  bc && bc.postMessage({ t: 'clear', ch });
}
function sendTokMove(id, x, y) { bc && bc.postMessage({ t: 'tmove', id, x, y }); }
function broadcast(msg) { bc && bc.postMessage(msg); }

if (bc) bc.onmessage = ev => {
  const m = ev.data;
  if (m.t === 'row') {
    if (m.table === 'msgs') { if (!db.msgs.some(x => x.id === m.row.id)) { db.msgs.push(m.row); trimMsgs(); } }
    else if (m.key === null) db[m.table] = m.row;
    else if (m.row === null) delete db[m.table][m.key];
    else db[m.table][m.key] = m.row;
    saveDb(); emit(m.table, m.row, true);
  } else if (m.t === 'tmove') {
    const tk = db.tokens[m.id]; if (tk) { tk.x = m.x; tk.y = m.y; dirty.tokens = true; }
  } else if (m.t === 'clear') {
    db.msgs = db.msgs.filter(x => x.ch !== m.ch); emit('msgs', null, true);
  } else if (m.t === 'reset') { location.reload(); }
  else if (bcHandlers[m.t]) bcHandlers[m.t](m);
};

// ---- Quem sou, navios e canais ----
const me = () => (myId && db.chars[myId]) || null;
const isGM = () => !!(me() && me().gm);
const shipKey = c => (c && !c.gm ? c.faccao + '@' + c.mar : null);
const shipOf = c => (c && !c.gm ? db.ships[shipKey(c)] : null) || null;
function ensureShip(fac, mar, at) {
  const key = fac + '@' + mar;
  if (!db.ships[key]) commit('ships', key, { key, fac, mar, at: at || islandsOf(mar)[0].id, travel: null, casco: tune.shipCasco, cascoMax: tune.shipCasco, comida: tune.foodStart, canhoes: tune.navalCanhoes, velas: 0 });
  return db.ships[key];
}
const shipName = s => (s.fac === 'marinha' ? 'Navio da Marinha' : 'Navio pirata') + ' · ' + SEAS[s.mar].nome;
// Canal de chat de um personagem: a prisão, a ilha onde o navio está, ou o convés no mar.
function chanOf(c) {
  if (!c) return null;
  if (c.gm) return c.view || ISLANDS[0].id;
  if (c.prisao) return 'prisao-' + c.prisao.lugar;
  const s = shipOf(c);
  return s && s.at ? s.at : 'navio-' + shipKey(c);
}
function chanName(ch) {
  if (!ch) return '';
  if (ch === 'prisao-enies') return 'Enies Lobby (prisão)';
  if (ch === 'prisao-impel') return 'Impel Down (prisão)';
  if (ch.startsWith('navio-')) { const s = db.ships[ch.slice(6)]; return s ? 'Convés · ' + shipName(s).replace(' · ', ' · ') : 'Convés'; }
  return ISLAND[ch] ? ISLAND[ch].nome : ch;
}
const isIsland = ch => !!ISLAND[ch];
const isDeck = ch => !!ch && ch.startsWith('navio-');
const isPrison = ch => !!ch && ch.startsWith('prisao-');
function whoIn(ch) { return Object.values(db.chars).filter(c => chanOf(c) === ch); }
function crewOf(key) { return Object.values(db.chars).filter(c => !c.gm && !c.prisao && shipKey(c) === key); }
function profOn(key, prof) { // o melhor tripulante com essa profissão
  let best = null; crewOf(key).forEach(c => { if (c.prof === prof && (!best || attr(c, 'TEC') > attr(best, 'TEC'))) best = c; }); return best;
}

// ---- Atributos totais: base + raça + bônus da carreira (recompensa ou patente) ----
function attr(c, k) {
  if (!c || !c.attrs) return 0;
  const r = RACES[c.raca] || {};
  return (c.attrs[k] || 0) + ((r.mods || {})[k] || 0) + (typeof careerBonus === 'function' ? careerBonus(c) : 0);
}
function hpMaxOf(c) {
  const r = RACES[c.raca] || {}, cl = CLASSES[c.classe] || {};
  return Math.round((tune.hpBase + attr(c, 'VIG') * tune.hpPerVig + (c.lv || 1) * tune.hpPerLv + (cl.hp || 0)) * (r.hpMul || 1));
}
const stMaxOf = c => tune.stBase + attr(c, 'ESP') * tune.stPerEsp + Math.floor((c.lv || 1) / 2);
function defOf(c) {
  const r = RACES[c.raca] || {};
  return tune.defBase + attr(c, 'AGI') + Math.floor((c.lv || 1) / 10) + ((r.def && !(c.raca === 'lunariano' && !(c.st > 0))) ? r.def : 0);
}

// ---- Dados (rng seeded para o resultado) ----
function roll(sides) { return 1 + Math.floor(rng() * sides); }
// Aceita "1d20+4", "2d6", "3d6-1", "d20+FOR" (atributos do personagem viram números).
function parseRolagem(src, c) {
  let f = String(src || '').replace(/\s+/g, '').toUpperCase();
  if (!f) return { erro: 'Fórmula vazia.' };
  f = f.replace(/\b(FOR|AGI|VIG|TEC|ESP|CAR)\b/g, k => String(attr(c, k)));
  f = f.replace(/\+-/g, '-').replace(/--/g, '+');
  const terms = f.match(/[+-]?[^+-]+/g);
  if (!terms) return { erro: 'Não entendi "' + src + '".' };
  let total = 0, n = 0; const det = [];
  for (const t0 of terms) {
    const sign = t0[0] === '-' ? -1 : 1, t = t0.replace(/^[+-]/, '');
    const m = t.match(/^(\d*)D(\d+)$/);
    if (m) {
      const q = m[1] ? +m[1] : 1, s = +m[2];
      if (s < 2 || s > 1000) return { erro: 'Dado de ' + s + ' lados? Use de 2 a 1000.' };
      n += q; if (n > tune.maxDice) return { erro: 'Máximo de ' + tune.maxDice + ' dados.' };
      const r = []; for (let i = 0; i < q; i++) r.push(roll(s));
      const sum = r.reduce((a, b) => a + b, 0); total += sign * sum; det.push({ d: q, s, r, sign });
    } else if (/^\d+$/.test(t)) { total += sign * +t; det.push({ k: sign * +t }); }
    else return { erro: 'Não entendi "' + t + '".' };
  }
  return { total, det, formula: f };
}
// d20 + bônus com modo: normal, vantagem (maior), desvantagem (menor).
function rolarD20(bonus, modo) {
  const a = roll(20), b = modo === 'normal' || !modo ? null : roll(20);
  let kept = a, drop = null;
  if (b !== null) { if (modo === 'vantagem' ? b > a : b < a) { kept = b; drop = a; } else drop = b; }
  return { total: kept + bonus, nat: kept, det: [{ d: 1, s: 20, r: [kept], x: drop === null ? [] : [drop], sign: 1 }, ...(bonus ? [{ k: bonus }] : [])], formula: '1d20' + (bonus >= 0 ? '+' : '') + bonus };
}
