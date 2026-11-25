// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-25
// Fichas do Mestre: personagens prontos (NPCs, rivais, chefes) criados só com o nível, com pontos de atributo, técnicas e pastas.
// Ficam em db.world.fichas e db.world.pastas (o "world" já é salvo e sincronizado; não precisa de tabela nova).
'use strict';

const Fichas = (() => {
  const PONTOS_BASE = 12;            // o mesmo que o conjunto padrão 15, 14, 13, 12, 10, 8 dá a um personagem (72 − 6×10 = 12)
  const ATTR_MIN = 8;
  const LADOS = { pirata: 'Pirata', marinha: 'Marinha', neutro: 'Neutro' }, KIND_DO_LADO = { pirata: 'rival', marinha: 'marujo', neutro: 'aldeao' };
  let sel = '', dirty = true, aberta = {}, qtd = 1;

  const todas = () => (db.world.fichas = db.world.fichas || {});
  const pastas = () => (db.world.pastas = db.world.pastas || []);
  const grava = () => { commit('world', null, db.world); dirty = true; };
  const lista = () => Object.values(todas()).sort((a, b) => a.nome.localeCompare(b.nome));

  // ---- Pontos: 12 de início + 2 a cada aumento de atributo (níveis 4, 8, 12, 16 e 20) ----
  const aumentos = lv => AVA.filter(x => x <= lv).length;
  const pontosTotal = lv => PONTOS_BASE + 2 * aumentos(lv);
  const valor = (f, k) => (f.attrs[k] == null ? 10 : f.attrs[k]);
  const gastos = f => ATRIBUTOS.reduce((s, a) => s + valor(f, a.k) - 10, 0);
  const livres = f => pontosTotal(f.lv) - gastos(f);
  const limite = f => attrLimite(f.lv);

  // Se o nível baixou e os pontos não cabem mais, devolve pontos tirando dos maiores atributos
  function ajusta(f) {
    ATRIBUTOS.forEach(a => { if (valor(f, a.k) > limite(f)) f.attrs[a.k] = limite(f); });
    while (livres(f) < 0) {
      const k = ATRIBUTOS.map(a => a.k).sort((x, y) => valor(f, y) - valor(f, x))[0];
      f.attrs[k]--;
    }
  }
  function mexe(f, k, d) {
    const novo = valor(f, k) + d;
    if (novo < ATTR_MIN || novo > limite(f)) return false;
    if (d > 0 && livres(f) <= 0) return false;
    f.attrs[k] = novo; return true;
  }
  // "Distribuir sozinho": atributo do ataque, Constituição e Destreza primeiro
  function distribuir(f) {
    ATRIBUTOS.forEach(a => { f.attrs[a.k] = 10; });
    const p = atkAttr(f), passos = [[p, 16], ['CON', 14], ['DES', 14], ['VON', 12], [p, 99], ['CON', 99], ['DES', 99], ['FOR', 12], ['SAB', 12], ['PRE', 12], ['VON', 99], ['FOR', 99], ['SAB', 99], ['PRE', 99]];
    passos.forEach(([k, alvo]) => { while (valor(f, k) < Math.min(alvo, limite(f)) && livres(f) > 0) f.attrs[k]++; });
  }

  function derivados(f) {
    const mod = attr(f, atkAttr(f)), r = RACES[f.raca] || {};
    return { hp: hpMaxOf(f), pp: stMaxOf(f), cr: defOf(f), atk: mod + bonusProf(f.lv), dano: atkDice(f, []) + '+' + (mod + (r.dmg || 0)), alcance: atkReach(f, []) };
  }

  // ---- Criar, duplicar, apagar ----
  function criar(nome, lv, extra) {
    lv = clamp(Math.round(+lv) || 1, 1, tune.maxLv);
    const id = 'fc-' + uid(), classe = (extra && extra.classe) || 'lutador';
    const f = Object.assign({ id, v: 2, nome: (nome || '').trim().slice(0, 30) || 'Sem nome', lv, classe, raca: 'humano', lado: 'pirata', pasta: '', attrs: {}, ataques: [], img: null, nota: '' }, extra || {});
    ATRIBUTOS.forEach(a => { f.attrs[a.k] = 10; });
    distribuir(f);
    todas()[id] = f; grava(); return f;
  }
  function duplicar(f) {
    const c = JSON.parse(JSON.stringify(f)); c.id = 'fc-' + uid(); c.nome = (f.nome + ' (cópia)').slice(0, 30);
    c.ataques.forEach(a => { a.id = 'a' + uid(); }); todas()[c.id] = c; grava(); return c;
  }
  function apagar(f) { delete todas()[f.id]; if (sel === f.id) sel = ''; grava(); }

  // ---- Pastas ----
  function novaPasta(nome) { nome = (nome || '').trim().slice(0, 30); if (!nome) return null; const p = { id: 'pa-' + uid(), nome }; pastas().push(p); grava(); return p; }
  function renomeiaPasta(p, nome) { nome = (nome || '').trim().slice(0, 30); if (nome) { p.nome = nome; grava(); } }
  function apagaPasta(p) { lista().forEach(f => { if (f.pasta === p.id) f.pasta = ''; }); db.world.pastas = pastas().filter(x => x.id !== p.id); grava(); }

  // ---- Pôr em cena: vira um token de NPC com a Vida, o ataque, a defesa e as técnicas da ficha ----
  function emCena(f, isl, n) {
    const d = derivados(f), kind = KIND_DO_LADO[f.lado] || 'bandido', saida = [];
    const tecs = [BASIC, ...f.ataques].map(a => ({ nome: a.nome, custo: a.custo, fx: a.fx.slice() }));
    for (let i = 0; i < n; i++) {
      saida.push(Combat.spawnNpc(isl, kind, f.lv, {
        nome: n > 1 ? f.nome + ' ' + (i + 1) : f.nome, img: f.img || null, hp: d.hp, hpMax: d.hp, st: d.pp, stMax: d.pp,
        atkB: d.atk - npcAtk(f.lv), defB: d.cr - npcDef(f.lv), nota: f.nota || '', fid: f.id,
        ficha: { classe: f.classe, raca: f.raca, prim: f.prim || null, attrs: Object.assign({}, f.attrs), lv: f.lv }, tecs,
      }));
    }
    return saida;
  }

  // ---- A aba ----
  const sg = n => (n >= 0 ? '+' : '') + n;
  function listaHTML() {
    const fs = lista(), card = f => {
      const d = derivados(f);
      return `<div class="fc-item" data-abre="${f.id}"><img class="pic sm" src="${esc(f.img || Chat.tokenPortrait({ id: f.id, kind: KIND_DO_LADO[f.lado] || 'bandido', seed: Math.abs(hashStr(f.id)), nome: f.nome }))}" alt=""><div style="flex:1"><b>${esc(f.nome)}</b> <small>nv ${f.lv}</small><div class="note">${esc(CLASSES[f.classe].nome)} · ${esc(RACES[f.raca].nome)} · ${LADOS[f.lado] || ''} · Vida ${d.hp} · ${f.ataques.length} técnica(s)${livres(f) > 0 ? ' · <b style="color:var(--no)">' + livres(f) + ' ponto(s) sobrando</b>' : ''}</div></div></div>`;
    };
    const grupo = (p, itens) => `<details class="fc-pasta" data-pasta="${p ? p.id : ''}" ${aberta[p ? p.id : ''] === false ? '' : 'open'}><summary><span>📁 ${p ? esc(p.nome) : 'Sem pasta'}</span> <small>${itens.length}</small>${p ? `<button class="btn sm wood" data-ren="${p.id}" title="Renomear a pasta">Renomear</button><button class="btn sm wood" data-delp="${p.id}" title="Apagar a pasta (as fichas ficam sem pasta)">Apagar</button>` : ''}</summary>${itens.length ? itens.map(card).join('') : '<div class="note">Vazia.</div>'}</details>`;
    let h = pastas().map(p => grupo(p, fs.filter(f => f.pasta === p.id))).join('');
    const soltas = fs.filter(f => !f.pasta || !pastas().some(p => p.id === f.pasta));
    if (soltas.length || !pastas().length) h += grupo(null, soltas);
    return h;
  }

  function editorHTML(f) {
    const d = derivados(f), liv = livres(f), est = ESTILOS[f.classe], lim = limite(f), cap = atkCap(f);
    const sel_ = (id, opts, cur) => `<select id="${id}">${opts.map(([k, n]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
    return `<div class="row"><button class="btn sm wood" id="fcVolta">← Fichas</button><button class="btn sm wood" id="fcDup">Duplicar</button><button class="btn sm red" id="fcDel">Apagar</button></div>
    <div class="sheet-top">${f.img ? `<img class="pic" src="${esc(f.img)}" alt="" style="width:64px;height:64px;object-fit:cover">` : ''}<div style="flex:1"><div class="gm-edit">
      <label class="gm-f"><span>Nome</span><input type="text" id="fcNome" maxlength="30" value="${esc(f.nome)}"></label>
      <label class="gm-f"><span>Nível (1 a ${tune.maxLv})</span><input type="number" id="fcLv" min="1" max="${tune.maxLv}" value="${f.lv}"></label>
      <label class="gm-f"><span>Estilo</span>${sel_('fcClasse', Object.entries(ESTILOS).map(([k, e]) => [k, e.nome]), f.classe)}</label>
      <label class="gm-f"><span>Espécie</span>${sel_('fcRaca', Object.entries(ESPECIES).filter(([k, e]) => !e.mestico).map(([k, e]) => [k, e.nome]), f.raca)}</label>
      <label class="gm-f"><span>Lado</span>${sel_('fcLado', Object.entries(LADOS), f.lado)}</label>
      <label class="gm-f"><span>Pasta</span>${sel_('fcPasta', [['', 'Sem pasta'], ...pastas().map(p => [p.id, p.nome])], f.pasta || '')}</label>
      ${est.prim.length > 1 ? `<label class="gm-f"><span>Atributo do ataque</span>${sel_('fcPrim', est.prim.map(k => [k, k]), atkAttr(f))}</label>` : ''}</div></div></div>
    <div class="row"><label class="btn wood sm" for="fcFile">Imagem do token</label><input type="file" id="fcFile" accept="image/*" hidden>${f.img ? '<button class="btn sm wood" id="fcImgTira">Tirar a imagem</button>' : ''}</div>
    <label class="gm-f" style="margin:6px 0"><span>Anotações</span><input type="text" id="fcNota" maxlength="160" value="${esc(f.nota || '')}" placeholder="Ex.: capitão do navio, odeia a Marinha"></label>
    <div class="stats"><div><b>${d.hp}</b><span>Vida</span></div><div><b>${d.pp}</b><span>PP</span></div><div><b>${d.cr}</b><span>CR</span></div><div><b>${sg(d.atk)}</b><span>Ataque</span></div><div><b>${d.dano}</b><span>Dano</span></div></div>
    <h3>Atributos <span class="pts" style="${liv ? '' : 'opacity:.6'}">${liv} ponto(s) livre(s) de ${pontosTotal(f.lv)}</span></h3>
    <div class="note">Todo atributo parte de 10. O nível ${f.lv} dá <b>${pontosTotal(f.lv)}</b> pontos (${PONTOS_BASE} iniciais${aumentos(f.lv) ? ' + ' + 2 * aumentos(f.lv) + ' dos aumentos de atributo' : ''}). Cada atributo vai de ${ATTR_MIN} a ${lim}; baixar devolve pontos.</div>
    <div class="row"><button class="btn sm" id="fcAuto">Distribuir sozinho</button><button class="btn sm wood" id="fcZera">Zerar</button></div>
    <div class="attr-grid">${ATRIBUTOS.map(a => `<div class="attr ${atkAttr(f) === a.k ? 'salv' : ''}" title="${esc(a.desc)}"><span class="k">${a.k}</span><span class="v">${valor(f, a.k)} <small>(${sg(attr(f, a.k))})</small></span><button class="btn sm wood" data-fa="${a.k}" data-d="-1" ${valor(f, a.k) <= ATTR_MIN ? 'disabled' : ''}>−</button><button class="btn sm wood" data-fa="${a.k}" data-d="1" ${valor(f, a.k) >= lim || liv <= 0 ? 'disabled' : ''}>+</button></div>`).join('')}</div>
    <h3>Técnicas</h3><div class="note">Dano inicial <b>${atkDice(f, [])}+${attr(f, atkAttr(f))}</b>; cada técnica custa PP e pode custar até <b>${cap}</b> neste nível. Máximo de ${tune.atkMax}.</div>
    <button class="btn tec-cta" id="fcTecNova" ${f.ataques.length >= tune.atkMax ? 'disabled' : ''}>+ Criar técnica</button>
    <div class="tec-list">${[BASIC, ...f.ataques].map(a => `<div class="tec"><div class="tec-h"><b>${esc(a.nome)}</b><span>custo ${a.custo}</span></div><div class="note">${atkDice(f, a.fx)}+${attr(f, atkAttr(f)) + ((RACES[f.raca] || {}).dmg || 0)} · alcance ${atkReach(f, a.fx)}</div><div>${a.fx.length ? [...new Set(a.fx)].map(k => '<span class="chip-fx">' + FX[k].nome + (countFx(a.fx, k) > 1 ? ' ×' + countFx(a.fx, k) : '') + '</span>').join('') : '<span class="chip-fx">sem efeitos</span>'}</div>${a.id === 'basico' ? '' : `<button class="btn sm wood" data-tec="${a.id}">Editar</button>`}</div>`).join('')}</div>
    <h3>Pôr em cena</h3>${isIsland(currentView()) ? `<div class="row"><label class="note">Quantidade <input type="number" id="fcQtd" min="1" max="8" value="${qtd}" style="width:64px"></label><button class="btn" id="fcCena">Pôr em ${esc(ISLAND[currentView()].nome)}</button></div><div class="note">O token chega com Vida ${d.hp}, PP ${d.pp}, CR ${d.cr} e as técnicas da ficha. No combate ele usa a técnica mais forte que os PP pagam.</div>` : '<div class="note">Vá a uma ilha (aba Mesa → lugar) para pôr esta ficha no mapa.</div>'}`;
  }

  function render(el) {
    dirty = false;
    if (!isGM()) { el.innerHTML = '<div class="note">Só o Mestre usa as fichas.</div>'; return; }
    if (sel && !todas()[sel]) sel = '';
    const f = sel ? todas()[sel] : null, on = (s, fn) => el.querySelectorAll(s).forEach(fn), $$ = id => el.querySelector('#' + id);
    if (!f) {
      el.innerHTML = `<h3>Criar ficha rápida</h3><div class="note">Só o nome e o nível: a ficha já nasce com os pontos do nível distribuídos. Depois é só ajustar atributos e criar técnicas.</div>
      <div class="row"><input type="text" id="fcNovoNome" maxlength="30" placeholder="Nome (opcional)" style="flex:1;min-width:120px"><label class="note">Nível <input type="number" id="fcNovoLv" min="1" max="${tune.maxLv}" value="1" style="width:64px"></label><button class="btn" id="fcCria">Criar</button></div>
      <h3>Fichas criadas <small>${lista().length}</small></h3>
      <div class="row"><input type="text" id="fcPastaNome" maxlength="30" placeholder="Nova pasta" style="flex:1;min-width:120px"><button class="btn sm wood" id="fcPastaCria">+ Pasta</button></div>
      <div id="fcLista">${listaHTML()}</div>`;
      const cria = () => { const f2 = criar($$('fcNovoNome').value, $$('fcNovoLv').value); sel = f2.id; dirty = true; };
      $$('fcCria').onclick = cria; $$('fcNovoNome').onkeydown = e => { if (e.key === 'Enter') cria(); };
      $$('fcPastaCria').onclick = () => { if (novaPasta($$('fcPastaNome').value)) toast('Pasta criada.'); else toast('Dê um nome à pasta.'); };
      on('[data-abre]', b => b.onclick = () => { sel = b.dataset.abre; dirty = true; });
      on('details[data-pasta]', d => d.ontoggle = () => { aberta[d.dataset.pasta] = d.open; });
      on('[data-ren]', b => b.onclick = e => { e.preventDefault(); const p = pastas().find(x => x.id === b.dataset.ren); const n = p && prompt('Novo nome da pasta:', p.nome); if (n) renomeiaPasta(p, n); });
      on('[data-delp]', b => b.onclick = e => { e.preventDefault(); const p = pastas().find(x => x.id === b.dataset.delp); if (p && confirm('Apagar a pasta "' + p.nome + '"? As fichas dela ficam sem pasta.')) apagaPasta(p); });
      return;
    }
    el.innerHTML = editorHTML(f);
    const salva = () => { grava(); };
    $$('fcVolta').onclick = () => { sel = ''; dirty = true; };
    $$('fcDup').onclick = () => { sel = duplicar(f).id; dirty = true; toast('Ficha duplicada.'); };
    $$('fcDel').onclick = () => { if (confirm('Apagar a ficha "' + f.nome + '"? Os tokens já postos no mapa continuam.')) apagar(f); };
    $$('fcNome').onchange = e => { const v = e.target.value.trim().slice(0, 30); if (v) f.nome = v; salva(); };
    $$('fcLv').onchange = e => { f.lv = clamp(Math.round(+e.target.value) || 1, 1, tune.maxLv); const antes = f.ataques.length; f.ataques = f.ataques.filter(a => a.custo <= atkCap(f)); ajusta(f); salva(); if (f.ataques.length < antes) toast('Técnicas caras demais para este nível foram removidas.'); };
    $$('fcClasse').onchange = e => { f.classe = e.target.value; f.prim = null; f.ataques = f.ataques.filter(a => a.custo <= atkCap(f)); salva(); };
    $$('fcRaca').onchange = e => { f.raca = e.target.value; salva(); };
    $$('fcLado').onchange = e => { f.lado = e.target.value; salva(); };
    $$('fcPasta').onchange = e => { f.pasta = e.target.value; salva(); };
    if ($$('fcPrim')) $$('fcPrim').onchange = e => { f.prim = e.target.value; salva(); };
    $$('fcNota').onchange = e => { f.nota = e.target.value.trim().slice(0, 160); salva(); };
    $$('fcFile').onchange = e => processUpload(e.target.files[0], tune.tokenImgSize, url => { f.img = url; salva(); });
    if ($$('fcImgTira')) $$('fcImgTira').onclick = () => { f.img = null; salva(); };
    $$('fcAuto').onclick = () => { distribuir(f); salva(); };
    $$('fcZera').onclick = () => { ATRIBUTOS.forEach(a => { f.attrs[a.k] = 10; }); salva(); };
    on('[data-fa]', b => b.onclick = () => { if (mexe(f, b.dataset.fa, +b.dataset.d)) salva(); });
    $$('fcTecNova').onclick = () => atkEditor(null, f, c => { grava(); });
    on('[data-tec]', b => b.onclick = () => atkEditor(f.ataques.find(a => a.id === b.dataset.tec), f, c => { grava(); }));
    if ($$('fcCena')) $$('fcCena').onclick = () => { qtd = clamp(Math.round(+$$('fcQtd').value) || 1, 1, 8); const v = currentView(); if (!isIsland(v)) return; emCena(f, v, qtd); toast(f.nome + (qtd > 1 ? ' ×' + qtd : '') + ' em cena.'); };
  }

  return { render, criar, duplicar, apagar, novaPasta, apagaPasta, renomeiaPasta, emCena, derivados, distribuir, mexe, ajusta, pontosTotal, gastos, livres, lista, todas, pastas,
    get dirty() { return dirty; }, set dirty(v) { dirty = v; }, get sel() { return sel; }, set sel(v) { sel = v; dirty = true; } };
})();
