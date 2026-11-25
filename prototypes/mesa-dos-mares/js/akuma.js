// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-25
// Akuma no Mi e o Mercado Negro. As frutas vêm de js/akuma-dados.js (o "Livro das Akuma"). Cada fruta é única na mesa:
// quem a pega, ninguém mais pega. O jogador compra com Berries (preço por categoria em config.js); o mestre também pode entregar.
'use strict';
const AKUMA_TIPOS = { paramecia: 'Paramecia', zoan: 'Zoan', 'zoan-ancestral': 'Zoan Ancestral', 'zoan-mitica': 'Zoan Mítica', logia: 'Logia' };
const AKUMA_CATS = { S: 'Categoria S', A: 'Categoria A', B: 'Categoria B', C: 'Categoria C' };

const Akuma = (() => {
  const lista = () => AKUMA_DADOS;
  const achar = id => AKUMA_DADOS.find(x => x.id === id);
  const donoDe = id => { const m = (db.world && db.world.akuma) || {}; return m[id] ? db.chars[m[id]] : null; };
  // O preço em Berries vem da categoria (config.js: akumaPrecoS/A/B/C)
  const preco = f => Math.round(tune['akumaPreco' + f.c] || 0);

  // Entrega a fruta ao personagem (o mestre entrega; a compra também passa por aqui). Devolve a fruta que ele tinha, se tinha.
  function dar(charId, id, mensagem) {
    const c = db.chars[charId], f = achar(id); if (!c || !f || c.gm) return;
    const velho = c.akuma && c.akuma.id; const dono = donoDe(id);
    if (dono && dono.id !== c.id) { dono.akuma = null; commit('chars', dono.id, dono); }
    c.akuma = { id: f.id, n: f.n, t: f.t, c: f.c, p: f.d }; commit('chars', c.id, c);
    const mapa = Object.assign({}, db.world.akuma); if (velho) delete mapa[velho]; mapa[f.id] = c.id; db.world.akuma = mapa; commit('world', null, db.world);
    sysMsg(chanOf(c), mensagem || (c.nome + ' come a ' + f.n + '. ' + f.d)); sheetDirty = true;
  }
  function tirar(charId) {
    const c = db.chars[charId]; if (!c || !c.akuma) return; const id = c.akuma.id;
    c.akuma = null; commit('chars', c.id, c); const mapa = Object.assign({}, db.world.akuma); delete mapa[id]; db.world.akuma = mapa; commit('world', null, db.world); sheetDirty = true;
  }
  // Por que este personagem não pode comprar esta fruta agora (texto), ou '' se pode
  function porqueNao(c, f) {
    if (!c || c.gm) return 'O mestre entrega as frutas.';
    if (donoDe(f.id)) return 'Já tem dono.';
    if (c.akuma) return 'Você já tem uma Akuma no Mi: quem come uma segunda morre.';
    if ((c.berries || 0) < preco(f)) return 'Faltam ' + berry(preco(f) - (c.berries || 0)) + ' Berries.';
    return '';
  }
  // Compra no Mercado Negro: tira os Berries e entrega a fruta. Devolve um texto de erro, ou '' quando deu certo.
  function comprar(charId, id) {
    const c = db.chars[charId], f = achar(id); if (!c || !f) return 'Essa fruta não existe.';
    const e = porqueNao(c, f); if (e) return e;
    const pr = preco(f); c.berries = (c.berries || 0) - pr; commit('chars', c.id, c);
    dar(c.id, f.id, c.nome + ' fecha negócio no Mercado Negro e leva a ' + f.n + ' por ' + berry(pr) + ' Berries. A fruta agora é só dele(a): não existe outra igual.');
    tone(520, 0.08, 'triangle', 0.2); mesaDirty = true; return '';
  }

  // O Mercado Negro: busca, filtros por categoria e tipo; o jogador compra, o mestre entrega
  function modal() {
    const ov = $('overlay'); let filtro = '', tipo = '', cat = '', soVenda = false, alvo = '', confirma = '', aviso = '';
    const fechar = () => { ov.className = ''; ov.innerHTML = ''; };
    const desenha = () => {
      const c = me(), gm = !!(c && c.gm), jog = Object.values(db.chars).filter(x => !x.gm), todas = lista(), q = filtro.toLowerCase();
      const rows = todas.filter(f => (!tipo || f.t === tipo) && (!cat || f.c === cat) && (!soVenda || !donoDe(f.id)) && (!q || (f.n + ' ' + f.pt + ' ' + f.d + ' ' + f.p.join(' ')).toLowerCase().includes(q)));
      const vendidas = todas.filter(f => donoDe(f.id)).length;
      if (!alvo || !db.chars[alvo]) alvo = jog[0] ? jog[0].id : '';
      ov.innerHTML = `<div class="card akuma-card"><h1 style="font-size:28px">Mercado Negro</h1>
        <div class="tagline">Akuma no Mi: cada fruta é única. Quem pega, ninguém mais pega. ${todas.length - vendidas} à venda · ${vendidas} já têm dono</div>
        ${c && !gm ? `<div class="note" style="text-align:center">Você tem <b>${berry(c.berries || 0)}</b> Berries${c.akuma ? ' · Sua fruta: <b>' + esc(c.akuma.n) + '</b>' : ''}</div>` : ''}
        ${aviso ? `<div class="note" id="akAviso" style="text-align:center;color:var(--danger)">${esc(aviso)}</div>` : ''}
        <div class="row"><input type="search" id="akBusca" placeholder="Buscar por nome, poder ou propriedade" value="${esc(filtro)}" style="flex:1;min-width:160px"></div>
        <div class="row">${[['', 'Todas']].concat(Object.entries(AKUMA_CATS)).map(([k, nm]) => `<button class="btn sm ${cat === k ? '' : 'wood'}" data-ct="${k}">${k ? nm + ' · ' + berry(Math.round(tune['akumaPreco' + k])) : nm}</button>`).join('')}</div>
        <div class="row">${[['', 'Todos os tipos']].concat(Object.entries(AKUMA_TIPOS)).map(([k, nm]) => `<button class="btn sm ${tipo === k ? '' : 'wood'}" data-tp="${k}">${nm}</button>`).join('')}<button class="btn sm ${soVenda ? '' : 'wood'}" id="akVenda">Só as à venda</button></div>
        ${gm ? `<div class="row"><label class="note">Entregar a: <select id="akAlvo">${jog.length ? jog.map(x => `<option value="${x.id}" ${x.id === alvo ? 'selected' : ''}>${esc(x.nome)}${x.akuma ? ' (já tem ' + esc(x.akuma.n.split(' no Mi')[0]) + ')' : ''}</option>`).join('') : '<option value="">ninguém na mesa</option>'}</select></label><button class="btn sm wood" id="akTira">Tirar a fruta dele</button></div>` : ''}
        <div class="akuma-list">${rows.map(f => {
          const d = donoDe(f.id), pr = preco(f), why = gm ? '' : porqueNao(c, f);
          let acao = '';
          if (gm) acao = d ? '' : `<button class="btn sm" data-dar="${f.id}" ${alvo ? '' : 'disabled'}>Entregar</button>`;
          else if (d) acao = '<span class="tag">vendida</span>';
          else if (confirma === f.id) acao = `<button class="btn sm" data-ok="${f.id}">Confirmar ${berry(pr)}</button>`;
          else acao = `<button class="btn sm" data-compra="${f.id}" ${why ? 'disabled title="' + esc(why) + '"' : ''}>Comprar ${berry(pr)}</button>`;
          return `<div class="ord ak-row"><div style="flex:1;min-width:0"><b>${esc(f.n)}</b> <span class="tag ak-${f.t}">${AKUMA_TIPOS[f.t]}</span> <span class="tag ak-cat ak-cat-${f.c}">${f.c}</span><div class="note">${f.pt ? esc(f.pt) + ' · ' : ''}${esc(f.d)}<br><i>${esc(f.p.join(' · '))}</i>${d ? ' · <b>com ' + esc(d.nome) + '</b>' : ''}${!d && !gm && why ? ' · ' + esc(why) : ''}</div></div>${acao}</div>`;
        }).join('') || '<div class="note">Nenhuma fruta encontrada.</div>'}</div>
        <div class="actions"><button class="btn" id="akFecha">Fechar</button></div></div>`;
      ov.className = 'on'; $('akFecha').onclick = fechar;
      $('akBusca').oninput = e => { filtro = e.target.value; const pos = e.target.selectionStart; desenha(); const b = $('akBusca'); b.focus(); b.setSelectionRange(pos, pos); };
      ov.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { tipo = b.dataset.tp; desenha(); });
      ov.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { cat = b.dataset.ct; desenha(); });
      $('akVenda').onclick = () => { soVenda = !soVenda; desenha(); };
      if ($('akTira')) $('akTira').onclick = () => { if (alvo) { tirar(alvo); desenha(); } };
      if ($('akAlvo')) $('akAlvo').onchange = e => { alvo = e.target.value; };
      ov.querySelectorAll('[data-dar]').forEach(b => b.onclick = () => { if (!alvo) return; dar(alvo, b.dataset.dar); toast('Fruta entregue.'); desenha(); });
      ov.querySelectorAll('[data-compra]').forEach(b => b.onclick = () => { confirma = b.dataset.compra; aviso = ''; desenha(); });
      ov.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => { const e = comprar(c.id, b.dataset.ok); confirma = ''; aviso = e; if (!e) toast('Negócio fechado.'); sheetDirty = true; desenha(); });
    };
    desenha();
  }
  return { lista, achar, dar, tirar, preco, porqueNao, comprar, modal, donoDe };
})();
