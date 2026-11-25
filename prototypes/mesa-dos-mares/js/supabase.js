// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// O Supabase como transporte da mesa (no lugar do servidor local): guarda as linhas de cada mesa no Postgres,
// repassa as mudanças em tempo real e controla quem entra (convite). Só liga se existir supabase-config.js.
// Contas: Supabase Auth (usuário + senha; o usuário vira um e-mail interno, nenhum e-mail de verdade é pedido). Quem joga como convidado entra de forma anônima.
// Quem entra recebe um auth.uid, e é a MESA que dá acesso aos dados.
'use strict';
const SB = (() => {
  let cli = null, on = false, cid = '', q = [], timer = 0, canais = {}, erro = '';
  const cfg = () => window.SUPABASE_CFG || null;
  const linhaId = key => (key === null || key === undefined ? '_' : String(key));

  async function iniciar(id) {
    const c = cfg(); cid = id; erro = '';
    if (!c || !c.url || !c.anonKey || /SEU-PROJETO/.test(c.url)) return false;
    if (!window.supabase) { erro = 'a biblioteca do Supabase não carregou'; return false; }
    try {
      if (!cli) cli = window.supabase.createClient(c.url, c.anonKey, { auth: { persistSession: true, autoRefreshToken: true }, realtime: { params: { eventsPerSecond: 20 } } });
      const s = await cli.auth.getSession();
      if (!s.data.session) { on = false; return false; }   // ninguém entrou ainda: o jogo pede o login
      const sonda = await cli.from('mesas').select('id').limit(1); if (sonda.error) throw sonda.error;   // as tabelas existem?
      on = true; return true;
    } catch (e) { erro = (e && e.message) || String(e); console.warn('Supabase indisponível:', erro); cli = null; on = false; return false; }
  }

  // ---- Contas ----
  const emailDe = k => String(k).toLowerCase() + '@mesadosmares.app';   // e-mail interno: a pessoa só vê o usuário
  const meta = u => (u && u.user_metadata) || {};
  const traduz = e => {
    const m = (e && e.message) || String(e);
    if (/invalid login credentials/i.test(m)) return 'Usuário ou senha incorretos.';
    if (/already registered|already been registered|user already exists/i.test(m)) return 'Esse usuário já existe.';
    if (/email not confirmed/i.test(m)) return CONFIRMA;
    if (/password.*(at least|short|weak)|should be at least/i.test(m)) return 'A senha precisa de ao menos 6 caracteres.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas: espere um pouco e tente de novo.';
    erro = m; return dica() || m;
  };
  const CONFIRMA = 'O Supabase está pedindo confirmação de e-mail: em Authentication → Sign In / Providers → Email, desligue "Confirm email", salve e tente de novo.';
  const dePerfil = u => ({ usuario: meta(u).usuario || String(u.email || '').split('@')[0], roleta: meta(u).roleta || null });
  async function entrar(k, senha) {
    const r = await cli.auth.signInWithPassword({ email: emailDe(k), password: String(senha) });
    if (r.error) return { erro: traduz(r.error) };
    return dePerfil(r.data.user);
  }
  async function criarConta(k, senha, nome) {
    const r = await cli.auth.signUp({ email: emailDe(k), password: String(senha), options: { data: { usuario: String(nome || k) } } });
    if (r.error) return { erro: traduz(r.error) };
    if (!r.data.session) return { erro: CONFIRMA };
    return dePerfil(r.data.user);
  }
  async function convidado() {
    const s = await cli.auth.getSession(), u = s.data && s.data.session && s.data.session.user;
    if (u && !u.is_anonymous) await cli.auth.signOut();
    if (!(u && u.is_anonymous)) { const r = await cli.auth.signInAnonymously(); if (r.error) return { erro: traduz(r.error) }; }
    return {};
  }
  // Quem está dentro agora (nulo para convidado ou ninguém): usado ao abrir o jogo com a sessão guardada
  async function perfil() {
    if (!cli) return null; const s = await cli.auth.getSession(), u = s.data && s.data.session && s.data.session.user;
    return u && !u.is_anonymous ? dePerfil(u) : null;
  }
  async function salvarPerfil(dados) { try { await cli.auth.updateUser({ data: dados }); } catch (e) { console.warn('Supabase: não salvou o perfil', e && e.message); } }
  async function sair() {
    if (!cli) return;
    try { await cli.auth.signOut(); } catch (e) { /* tudo bem */ }
    Object.keys(canais).forEach(k => { try { cli.removeChannel(canais[k]); } catch (e) { /* tudo bem */ } }); canais = {}; on = false;
  }

  // ---- Ler: o estado completo de um escopo ----
  async function estado(esc) {
    if (esc === 'g') {
      const { data, error } = await cli.from('mesas').select('dados'); if (error) throw error;
      const mesas = {}; (data || []).forEach(r => { if (r.dados && r.dados.id) mesas[r.dados.id] = r.dados; });
      const local = (typeof lerLocal === 'function' && lerLocal(GKEY)) || {};
      return { accounts: local.accounts || {}, mesas };   // contas: ainda locais
    }
    const out = {}, msgs = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await cli.from('linhas').select('tabela,chave,dados').eq('mesa_id', esc).range(de, de + 999); if (error) throw error;
      (data || []).forEach(r => {
        if (r.tabela === 'msgs') msgs.push(r.dados);
        else if (r.chave === '_') out[r.tabela] = r.dados;
        else (out[r.tabela] = out[r.tabela] || {})[r.chave] = r.dados;
      });
      if (!data || data.length < 1000) break;
    }
    out.msgs = msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    return out;
  }

  // ---- Gravar: em lotes de 35 ms, como o servidor local ----
  function enviar(esc, m) { q.push({ esc, m }); if (!timer) timer = setTimeout(descarga, 35); }
  async function descarga() {
    timer = 0; const itens = q.splice(0);
    for (const { esc, m } of itens) { try { await um(esc, m); } catch (e) { console.warn('Supabase: não gravou', m && m.t, e && e.message); } }
  }
  async function um(esc, m) {
    if (esc === 'g') {
      if (m.t === 'row' && m.table === 'mesas') {
        if (m.row === null) { await cli.from('mesas').delete().eq('id', m.key); return; }
        const r = await cli.rpc('salvar_mesa', { p_id: m.key, p_nome: m.row.nome, p_codigo: m.row.codigo, p_dados: m.row }); if (r.error) throw r.error;
      }
      return; // contas: só locais por enquanto
    }
    if (m.t === 'row') {
      const chave = m.table === 'msgs' ? String(m.row && m.row.id) : linhaId(m.key);
      if (m.row === null) { await cli.from('linhas').delete().eq('mesa_id', esc).eq('tabela', m.table).eq('chave', chave); return; }
      const r = await cli.from('linhas').upsert({ mesa_id: esc, tabela: m.table, chave, dados: m.row, origem: cid, atualizado: new Date().toISOString() }, { onConflict: 'mesa_id,tabela,chave' }); if (r.error) throw r.error;
    } else if (m.t === 'clear') {
      await cli.from('linhas').delete().eq('mesa_id', esc).eq('tabela', 'msgs').eq('dados->>ch', m.ch);
      efemero(esc, m);
    } else efemero(esc, m);   // tmove, fpose e afins: só passam, não ficam gravados
  }
  function efemero(esc, m) { const c = canais[esc]; if (c) c.send({ type: 'broadcast', event: 'm', payload: { cid, m } }); }

  // ---- Ouvir: um canal por escopo ----
  function assinar(lista, onMsg) {
    Object.keys(canais).forEach(k => { if (!lista.includes(k)) { cli.removeChannel(canais[k]); delete canais[k]; } });
    lista.forEach(esc => {
      if (canais[esc]) return;
      const c = cli.channel('mdm-' + esc, { config: { broadcast: { self: false } } });
      if (esc === 'g') {
        c.on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, p => {
          if (p.eventType === 'DELETE') onMsg({ t: 'row', table: 'mesas', key: p.old.id, row: null, escopo: 'g' });
          else if (p.new && p.new.dados) onMsg({ t: 'row', table: 'mesas', key: p.new.id, row: p.new.dados, escopo: 'g' });
        });
      } else {
        c.on('postgres_changes', { event: '*', schema: 'public', table: 'linhas', filter: 'mesa_id=eq.' + esc }, p => {
          if (p.eventType === 'DELETE') { const o = p.old || {}; if (o.tabela && o.tabela !== 'msgs') onMsg({ t: 'row', table: o.tabela, key: o.chave === '_' ? null : o.chave, row: null, escopo: esc }); return; }
          const n = p.new; if (!n || n.origem === cid) return;   // o próprio eco não volta
          onMsg({ t: 'row', table: n.tabela, key: n.chave === '_' || n.tabela === 'msgs' ? null : n.chave, row: n.dados, escopo: esc });
        });
        c.on('broadcast', { event: 'm' }, p => { const d = p.payload || {}; if (d.cid !== cid && d.m) onMsg(Object.assign({}, d.m, { escopo: esc })); });
      }
      c.subscribe(); canais[esc] = c;
    });
  }

  // ---- Convite: entra pelo código (a mesa ainda não é visível para quem não é membro) ----
  async function entrarCodigo(codigo) {
    const { data, error } = await cli.rpc('entrar_mesa', { p_codigo: codigo }); if (error) throw error;
    return data || null;   // o JSON da mesa, ou null se o código não existe
  }
  async function sairMesa(id) { const r = await cli.rpc('sair_mesa', { p_mesa: id }); if (r.error) throw r.error; }

  // O token da sessão: o narrador hospedado o usa para conferir, no Supabase, que quem chama é membro da mesa
  async function token() { const s = await cli.auth.getSession(); return (s.data && s.data.session && s.data.session.access_token) || ''; }

  // O que fazer, em português, para cada defeito conhecido
  const DICAS = [
    [/anonymous sign-?ins? (are|is) disabled/i, 'No Supabase, abra Authentication → Sign In / Providers, ligue "Anonymous Sign-Ins" e salve.'],
    [/permission denied for (table|schema)/i, 'Faltam as permissões das tabelas: no Supabase, abra o SQL Editor, cole de novo o arquivo supabase/schema.sql (a versão atualizada) e clique em Run.'],
    [/could not find the table|relation .* does not exist|schema cache/i, 'As tabelas ainda não existem: no Supabase, abra o SQL Editor, cole o arquivo supabase/schema.sql e clique em Run.'],
    [/invalid api key|apikey|jwt/i, 'A chave do Supabase está errada: confira SUPABASE_ANON_KEY no Vercel (só a chave pública).'],
    [/failed to fetch|networkerror|load failed/i, 'Não deu para falar com o Supabase: confira a internet e a SUPABASE_URL.'],
  ];
  const dica = () => { const d = DICAS.find(([re]) => re.test(erro)); return d ? d[1] : ''; };
  const configurado = () => { const c = cfg(); return !!(c && c.url && c.anonKey && !/SEU-PROJETO/.test(c.url)); };

  return { iniciar, estado, enviar, assinar, entrarCodigo, sairMesa, token, entrar, criarConta, convidado, perfil, salvarPerfil, sair, get modoConta() { return !!cli; }, get erro() { return erro; }, get dica() { return dica(); }, get configurado() { return configurado(); }, get on() { return on; }, get siteUrl() { const c = cfg(); return (c && c.siteUrl) || ''; } };
})();
