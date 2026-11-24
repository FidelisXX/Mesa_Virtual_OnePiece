// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// /chave, /teste e /modelos no Vercel: o formulário da chave do jogo só funciona no servidor local.
// Hospedado, a chave se configura no painel do Vercel (Settings > Environment Variables > GEMINI_API_KEY).
'use strict';
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  res.status(403).end(JSON.stringify({ erro: 'Hospedado no Vercel, a chave do Gemini fica em Settings > Environment Variables (GEMINI_API_KEY), não neste formulário.' }));
};
