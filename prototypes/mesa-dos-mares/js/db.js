// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// Estado compartilhado: stand-in do Supabase. Cada aba é um participante.
//  - durável: tabelas em localStorage, mudanças enviadas por BroadcastChannel (como postgres_changes)
//  - efêmero: posições ao vivo e golpes da luta 3D por BroadcastChannel (como broadcast)
// Trocar pelo Supabase real = reescrever Net, commit() e carregarTudo(); o resto do jogo só fala com estas funções.
'use strict';


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

// Atributos, espécies, estilos e profissões: OP RPG (js/opdata.js). Os nomes abaixo ficam para o resto do jogo.
const ATTRS = ATRIBUTOS.map(a => ({ k: a.k, nome: a.nome }));
const ficha_antiga = { nome: 'Ficha antiga', esp: 'Personagem criado nas regras anteriores: refaça pelo livro.', desc: '', mods: {}, atk: 'FOR', dado: 6, hp: 0, reach: 1, size: 1 };
const comFallback = obj => new Proxy(obj, { get: (t, k) => (k in t || typeof k === 'symbol' ? t[k] : ficha_antiga) });
const RACES = comFallback(Object.fromEntries(Object.entries(ESPECIES).map(([k, e]) => [k, Object.assign({ esp: e.ben + ' ' + e.dif, mods: {} }, e)])));
const CLASSES = comFallback(Object.fromEntries(Object.entries(ESTILOS).map(([k, e]) => [k, Object.assign({ atk: e.prim[0], hp: 0 }, e)])));
const PROFS = comFallback(Object.fromEntries(Object.entries(PROFISSOES).map(([k, p]) => [k, p])));
const isLegacy = c => !!c && !c.gm && c.v !== 2;   // personagem das regras anteriores: guardado, mas não joga

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
// Lojas das ilhas: cada comerciante vende um grupo das coisas de Shop.items (a chave k)
const LOJAS = {
  mercador:   { nome: 'Mercado',   itens: ['comida', 'refeicao', 'rum', 'bandagem'], fala: 'Provisões frescas! Comida boa para a viagem, pelo preço justo.' },
  estaleiro:  { nome: 'Estaleiro', itens: ['reparo', 'kit', 'canhao', 'velas'], fala: 'Casco rachado? Velas rasgadas? Traga o navio que eu cuido.' },
  curandeiro: { nome: 'Curandeiro', itens: ['curativo', 'bandagem', 'remedio'], fala: 'Senta aí que eu remendo esses cortes.' },
  taverna:    { nome: 'Taverna',   itens: ['refeicao', 'comida', 'rum'], fala: 'Prato quente e uma caneca. O que vai ser?' },
};
// Quem mora e quem vende em cada tipo de ilha (o mestre pode mudar tudo depois)
const MORADORES = {
  vila:   { lojas: ['mercador', 'estaleiro', 'taverna'],               gente: 3, tipo: 'aldeao' },
  cidade: { lojas: ['mercador', 'estaleiro', 'curandeiro', 'taverna'], gente: 6, tipo: 'aldeao' },
  base:   { lojas: ['mercador', 'curandeiro'],                         gente: 4, tipo: 'marujo' },
  navio:  { lojas: ['taverna'],                                        gente: 3, tipo: 'cozinha' },
};
const NOMES_NPC = ['Marta', 'Tomás', 'Dona Lia', 'Seu Bento', 'Nana', 'Zeca', 'Irene', 'Otávio', 'Lúcia', 'Tião', 'Rosa', 'Gino', 'Bruna', 'Caetano', 'Dora', 'Mateus', 'Sol', 'Ícaro', 'Vera', 'Pedro'];
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
let myMesa = sessionStorage.getItem('mdm-mesa') || (function () { try { return localStorage.getItem('mdm-mesa-ultima'); } catch (e) { return null; } })() || null; // aba nova: volta à última mesa

