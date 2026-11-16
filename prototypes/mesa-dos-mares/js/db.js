// PROTOTYPE - NOT FOR PRODUCTION
// Question: O ciclo navegar → atracar → jogar pelo chat da ilha → zarpar funciona como mesa de RPG, e o chat é gostoso de usar para interpretar?
// Date: 2026-11-16
// Estado compartilhado: stand-in do Supabase. Cada aba é um participante.
//  - durável: tabelas em localStorage, mudanças enviadas por BroadcastChannel (como postgres_changes)
//  - efêmero: posição do navio ao vivo por BroadcastChannel (como broadcast)
'use strict';

const DB_KEY = 'mdm-db-v1';
const ISLANDS = [
  { id: 'foosha',  nome: 'Vila Foosha',  x: -210, z: 170,  r: 26, tema: 'vila',   telhado: 0xc4472f,
    intro: 'Um vilarejo pacato de moinhos e campos de trigo. No porto, pescadores remendam redes; no alto da colina, um bar de madeira cheira a carne assada.' },
  { id: 'shells',  nome: 'Shells Town',  x: -10,  z: 20,   r: 30, tema: 'base',   telhado: 0x2f5fa8,
    intro: 'Uma cidade portuária dominada pela Base da Marinha. O muro alto e o pátio de treino fazem os moradores falarem baixo pelas ruas.' },
  { id: 'orange',  nome: 'Orange Town',  x: 190,  z: 110,  r: 28, tema: 'cidade', telhado: 0xe08a2a,
    intro: 'Telhados laranja, ruas estreitas e janelas fechadas. Dizem que um bando de piratas tomou a cidade na semana passada.' },
  { id: 'baratie', nome: 'Baratie',      x: 70,   z: -190, r: 22, tema: 'navio',  telhado: 0xd8c08a,
    intro: 'Um restaurante flutuante em forma de navio, ancorado em mar aberto. Da cozinha saem gritos, panelas voando e o melhor cheiro do East Blue.' },
];
const ISLAND = Object.fromEntries(ISLANDS.map(i => [i.id, i]));

const ATTRS = [
  { k: 'FOR', nome: 'Força' }, { k: 'AGI', nome: 'Agilidade' }, { k: 'VIG', nome: 'Vigor' },
  { k: 'TEC', nome: 'Técnica' }, { k: 'ESP', nome: 'Espírito' }, { k: 'CAR', nome: 'Carisma' },
];
const ESTILOS = {
  espadachim: { nome: 'Espadachim', atk: 'FOR', dano: '1d8', desc: 'Lâminas. Ataque com FOR, dano 1d8+FOR.' },
  atirador:   { nome: 'Atirador',   atk: 'TEC', dano: '1d8', desc: 'Armas de fogo e estilingue. Ataque com TEC, dano 1d8+TEC.' },
  lutador:    { nome: 'Lutador',    atk: 'FOR', dano: '1d6', desc: 'Mãos e pernas. Ataque com FOR, dano 1d6+FOR, +2 Vida.' },
  navegador:  { nome: 'Navegador',  atk: 'TEC', dano: '1d4', desc: 'Lê vento e mar: o navio anda mais rápido com você a bordo.' },
  cozinheiro: { nome: 'Cozinheiro', atk: 'FOR', dano: '1d6', desc: 'Uma refeição recupera 1d6+CAR de Estamina da tripulação.' },
  medico:     { nome: 'Médico',     atk: 'TEC', dano: '1d4', desc: 'Tratar recupera 1d8+ESP de Vida de um aliado.' },
};
const NPC_KINDS = {
  aldeao:   { nome: 'Aldeão',            hp: 6,  ini: 0, cor: '#7a5a34' },
  bandido:  { nome: 'Bandido',           hp: 9,  ini: 1, cor: '#5b4636' },
  marujo:   { nome: 'Marinheiro',        hp: 10, ini: 1, cor: '#2f5fa8' },
  oficial:  { nome: 'Oficial da Marinha',hp: 16, ini: 2, cor: '#1f3f7a' },
  cozinha:  { nome: 'Cozinheiro',        hp: 12, ini: 2, cor: '#a0782a' },
  rival:    { nome: 'Pirata Rival',      hp: 14, ini: 2, cor: '#8f2222' },
};
const PATENTES = ['Marinheiro Raso', 'Cabo', 'Sargento', 'Tenente', 'Capitão'];

// ---- Identidade da aba ----
function uid() { // ids de linha, não jogo
  const a = new Uint32Array(2); crypto.getRandomValues(a); return a[0].toString(36) + a[1].toString(36);
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h | 0; }
let myId = sessionStorage.getItem('mdm-me') || null;

