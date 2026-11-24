// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// GET /saude no Vercel: diz ao jogo se o narrador de IA está ligado (sem revelar nada da chave).
'use strict';
module.exports = (req, res) => {
  const chave = !!process.env.GEMINI_API_KEY, mock = process.env.MOCK === '1';
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  res.status(200).end(JSON.stringify({ ok: mock || chave, modelo: mock ? 'teste (sem IA)' : (process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'), mock, chave, vercel: true }));
};