// ---- Dois bancos: o GLOBAL (contas e a lista de mesas) e o da MESA aberta ----
const GT = { accounts: 1, mesas: 1 };            // tabelas que moram no global
let G = { accounts: {}, mesas: {} };
let db = null;
const GKEY = 'mdm-global-v1', dbKey = () => 'mdm-db-v3-' + myMesa;
function emptyDb() {
  return {
    chars: {}, tokens: {}, msgs: [], combat: {}, naval: {}, ships: {}, islandCfg: {}, missions: {},
    world: { wind: Math.PI * 0.75, created: Date.now(), auto: true },
    cargos: { almirantes: [null, null, null], frota: null },
  };
}
function completar(d, base) { d = d && typeof d === 'object' ? d : {}; Object.keys(base).forEach(k => { if (d[k] === undefined) d[k] = base[k]; }); return d; }
function lerLocal(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function carregarLocalSync() { G = completar(lerLocal(GKEY), { accounts: {}, mesas: {} }); db = myMesa ? completar(lerLocal(dbKey()), emptyDb()) : emptyDb(); }
// Modo arquivo (sem servidor): tudo no navegador. Modo rede: o servidor é a fonte e o navegador guarda só uma cópia.
async function carregarTudo() {
  await Net.iniciar();
  G = completar(Net.on ? await Net.estado('g').catch(() => null) : lerLocal(GKEY), { accounts: {}, mesas: {} });
  await carregarMesa();
}
async function carregarMesa() {
  if (!myMesa) db = emptyDb();
  else db = completar(Net.on ? await Net.estado(myMesa).catch(() => null) : lerLocal(dbKey()), emptyDb());
  if (Net.on) Net.assinar(myMesa ? ['g', myMesa] : ['g']);
}
async function abrirMesa(id) {
  myMesa = id || null; myId = null; sessionStorage.removeItem('mdm-me');
  if (myMesa) { sessionStorage.setItem('mdm-mesa', myMesa); try { localStorage.setItem('mdm-mesa-ultima', myMesa); } catch (e) { /* tudo bem */ } } else sessionStorage.removeItem('mdm-mesa');
  await carregarMesa(); Object.keys(dirty).forEach(k => { dirty[k] = true; });
}
let saveTimer = 0;
function saveDb() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(GKEY, JSON.stringify(G)); if (myMesa) localStorage.setItem(dbKey(), JSON.stringify(db)); }
    catch (e) { toast('Armazenamento cheio: imagens grandes demais?'); }
  }, 150);
}
// Apaga a mesa aberta (o servidor esquece o estado dela quando a mesa some da lista)
function resetDb() {
  const id = myMesa; if (id) { commit('mesas', id, null); try { localStorage.removeItem('mdm-db-v3-' + id); } catch (e) { /* tudo bem */ } }
  sessionStorage.removeItem('mdm-me'); sessionStorage.removeItem('mdm-mesa');
}

// ---- Tempo real: entre abas do mesmo navegador (BroadcastChannel) ou entre aparelhos (servidor) ----
const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('mesa-dos-mares-v3') : null;
const dirty = { accounts: true, mesas: true, chars: true, tokens: true, msgs: true, combat: true, ships: true, world: true, naval: true, cargos: true, islandCfg: true, missions: true };
const listeners = []; // fn(table, row, remote) chamado em toda mudança (local ou remota)
const bcHandlers = {}; // mensagens efêmeras de outros módulos: bcHandlers[tipo] = fn(msg)
function emit(table, row, remote) { dirty[table] = true; listeners.forEach(f => f(table, row, remote)); }