// ---- Banco ----
let db = null;
function emptyDb() {
  const d = {
    chars: {}, tokens: {}, msgs: [], combat: {},
    ships: {
      pirata:  { x: -205, z: 255, h: Math.PI, speed: 0, sail: 0, at: null, pilot: null, route: [] },
      marinha: { x: -10,  z: -30, h: 0.6,     speed: 0, sail: 0, at: null, pilot: null, route: [] },
    },
    world: { wind: Math.PI * 0.75, created: Date.now() },
  };
  // Cada ilha começa com a narração de abertura e alguns NPCs.
  const t0 = Date.now() - 60000;
  ISLANDS.forEach((isl, i) => {
    d.msgs.push({ id: 'intro-' + isl.id, ch: isl.id, uid: 'diario', nome: 'Diário de Bordo', tipo: 'narra',
      txt: '**' + isl.nome + '.** ' + isl.intro, ts: t0 + i });
  });
  const npcs = {
    foosha:  [['aldeao', 'Prefeito', 12, 8], ['aldeao', 'Dona do Bar', 15, 6], ['bandido', 'Bandido da Montanha', 18, 10]],
    shells:  [['marujo', 'Sentinela', 11, 6], ['marujo', 'Sentinela', 13, 6], ['oficial', 'Capitão da Base', 12, 4]],
    orange:  [['rival', 'Capitão Rival', 13, 7], ['bandido', 'Capanga', 11, 9], ['bandido', 'Capanga', 15, 9], ['aldeao', 'Lojista', 7, 11]],
    baratie: [['cozinha', 'Chef Chefe', 12, 6], ['cozinha', 'Garçom', 9, 8], ['rival', 'Cliente Mal-Encarado', 15, 9]],
  };
  Object.entries(npcs).forEach(([isl, list]) => list.forEach(([kind, nome, x, y], j) => {
    const id = 'npc-' + isl + '-' + j, k = NPC_KINDS[kind];
    d.tokens[id] = { id, isl, owner: 'gm', kind, nome, img: null, x, y, hp: k.hp, hpMax: k.hp, st: 0, stMax: 0, pub: false, seed: j + 3 };
  }));
  return d;
}
function loadDb() {
  try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { db = null; }
  if (!db || !db.ships) db = emptyDb();
}
let saveTimer = 0;
function saveDb() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch (e) { toast('Armazenamento cheio: imagens grandes demais?'); }
  }, 150);
}
function resetDb() { localStorage.removeItem(DB_KEY); sessionStorage.removeItem('mdm-me'); bc && bc.postMessage({ t: 'reset' }); }

// ---- Canal entre abas ----
const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('mesa-dos-mares') : null;
const dirty = { chars: true, tokens: true, msgs: true, combat: true, ships: true, world: true };
const listeners = []; // fn(table, row) chamado em toda mudança (local ou remota)
function emit(table, row, remote) { dirty[table] = true; listeners.forEach(f => f(table, row, remote)); }

// commit: grava local (otimista), persiste e avisa as outras abas.
function commit(table, key, row) {
  if (table === 'msgs') { db.msgs.push(row); trimMsgs(); }
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
// Efêmero: pose do navio, sem gravar a cada envio.
function sendTokMove(id, x, y) { bc && bc.postMessage({ t: 'tmove', id, x, y }); }
function sendPose(f, s) { bc && bc.postMessage({ t: 'pose', f, s: { x: s.x, z: s.z, h: s.h, speed: s.speed, sail: s.sail, pilot: s.pilot } }); }

if (bc) bc.onmessage = ev => {
  const m = ev.data;
  if (m.t === 'row') {
    if (m.table === 'msgs') { if (!db.msgs.some(x => x.id === m.row.id)) { db.msgs.push(m.row); trimMsgs(); } }
    else if (m.row === null) delete db[m.table][m.key];
    else db[m.table][m.key] = m.row;
    emit(m.table, m.row, true);
  } else if (m.t === 'pose') {
    const s = db.ships[m.f]; if (!s) return;
    if (s.pilot === myId && m.s.pilot !== myId && pilotingNow()) return; // anti-eco: eu estou pilotando
    Object.assign(s, m.s); s.remoteAt = clock.now(); emit('ships', s, true);
  } else if (m.t === 'tmove') { // token sendo arrastado por alguém
    const tk = db.tokens[m.id]; if (tk) { tk.x = m.x; tk.y = m.y; dirty.tokens = true; }
  } else if (m.t === 'clear') {
    db.msgs = db.msgs.filter(x => x.ch !== m.ch); emit('msgs', null, true);
  } else if (m.t === 'reset') { location.reload(); }
};

// ---- Regras ----
const me = () => (myId && db.chars[myId]) || null;
const isGM = () => !!(me() && me().gm);
function attr(c, k) { return (c && c.attrs && c.attrs[k]) || 0; }
function hpMaxOf(c) { return tune.hpBase + attr(c, 'VIG') * tune.hpPerVig + (c.estilo === 'lutador' ? 2 : 0); }
function stMaxOf(c) { return tune.stBase + attr(c, 'ESP') * tune.stPerEsp; }
function defOf(c) { return tune.defBase + attr(c, 'AGI'); }
function crewOf(f) { return Object.values(db.chars).filter(c => !c.gm && c.faccao === f); }
function navOf(f) { // o melhor Navegador a bordo
  let best = null;
  crewOf(f).forEach(c => { if (c.estilo === 'navegador' && (!best || attr(c, 'TEC') > attr(best, 'TEC'))) best = c; });
  return best;
}
// Canal de chat de um personagem: a ilha onde o navio dele está atracado, ou o convés.
function chanOf(c) {
  if (!c) return null;
  if (c.gm) return c.view || 'navio-pirata';
  const s = db.ships[c.faccao];
  return s && s.at ? s.at : 'navio-' + c.faccao;
}
function chanName(ch) {
  if (!ch) return '';
  if (ch === 'navio-pirata') return 'Convés do navio pirata';
  if (ch === 'navio-marinha') return 'Convés do navio da Marinha';
  return ISLAND[ch] ? ISLAND[ch].nome : ch;
}
const isIsland = ch => !!ISLAND[ch];
function whoIn(ch) { return Object.values(db.chars).filter(c => chanOf(c) === ch); }

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
  const a = roll(20), b = modo === 'normal' ? null : roll(20);
  let kept = a, drop = null;
  if (b !== null) { if (modo === 'vantagem' ? b > a : b < a) { kept = b; drop = a; } else drop = b; }
  return { total: kept + bonus, nat: kept, det: [{ d: 1, s: 20, r: [kept], x: drop === null ? [] : [drop], sign: 1 }, ...(bonus ? [{ k: bonus }] : [])], formula: '1d20' + (bonus >= 0 ? '+' : '') + bonus };
}
