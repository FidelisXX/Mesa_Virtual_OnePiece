// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// Servidor local do narrador de IA. Guarda a chave do Gemini (nunca vai para o navegador) e faz UMA chamada por vez que o jogador
// aperta "Chamar o narrador". Sem dependências: precisa só do Node 18 ou mais novo.
//
//   1) Crie o arquivo server/.env com uma linha:   GEMINI_API_KEY=sua_chave_aqui
//      (a chave nasce em https://aistudio.google.com/apikey ; o .env fica fora do git)
//   2) Rode:   node server/narrador.js           (modelo e porta: GEMINI_MODEL e PORT no .env, opcionais)
//   3) Abra o jogo normalmente: ele acha o servidor em http://127.0.0.1:8787 e liga a IA sozinho.
//   Para testar sem chave nem custo:   MOCK=1 node server/narrador.js
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

// ---- .env simples ----
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) { /* sem .env: usa o ambiente */ }
let KEY = process.env.GEMINI_API_KEY || '', MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const PORT = +process.env.PORT || 8787, MOCK = process.env.MOCK === '1', ENV_FILE = path.join(__dirname, '.env');
// Guarda (ou troca) uma linha CHAVE=valor no .env, mantendo o resto do arquivo
function gravarEnv(pares) {
  let linhas = []; try { linhas = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/); } catch (e) { /* ainda não existe */ }
  Object.entries(pares).forEach(([k, v]) => { const i = linhas.findIndex(l => l.trim().startsWith(k + '=')); const l = k + '=' + v; if (i >= 0) linhas[i] = l; else linhas.push(l); });
  fs.writeFileSync(ENV_FILE, linhas.filter((l, i, a) => l !== '' || i < a.length - 1).join('\n').replace(/\n*$/, '\n'));
}
const rede = require('./mesa-rede.js');
const LAN = process.argv.includes('--lan') || process.env.LAN === '1';
rede.config({ porta: PORT, lan: LAN });
// Só a sua máquina e (com --lan) a sua rede local falam com o servidor: nenhum site da internet, nenhum IP público
const ehPrivado = h => /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+)$/i.test(h);
const origemOk = req => { const o = req.headers.origin; if (!o || o === 'null') return true; try { return ehPrivado(new URL(o).hostname); } catch (e) { return false; } };
const enderecoDe = req => String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
const ehLoopback = a => a === '::1' || /^127\./.test(a);
const ipOk = req => { const a = enderecoDe(req); return ehLoopback(a) || ehPrivado(a) || /^f[cd][0-9a-f]{2}:/i.test(a) || /^fe80:/i.test(a); };
// a chave do Gemini só se mexe de dentro desta máquina, nunca de um celular na rede
const soLocal = req => ehLoopback(enderecoDe(req));
const core = require('./gemini-core.js')({ get KEY() { return KEY; }, get MODEL() { return MODEL; }, set MODEL(v) { MODEL = v; }, get MOCK() { return MOCK; } });
const { narrar, gerarFicha, abertura, combate, descobrirModelo, MAX_BODY, TIMEOUT_MS } = core;
const lim = (s, n) => String(s == null ? '' : s).slice(0, n);

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const send = (res, code, obj) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS)); res.end(JSON.stringify(obj)); };
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  if (!ipOk(req) || !origemOk(req)) { send(res, 403, { erro: 'origem não permitida' }); return; }
  if (['/chave', '/teste', '/modelos'].includes(req.url) && !soLocal(req)) { send(res, 403, { erro: 'a chave só se configura no computador que roda o servidor' }); return; }
  if (req.method === 'GET' && req.url === '/saude') { send(res, 200, { ok: MOCK || !!KEY, modelo: MOCK ? 'teste (sem IA)' : MODEL, mock: MOCK, chave: !!KEY }); return; }
  // Quais modelos de texto a sua chave enxerga (só os nomes)
  if (req.method === 'GET' && req.url === '/modelos') {
    (async () => {
      try {
        if (!KEY) { send(res, 200, { modelos: [], erro: 'sem chave' }); return; }
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': KEY }, signal: AbortSignal.timeout(10000) }), j = await r.json();
        send(res, 200, { modelos: (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => String(m.name).replace(/^models\//, '')), erro: r.ok ? null : lim(j.error && j.error.message, 160) });
      } catch (e) { send(res, 200, { modelos: [], erro: e.message }); }
    })();
    return;
  }
  // Diagnóstico: uma chamada mínima ao modelo atual, para ver se a chave, o modelo e a rede funcionam, e quanto demora
  if (req.method === 'POST' && req.url === '/teste') {
    (async () => {
      const t0 = Date.now(), ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
      try {
        if (MOCK) { send(res, 200, { modelo: 'teste', status: 200, ms: 0, texto: 'ok (modo teste)' }); return; }
        if (!KEY) { send(res, 200, { modelo: MODEL, status: 0, ms: 0, erro: 'sem chave' }); return; }
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Responda apenas com a palavra: ok' }] }], generationConfig: { maxOutputTokens: 40 } }) });
        const d = await r.json(), p = (((d.candidates || [])[0] || {}).content || {}).parts;
        send(res, 200, { modelo: MODEL, status: r.status, ms: Date.now() - t0, texto: Array.isArray(p) ? lim(p.map(x => x.text || '').join(''), 60) : '', erro: r.ok ? null : lim(d.error && d.error.message, 200) });
      } catch (e) { send(res, 200, { modelo: MODEL, status: 0, ms: Date.now() - t0, erro: e.name === 'AbortError' ? 'sem resposta do Gemini em 20 s' : e.message }); }
      finally { clearTimeout(timer); }
    })();
    return;
  }
  // Receber a chave pelo jogo: fica na memória do servidor e, se pedido, no server/.env (fora do git). Nunca volta para o navegador.
  if (req.method === 'POST' && req.url === '/chave') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 2000) req.destroy(); });
    req.on('end', () => {
      try {
        const j = JSON.parse(body || '{}'), chave = String(j.chave || '').trim(), modelo = String(j.modelo || '').trim();
        if (chave && !/^[A-Za-z0-9_\-]{20,200}$/.test(chave)) { send(res, 400, { erro: 'essa chave não parece válida (20 a 200 letras, números, "-" e "_", sem espaços)' }); return; }
        if (modelo && !/^[A-Za-z0-9._\-]{3,80}$/.test(modelo)) { send(res, 400, { erro: 'nome de modelo inválido' }); return; }
        if (j.remover) { KEY = ''; if (j.salvar) gravarEnv({ GEMINI_API_KEY: '' }); send(res, 200, { ok: false, chave: false, modelo: MODEL }); return; }
        if (!chave && !modelo) { send(res, 400, { erro: 'informe a chave ou o modelo' }); return; }
        if (chave) KEY = chave; if (modelo) MODEL = modelo;
        if (j.salvar) { const p = {}; if (chave) p.GEMINI_API_KEY = chave; if (modelo) p.GEMINI_MODEL = modelo; gravarEnv(p); }
        console.log(new Date().toLocaleTimeString('pt-BR'), 'chave atualizada pelo jogo' + (j.salvar ? ' (salva em server/.env)' : ' (só na memória)') + '; modelo ' + MODEL);
        send(res, 200, { ok: MOCK || !!KEY, chave: !!KEY, modelo: MODEL, salvo: !!j.salvar });
      } catch (e) { send(res, 400, { erro: 'pedido inválido' }); }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/narrar') {
    let body = ''; let big = false;
    req.on('data', c => { body += c; if (body.length > MAX_BODY) { big = true; req.destroy(); } });
    req.on('end', async () => {
      if (big) return;
      try {
        const ctx = JSON.parse(body || '{}'), t0 = Date.now(), r = await narrar(ctx);
        console.log(new Date().toLocaleTimeString('pt-BR'), 'narrou para', (ctx.novas || []).length, 'mensagem(ns);', r.uso, 'tokens;', Date.now() - t0, 'ms');
        send(res, 200, r);
      } catch (e) { console.error('erro:', e.message); send(res, 502, { erro: e.message }); }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/combate') { // a IA narra a troca de golpes (os dados já foram rolados pelo jogo)
    let body = ''; let big = false;
    req.on('data', c => { body += c; if (body.length > MAX_BODY) { big = true; req.destroy(); } });
    req.on('end', async () => {
      if (big) return;
      try { const t0 = Date.now(), r = await combate(JSON.parse(body || '{}')); console.log(new Date().toLocaleTimeString('pt-BR'), 'narrou o combate;', r.uso, 'tokens;', Date.now() - t0, 'ms'); send(res, 200, r); } catch (e) { console.error('erro (combate):', e.message); send(res, 502, { erro: e.message }); }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/abertura') { // o narrador de IA abre a cena numa ilha e dá uma missão
    let body = ''; let big = false;
    req.on('data', c => { body += c; if (body.length > MAX_BODY) { big = true; req.destroy(); } });
    req.on('end', async () => {
      if (big) return;
      try { const t0 = Date.now(), r = await abertura(JSON.parse(body || '{}')); console.log(new Date().toLocaleTimeString('pt-BR'), 'abriu a cena;', r.uso, 'tokens;', Date.now() - t0, 'ms'); send(res, 200, r); } catch (e) { console.error('erro (abertura):', e.message); send(res, 502, { erro: e.message }); }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/ficha') { // o mestre descreve um NPC e a IA monta a ficha
    let body = ''; let big = false;
    req.on('data', c => { body += c; if (body.length > 4000) { big = true; req.destroy(); } });
    req.on('end', async () => {
      if (big) return;
      try { send(res, 200, await gerarFicha(JSON.parse(body || '{}'))); } catch (e) { console.error('erro (ficha):', e.message); send(res, 502, { erro: e.message }); }
    });
    return;
  }
  if (rede.tratar(req, res, send)) return; // o jogo (arquivos), as mesas e o tempo real
  send(res, 404, { erro: 'não encontrado' });
}).listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`Mesa dos Mares em http://127.0.0.1:${PORT}  ·  narrador: ${MOCK ? 'MODO TESTE (sem IA)' : KEY ? 'modelo ' + MODEL : 'SEM CHAVE (informe no jogo, botão IA)'}`);
  if (LAN) { const u = rede.urls(); console.log('Rede local ligada. Convide pelo celular (mesma rede Wi-Fi):\n  ' + (u.join('\n  ') || '(nenhum endereço de rede encontrado)')); }
  else console.log('Só neste computador. Para convidar o celular pelo Wi-Fi, rode com:  node server/narrador.js --lan');
});