const Net = (() => {
  let on = false, cid = uid(), q = [], timer = 0, leitor = null, escopos = [], urls = [], lan = false, vezes = 0, sb = false;
  async function iniciar() {
    if (typeof SB !== 'undefined' && await SB.iniciar(cid)) { on = true; sb = true; return true; }   // Supabase, se houver supabase-config.js
    if (!/^https?:$/.test(location.protocol)) return false;
    try { const r = await fetch('/info', { signal: AbortSignal.timeout(2500), cache: 'no-store' }), j = await r.json(); if (!j || !j.rede) return false; on = true; urls = j.urls || []; lan = !!j.lan; return true; }
    catch (e) { return false; }
  }
  async function estado(esc) { if (sb) return SB.estado(esc); const r = await fetch('/estado?escopo=' + encodeURIComponent(esc), { cache: 'no-store' }); if (!r.ok) throw new Error('estado ' + r.status); return r.json(); }
  function enviar(esc, m) { if (sb) { SB.enviar(esc, m); return; } q.push({ esc, m }); if (!timer) timer = setTimeout(descarga, 35); }
  async function descarga() {
    timer = 0; const itens = q.splice(0), por = {};
    itens.forEach(i => { (por[i.esc] = por[i.esc] || []).push(i.m); });
    for (const [esc, msgs] of Object.entries(por)) {
      try { await fetch('/rel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid, escopo: esc, msgs }) }); }
      catch (e) { /* sem rede por um instante: a próxima reconexão busca o estado de novo */ }
    }
  }
  // O fluxo de eventos é lido com fetch (reconecta sozinho e, ao voltar, busca o estado de novo para não perder nada)
  function assinar(lista) {
    if (sb) { escopos = lista; SB.assinar(lista, onRemote); return; }
    if (lista.join(',') === escopos.join(',') && leitor) return;
    escopos = lista; if (leitor) leitor.abort(); vezes = 0; ler();
  }
  async function ler() {
    const ctl = new AbortController(); leitor = ctl;
    try {
      const r = await fetch('/eventos?cid=' + cid + '&escopos=' + encodeURIComponent(escopos.join(',')), { signal: ctl.signal, cache: 'no-store' });
      if (vezes++ > 0) await ressincronizar();
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const bloco = buf.slice(0, i), l = bloco.split('\n').find(x => x.startsWith('data: ')); buf = buf.slice(i + 2);
          if (l) { try { const p = JSON.parse(l.slice(6)); (p.msgs || []).forEach(m => onRemote(Object.assign({}, m, { escopo: p.escopo }))); } catch (e) { /* mensagem ruim: ignora */ } }
        }
      }
    } catch (e) { /* caiu ou foi trocado */ }
    if (leitor === ctl && !ctl.signal.aborted) setTimeout(() => { if (leitor === ctl) ler(); }, 2000);
  }
  async function ressincronizar() {
    try { G = completar(await estado('g'), { accounts: {}, mesas: {} }); if (myMesa) db = completar(await estado(myMesa), emptyDb()); Object.keys(dirty).forEach(k => { dirty[k] = true; }); } catch (e) { /* tenta na próxima */ }
  }
  return { iniciar, estado, enviar, assinar, get sb() { return sb; }, entrarCodigo: c => SB.entrarCodigo(c), get on() { return on; }, get cid() { return cid; }, get urls() { return urls; }, get lan() { return lan; } };
})();

// commit: grava local (otimista), persiste e avisa os outros (abas ou aparelhos). key === null: a tabela inteira é a linha (cargos, world).
function commit(table, key, row) {
  if (table === 'msgs') { db.msgs.push(row); trimMsgs(); }
  else if (key === null) { if (GT[table]) G[table] = row; else db[table] = row; }
  else if (row === null) delete (GT[table] ? G : db)[table][key];
  else (GT[table] ? G : db)[table][key] = row;
  saveDb(); emit(table, row, false);
  enviar({ t: 'row', table, key, row });
}
// escopo: 'g' (contas e mesas) ou o id da mesa aberta
function enviar(m) {
  const escopo = m.t === 'row' && GT[m.table] ? 'g' : (myMesa || 'g');
  if (Net.on) Net.enviar(escopo, m); else if (bc) bc.postMessage(Object.assign({ escopo }, m));
}
function trimMsgs() { const cap = tune.msgCap; if (db.msgs.length > cap) db.msgs.splice(0, db.msgs.length - cap); }
function clearChannel(ch) {
  db.msgs = db.msgs.filter(m => m.ch !== ch); saveDb(); emit('msgs', null, false);
  enviar({ t: 'clear', ch });
}
function sendTokMove(id, x, y) { enviar({ t: 'tmove', id, x, y }); }
function broadcast(msg) { enviar(msg); }

