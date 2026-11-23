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
const KEY = process.env.GEMINI_API_KEY || '', MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash', PORT = +process.env.PORT || 8787, MOCK = process.env.MOCK === '1';
const TIMEOUT_MS = 25000, MAX_BODY = 40000;
const ATTRS = ['FOR', 'AGI', 'VIG', 'TEC', 'ESP', 'CAR'], TIPOS = ['aldeao', 'bandido', 'marujo', 'oficial', 'rival', 'cozinha'];

const SISTEMA = [
  'Você é o Mestre (narrador) de uma mesa de RPG por texto, num mundo inspirado em One Piece, nos quatro mares antes da Grand Line (East, North, West e South Blue).',
  'Escreva em português do Brasil, com voz de mestre de mesa: viva, concreta, com cheiro, som e gente.',
  'Regras do ofício:',
  '1) Leia o que cada jogador escreveu e responda ao que ele de fato disse ou fez, chamando-o pelo nome. Nunca ignore uma fala ou ação, e nunca faça o jogador dizer ou decidir algo que ele não escreveu.',
  '2) Seja curto: 1 a 3 parágrafos, no máximo cerca de 140 palavras no total. Sem listas, sem repetir o texto dos jogadores.',
  '3) Não decida o resultado de ações arriscadas: peça um teste. Havendo risco, incerteza ou oposição, peça ao jogador o atributo certo (FOR força, AGI agilidade, VIG vigor, TEC técnica, ESP espírito/percepção, CAR carisma) com dificuldade 10 (fácil), 15 (média) ou 20 (difícil). Ações simples e seguras não pedem teste. Peça no máximo um teste por jogador.',
  '4) NPCs têm voz, desejo e medo; quando falam, use aspas. Mostre a reação do mundo ao que o jogador fez.',
  '5) Use o lugar: o nome, o tema e a descrição dele são a sua cena. Não invente regras, itens mágicos nem dinheiro.',
  '6) Luta: só proponha uma se um jogador procurar briga ou a cena pedir claramente. Escolha a dificuldade pelo nível médio do grupo: fácil (inimigos 2 níveis abaixo), moderada (no nível), difícil (4 níveis acima e mais gente). Tipos permitidos: ' + TIPOS.join(', ') + '. No máximo 4 inimigos.',
  '7) Responda SOMENTE com um JSON válido, sem texto fora dele, neste formato:',
  '{"narracao": "texto", "testes": [{"jogador": "nome exato", "atributo": "FOR|AGI|VIG|TEC|ESP|CAR", "cd": 10, "motivo": "frase curta"}], "luta": null}',
  'Quando houver luta, "luta" é {"dificuldade": "facil|moderada|dificil", "inimigos": [{"tipo": "bandido", "nivel": 3}]}; senão é null. "testes" pode ser uma lista vazia.',
].join('\n');

