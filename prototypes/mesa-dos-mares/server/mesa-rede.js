// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// A mesa em rede (no lugar do Supabase): serve o jogo, guarda o estado das mesas e repassa cada mudança, em tempo real,
// a todos os aparelhos conectados. Quem entra por convite (código ou link) abre a mesa no computador, no celular ou em outra aba.
// É carregado por server/narrador.js; sem dependências.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const RAIZ = path.join(__dirname, '..');            // a pasta do jogo (index.html, js, css, vendor...)
const ARQ = process.env.MESAS_ARQ || path.join(__dirname, 'mesas.json');     // o estado das mesas, fora do git
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
let cfg = { porta: 8787, lan: false };
let estado = { g: { accounts: {}, mesas: {} }, mesas: {} };
try { estado = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) { /* primeira vez */ }
estado.g = estado.g || {}; estado.g.accounts = estado.g.accounts || {}; estado.g.mesas = estado.g.mesas || {}; estado.mesas = estado.mesas || {};

let salvarT = 0;
const salvar = () => { clearTimeout(salvarT); salvarT = setTimeout(() => { try { fs.writeFileSync(ARQ, JSON.stringify(estado)); } catch (e) { console.error('não consegui gravar mesas.json:', e.message); } }, 800); };
process.on('exit', () => { try { fs.writeFileSync(ARQ, JSON.stringify(estado)); } catch (e) { /* tudo bem */ } });

// ---- Estado: aplica no instantâneo a mesma mudança que o jogo aplicou ----
function aplicar(escopo, m) {
  if (!m || typeof m !== 'object') return;
  const alvo = escopo === 'g' ? estado.g : (estado.mesas[escopo] = estado.mesas[escopo] || {});
  if (m.t === 'row' && typeof m.table === 'string') {
    if (m.table === 'msgs') { alvo.msgs = alvo.msgs || []; if (m.row && !alvo.msgs.some(x => x.id === m.row.id)) { alvo.msgs.push(m.row); if (alvo.msgs.length > 800) alvo.msgs.splice(0, alvo.msgs.length - 800); } }
    else if (m.key === null) alvo[m.table] = m.row;
    else { alvo[m.table] = alvo[m.table] || {}; if (m.row === null) delete alvo[m.table][m.key]; else alvo[m.table][m.key] = m.row; }
    if (escopo === 'g' && m.table === 'mesas' && m.row === null) delete estado.mesas[m.key]; // apagar uma mesa apaga o estado dela
    salvar();
  } else if (m.t === 'clear') { alvo.msgs = (alvo.msgs || []).filter(x => x.ch !== m.ch); salvar(); }
}

// ---- Tempo real: um fluxo de eventos por aparelho ----
const clientes = new Set();
function difundir(escopo, cid, msgs) {
  const dados = 'data: ' + JSON.stringify({ escopo, cid, msgs }) + '\n\n';
  clientes.forEach(c => { if (c.cid !== cid && c.escopos.has(escopo)) { try { c.res.write(dados); } catch (e) { clientes.delete(c); } } });
}
function eventos(req, res, url) {
  const cid = String(url.searchParams.get('cid') || '').slice(0, 40), escopos = new Set(String(url.searchParams.get('escopos') || 'g').split(',').map(s => s.slice(0, 40)).filter(Boolean));
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(': conectado\n\n');
  const c = { res, cid, escopos }; clientes.add(c);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) { /* o close limpa */ } }, 20000);
  req.on('close', () => { clientes.delete(c); clearInterval(ping); });
}

// ---- Endereços para convidar quem está na mesma rede ----
function urls() {
  const out = [];
  Object.values(os.networkInterfaces()).forEach(l => (l || []).forEach(i => { if (i.family === 'IPv4' && !i.internal) out.push(`http://${i.address}:${cfg.porta}`); }));
  return out;
}

function lerCorpo(req, res, max, cb) {
  let b = '', estourou = false;
  req.on('data', c => { b += c; if (b.length > max) { estourou = true; req.destroy(); } });
  req.on('end', () => { if (estourou) return; try { cb(JSON.parse(b || '{}')); } catch (e) { res.writeHead(400); res.end('{"erro":"pedido inválido"}'); } });
}

// ---- Arquivos do jogo (nunca a pasta server/, onde mora o .env, nem arquivos ocultos) ----
function estatico(req, res, url) {
  let p = decodeURIComponent(url.pathname); if (p === '/') p = '/index.html';
  const partes = p.split('/').filter(Boolean);
  if (partes.some(s => s.startsWith('.') || s === '..') || partes[0] === 'server' || partes[0] === 'dist') { res.writeHead(404); res.end('não encontrado'); return; }
  const f = path.join(RAIZ, ...partes);
  if (!f.startsWith(RAIZ)) { res.writeHead(404); res.end('não encontrado'); return; }
  fs.readFile(f, (err, dados) => {
    if (err) { res.writeHead(404); res.end('não encontrado'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(dados);
  });
}

// Devolve true se tratou o pedido. send(res, código, objeto) vem do servidor principal.
function tratar(req, res, send) {
  let url; try { url = new URL(req.url, 'http://x'); } catch (e) { return false; }
  if (req.method === 'GET' && url.pathname === '/info') { send(res, 200, { rede: true, lan: cfg.lan, porta: cfg.porta, urls: cfg.lan ? urls() : [] }); return true; }
  if (req.method === 'GET' && url.pathname === '/estado') { const e = url.searchParams.get('escopo') || 'g'; send(res, 200, e === 'g' ? estado.g : (estado.mesas[e] || {})); return true; }
  if (req.method === 'GET' && url.pathname === '/eventos') { eventos(req, res, url); return true; }
  if (req.method === 'POST' && url.pathname === '/rel') {
    lerCorpo(req, res, 400000, j => {
      const escopo = String(j.escopo || '').slice(0, 40), cid = String(j.cid || '').slice(0, 40), msgs = Array.isArray(j.msgs) ? j.msgs.slice(0, 200) : [];
      if (!escopo) { send(res, 400, { erro: 'sem escopo' }); return; }
      msgs.forEach(m => aplicar(escopo, m)); difundir(escopo, cid, msgs); send(res, 200, { ok: true });
    });
    return true;
  }
  if (req.method === 'GET' && !url.pathname.startsWith('/saude') && !['/modelos'].includes(url.pathname)) { estatico(req, res, url); return true; }
  return false;
}

module.exports = { tratar, config: c => { cfg = Object.assign(cfg, c); }, urls };