function onRemote(m) {
  const g = m.escopo === 'g';
  if (!g && m.escopo !== myMesa) return; // é de outra mesa
  if (m.t === 'row') {
    const alvo = g ? G : db;
    if (m.table === 'msgs') { if (!g && !db.msgs.some(x => x.id === m.row.id)) { db.msgs.push(m.row); trimMsgs(); } }
    else if (m.key === null) alvo[m.table] = m.row;
    else { alvo[m.table] = alvo[m.table] || {}; if (m.row === null) delete alvo[m.table][m.key]; else alvo[m.table][m.key] = m.row; }
    saveDb(); emit(m.table, m.row, true);
    if (g && m.table === 'mesas' && m.row === null && m.key === myMesa) location.reload(); // a mesa aberta foi apagada
  } else if (m.t === 'tmove') {
    const tk = db.tokens[m.id]; if (tk) { tk.x = m.x; tk.y = m.y; dirty.tokens = true; }
  } else if (m.t === 'clear') {
    db.msgs = db.msgs.filter(x => x.ch !== m.ch); emit('msgs', null, true);
  } else if (bcHandlers[m.t]) bcHandlers[m.t](m);
}
if (bc) bc.onmessage = ev => { if (!Net.on) onRemote(ev.data); };

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

// ---- Atributos (OP RPG): o valor fica na ficha; o modificador é (valor − 10) ÷ 2. Os nomes antigos dos atributos ainda funcionam. ----
const ATTR_ANTIGO = { AGI: 'DES', VIG: 'CON', TEC: 'DES', ESP: 'VON', CAR: 'PRE' };
const hasHb = (c, k) => !!(c && (c.hb || []).includes(k));
// valor do atributo: o da ficha + o bônus da carreira (recompensa ou patente)
function attrVal(c, k) {
  if (!c || !c.attrs) return 10;
  k = ATTR_ANTIGO[k] || k; const base = c.attrs[k] == null ? 10 : c.attrs[k];
  return Math.min(30, base + (typeof careerBonus === 'function' ? careerBonus(c) : 0));
}
const attr = (c, k) => (c && c.attrs ? modDe(attrVal(c, k)) : 0);   // o modificador, que é o que entra nas rolagens
const atkAttr = c => (c && c.prim) || (CLASSES[c && c.classe] || {}).atk || 'FOR';   // o atributo do ataque: o primário do estilo
const especiePV = c => { const e = ESPECIES[c.raca]; if (!e) return 10; if (e.mestico) { const a = ESPECIES[c.raca1], b = ESPECIES[c.raca2]; return a && b ? Math.floor((a.pv + b.pv) / 2) : 10; } return e.pv; };
// Vida: 1º nível = dado máximo + PV da espécie + Constituição; depois o valor médio do dado + Constituição por nível (p.10 e p.13)
function hpMaxOf(c) {
  const est = ESTILOS[c.classe]; if (!est) return 10;
  const lv = c.lv || 1, con = attr(c, 'CON'), dv = est.dv;
  let pv = dv + especiePV(c) + con + (lv - 1) * Math.max(1, Math.floor(dv / 2) + 1 + con);
  if (hasHb(c, 'robusto')) pv += 3 * lv;
  return Math.max(1, pv);
}
const stMaxOf = c => 4 * (c.lv || 1);   // Pontos de Poder = 4 × nível (p.36)
// Classe de Resistência: 10 + Destreza; Corpo de Guerreiro e Defesa Ofensiva usam o atributo primário (p.38)
function defOf(c) {
  const lv = c.lv || 1, des = attr(c, 'DES'), prim = attr(c, atkAttr(c));
  let cr = 10 + des;
  if (hasHb(c, 'corpo')) cr = 10 + Math.max(1, prim) + Math.min(attr(c, 'CON'), lv === 1 ? 1 : Math.floor(lv / 2));
  else if (hasHb(c, 'defesa')) cr = 10 + prim;
  return cr + ((RACES[c.raca] || {}).def || 0);
}
const bonusDe = (c, per) => attr(c, PERICIA[per].a) + ((c.pericias || []).includes(per) ? bonusProf(c.lv) : 0);   // d20 + isto contra a CD

// ---- Dados (rng seeded para o resultado) ----
function roll(sides) { return 1 + Math.floor(rng() * sides); }
// Aceita "1d20+4", "2d6", "3d6-1", "d20+FOR" (atributos do personagem viram números).
function parseRolagem(src, c) {
  let f = String(src || '').replace(/\s+/g, '').toUpperCase();
  if (!f) return { erro: 'Fórmula vazia.' };
  f = f.replace(/\b(FOR|DES|CON|SAB|VON|PRE|AGI|VIG|TEC|ESP|CAR)\b/g, k => String(attr(c, k)));
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
