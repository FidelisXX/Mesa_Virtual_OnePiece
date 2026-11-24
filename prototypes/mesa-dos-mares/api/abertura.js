// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// POST /abertura no Vercel: a IA abre a cena numa ilha e dá uma missão ao jogador. Mesma proteção do /narrar.
'use strict';
const { autorizar } = require('./_guarda.js');
const cfg = { KEY: process.env.GEMINI_API_KEY || '', MODEL: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest', MOCK: process.env.MOCK === '1', PRAZO: 52000 };
const core = require('../server/gemini-core.js')(cfg);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).end(JSON.stringify({ erro: 'use POST' })); return; }
  const no = await autorizar(req); if (no) { res.status(no.codigo).end(JSON.stringify({ erro: no.erro })); return; }
  const corpo = req.body && typeof req.body === 'object' ? req.body : {};
  if (JSON.stringify(corpo).length > core.MAX_BODY) { res.status(413).end(JSON.stringify({ erro: 'pedido grande demais' })); return; }
  try { res.status(200).end(JSON.stringify(await core.abertura(corpo))); }
  catch (e) { console.error('erro (abertura):', e.message); res.status(502).end(JSON.stringify({ erro: e.message })); }
};