const lim = (s, n) => String(s == null ? '' : s).slice(0, n);
function montarPedido(ctx) {
  const l = ctx.lugar || {};
  const jog = (ctx.jogadores || []).slice(0, 8).map(j => `- ${lim(j.nome, 40)}: ${lim(j.raca, 30)}, ${lim(j.classe, 20)}, ${lim(j.profissao, 20)}, ${lim(j.lado, 12)}, nível ${+j.nivel || 1}, Vida ${lim(j.vida, 12)}`).join('\n');
  const hist = (ctx.historico || []).slice(-12).map(h => `${lim(h.quem, 40)}: ${lim(h.texto, 400)}`).join('\n');
  const novas = (ctx.novas || []).slice(0, 24).map(n => `[${n.tipo === 'acao' ? 'ação' : 'fala'}] ${lim(n.quem, 40)}: ${lim(n.texto, 500)}`).join('\n');
  return `LUGAR: ${lim(l.nome, 60)} (${lim(l.mar, 20)}; tema: ${lim(l.tema, 20)}). ${lim(l.descricao, 400)}\nNÍVEL MÉDIO DO GRUPO: ${+ctx.nivelMedio || 1}\nJOGADORES NA CENA:\n${jog || '(ninguém)'}\n\nCONVERSA ANTERIOR (para contexto):\n${hist || '(começo da cena)'}\n\nO QUE OS JOGADORES ESCREVERAM DESDE A SUA ÚLTIMA FALA (responda a TODOS):\n${novas}`;
}
// Aceita só o que o jogo sabe usar: atributo, CD e tipos de inimigo conhecidos
function limpar(j) {
  const out = { narracao: lim(j && j.narracao, 1800).trim(), testes: [], luta: null };
  (Array.isArray(j && j.testes) ? j.testes : []).slice(0, 8).forEach(t => {
    const a = String(t.atributo || '').toUpperCase(); if (!ATTRS.includes(a)) return;
    out.testes.push({ jogador: lim(t.jogador, 40), atributo: a, cd: Math.max(8, Math.min(25, +t.cd || 15)), motivo: lim(t.motivo, 90) });
  });
  if (j && j.luta && Array.isArray(j.luta.inimigos)) {
    const ini = j.luta.inimigos.filter(i => TIPOS.includes(i.tipo)).slice(0, 4).map(i => ({ tipo: i.tipo, nivel: Math.max(1, Math.min(100, Math.round(+i.nivel || 1))) }));
    if (ini.length) out.luta = { dificuldade: ['facil', 'moderada', 'dificil'].includes(j.luta.dificuldade) ? j.luta.dificuldade : 'moderada', inimigos: ini };
  }
  return out;
}
function extrairJson(txt) {
  try { return JSON.parse(txt); } catch (e) { /* tenta achar o objeto no meio do texto */ }
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}'); if (a >= 0 && b > a) return JSON.parse(txt.slice(a, b + 1));
  throw new Error('a IA não devolveu JSON');
}

async function narrar(ctx) {
  if (MOCK) { // resposta de teste, sem chave e sem custo
    const nomes = [...new Set((ctx.novas || []).map(n => n.quem))];
    return { narracao: '[teste sem IA] O mestre lê ' + nomes.join(' e ') + ' e a cena responde: o vento muda, e alguém por perto repara em vocês.', testes: nomes.slice(0, 2).map(n => ({ jogador: n, atributo: 'CAR', cd: 15, motivo: 'o clima da cena pede' })), luta: null, uso: 0 };
  }
  if (!KEY) throw new Error('GEMINI_API_KEY não configurada (crie server/.env)');
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SISTEMA }] },
        contents: [{ role: 'user', parts: [{ text: montarPedido(ctx) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.9, maxOutputTokens: 900 },
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error('Gemini ' + r.status + ': ' + lim(data && data.error && data.error.message, 200));
    const txt = (((data.candidates || [])[0] || {}).content || {}).parts;
    const texto = Array.isArray(txt) ? txt.map(p => p.text || '').join('') : '';
    if (!texto) throw new Error('resposta vazia' + (data.promptFeedback ? ' (bloqueada pelo filtro)' : ''));
    const out = limpar(extrairJson(texto)); out.uso = (data.usageMetadata && data.usageMetadata.totalTokenCount) || 0;
    if (!out.narracao) throw new Error('narração vazia');
    return out;
  } finally { clearTimeout(timer); }
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const send = (res, code, obj) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS)); res.end(JSON.stringify(obj)); };
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  if (req.method === 'GET' && req.url === '/saude') { send(res, 200, { ok: MOCK || !!KEY, modelo: MOCK ? 'teste (sem IA)' : MODEL, mock: MOCK, chave: !!KEY }); return; }
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
  send(res, 404, { erro: 'não encontrado' });
}).listen(PORT, '127.0.0.1', () => console.log(`Narrador em http://127.0.0.1:${PORT}  ·  ${MOCK ? 'MODO TESTE (sem IA)' : KEY ? 'modelo ' + MODEL : 'SEM CHAVE: crie server/.env com GEMINI_API_KEY=...'}`));
