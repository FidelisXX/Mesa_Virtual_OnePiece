// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// Build do Vercel: copia só o que o jogador precisa para dist/ (sem server/, supabase/, evidence/, api/, notas) e
// escreve dist/supabase-config.js a partir das variáveis de ambiente do projeto. Sem dependências.
//   Variáveis: SUPABASE_URL, SUPABASE_ANON_KEY (a chave PÚBLICA, nunca a service_role), SITE_URL (opcional)
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..'), dist = path.join(raiz, 'dist');
const FORA = new Set(['server', 'supabase', 'evidence', 'api', 'scripts', 'dist', 'node_modules', 'brief.md', 'supabase-config.js', 'supabase-config.example.js', 'vercel.json', 'package.json']);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.readdirSync(raiz).forEach(nome => {
  if (FORA.has(nome) || nome.startsWith('.') || nome.endsWith('.md')) return;
  fs.cpSync(path.join(raiz, nome), path.join(dist, nome), { recursive: true });
});

const url = String(process.env.SUPABASE_URL || '').trim(), chave = String(process.env.SUPABASE_ANON_KEY || '').trim();
if (/service_role/i.test(chave) || chave.split('.').length === 3 && /"role"\s*:\s*"service_role"/.test(Buffer.from(chave.split('.')[1], 'base64').toString('utf8'))) {
  console.error('SUPABASE_ANON_KEY parece a chave service_role. Use só a chave pública (anon / publishable).'); process.exit(1);
}
const site = process.env.SITE_URL || (process.env.VERCEL_ENV === 'production' || !process.env.VERCEL_URL ? 'https://opmesa.vercel.app' : 'https://' + process.env.VERCEL_URL);
const cfg = { url, anonKey: chave, siteUrl: site };
fs.writeFileSync(path.join(dist, 'supabase-config.js'), '// gerado pelo build (scripts/vercel-build.js)\nwindow.SUPABASE_CFG = ' + JSON.stringify(cfg, null, 2) + ';\n');

const n = (d => { let c = 0; (function ver(p) { fs.readdirSync(p, { withFileTypes: true }).forEach(e => e.isDirectory() ? ver(path.join(p, e.name)) : c++); })(d); return c; })(dist);
console.log('dist pronto: ' + n + ' arquivos · Supabase ' + (url && chave ? 'ligado (' + url + ')' : 'NÃO configurado (o jogo roda só local)') + ' · site ' + site);
