// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// Quem pode gastar a chave do Gemini no Vercel: a página do próprio site e, quando o Supabase está ligado,
// só quem é MEMBRO da mesa (o Supabase confere a sessão e a mesa). Também limita quantas chamadas por mesa/minuto.
'use strict';
const membros = new Map();   // "mesa|token" -> até quando vale a conferência
const contagem = new Map();  // quem -> { n, ate }

function mesmoSite(req) {
  const host = String(req.headers.host || '').toLowerCase(), o = req.headers.origin || req.headers.referer || '';
  if (!o) return false;
  try { return new URL(o).host.toLowerCase() === host; } catch (e) { return false; }
}

function limite(quem, max, janelaMs) {
  const agora = Date.now(), c = contagem.get(quem);
  if (!c || c.ate < agora) { contagem.set(quem, { n: 1, ate: agora + janelaMs }); return true; }
  c.n++; return c.n <= max;
}

async function ehMembro(mesa, token) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!mesa || !token) return false;
  const k = mesa + '|' + token.slice(-24), v = membros.get(k); if (v && v > Date.now()) return true;
  try {
    const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/mesas?select=id&id=eq.' + encodeURIComponent(mesa), { headers: { apikey: key, Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return false;
    const j = await r.json(); const ok = Array.isArray(j) && j.length === 1; if (ok) membros.set(k, Date.now() + 60000); return ok;
  } catch (e) { return false; }
}

// Devolve null se pode, ou { codigo, erro } se não
async function autorizar(req) {
  if (!mesmoSite(req)) return { codigo: 403, erro: 'origem não permitida' };
  const usaSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  let quem = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'sem-ip';
  if (usaSupabase) {
    const mesa = String(req.headers['x-mesa'] || '').slice(0, 80), auth = String(req.headers.authorization || ''), token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!(await ehMembro(mesa, token))) return { codigo: 401, erro: 'só quem está na mesa chama o narrador' };
    quem = 'mesa:' + mesa;
  }
  if (!limite(quem, +process.env.NARRADOR_POR_MINUTO || 8, 60000)) return { codigo: 429, erro: 'muitas chamadas seguidas: espere um minuto' };
  return null;
}

module.exports = { autorizar };
