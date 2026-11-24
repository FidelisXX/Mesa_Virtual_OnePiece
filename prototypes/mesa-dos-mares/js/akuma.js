// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// Catálogo de Akuma no Mi. ATENÇÃO: lista PARCIAL, escrita só com as frutas de que há certeza (mangá, sem filler);
// não foi conferida contra uma wiki (as wikis recusaram o acesso automático). O mestre acrescenta as que faltarem pelo próprio catálogo.
// Formato de cada linha: nome | tipo | usuário(s) | poder
'use strict';
const AKUMA_TIPOS = { paramecia: 'Paramecia', zoan: 'Zoan', 'zoan-ancestral': 'Zoan Ancestral', 'zoan-mitica': 'Zoan Mítica', logia: 'Logia' };
const AKUMA_RAW = `
Bara Bara no Mi|paramecia|Buggy|O corpo se divide em partes que flutuam
Sube Sube no Mi|paramecia|Alvida|A pele fica lisa e tudo escorrega nela
Bomu Bomu no Mi|paramecia|Mr. 5|Faz o corpo e o que ele toca explodirem
Kilo Kilo no Mi|paramecia|Miss Valentine|Muda o próprio peso, de 1 kg a 10.000 kg
Doru Doru no Mi|paramecia|Mr. 3|Cria e endurece cera
Baku Baku no Mi|paramecia|Wapol|Devora coisas e funde o que comeu com o corpo
Ori Ori no Mi|paramecia|Hina|Prende com grilhões de ferro
Bane Bane no Mi|paramecia|Bellamy|Transforma o corpo em molas
Noro Noro no Mi|paramecia|Foxy|Feixe que torna lento o que atinge
Doa Doa no Mi|paramecia|Blueno|Cria portas no ar
Awa Awa no Mi|paramecia|Kalifa|Bolhas de sabão que tiram a força
Beri Beri no Mi|paramecia|Very Good|Divide o corpo em esferas
Supa Supa no Mi|paramecia|Mr. 1|O corpo vira lâminas de aço
Toge Toge no Mi|paramecia|Miss Doublefinger|Espinhos por todo o corpo
Mane Mane no Mi|paramecia|Bon Clay|Copia o rosto e a voz de quem tocou
Hana Hana no Mi|paramecia|Nico Robin|Brota partes do corpo em qualquer lugar
Horo Horo no Mi|paramecia|Perona|Fantasmas que roubam a vontade de quem tocam
Suke Suke no Mi|paramecia|Absalom|Invisibilidade
Nikyu Nikyu no Mi|paramecia|Bartholomew Kuma|Repele tudo o que as patas tocam
Mero Mero no Mi|paramecia|Boa Hancock|Petrifica quem se encanta por ela
Ito Ito no Mi|paramecia|Donquixote Doflamingo|Fios que cortam e controlam pessoas
Yomi Yomi no Mi|paramecia|Brook|Revive uma vez e usa poderes da alma
Kage Kage no Mi|paramecia|Gecko Moria|Rouba e controla sombras
Hobi Hobi no Mi|paramecia|Sugar|Transforma pessoas em brinquedos
Ope Ope no Mi|paramecia|Trafalgar Law|Cria a Sala e faz cirurgias impossíveis
Gura Gura no Mi|paramecia|Edward Newgate (Barba Branca), Marshall D. Teach|Causa terremotos
Buki Buki no Mi|paramecia|Baby 5|O corpo vira armas
Hira Hira no Mi|paramecia|Diamante|Transforma coisas em uma bandeira ondulante
Ishi Ishi no Mi|paramecia|Pica|Funde-se à pedra e a molda
Doku Doku no Mi|paramecia|Magellan|Produz e controla veneno
Jiki Jiki no Mi|paramecia|Eustass Kid|Controla o magnetismo
Wara Wara no Mi|paramecia|Basil Hawkins|Boneco de palha que passa o dano adiante
Fuku Fuku no Mi|paramecia|Kin'emon|Transforma coisas em roupas
Toki Toki no Mi|paramecia|Kozuki Toki|Viaja no tempo
Chiyu Chiyu no Mi|paramecia|Mansherry|Cura feridas
Giro Giro no Mi|paramecia|Viola|Vê através de tudo, até a mente
Zushi Zushi no Mi|paramecia|Issho (Fujitora)|Controla a gravidade
Bari Bari no Mi|paramecia|Bartolomeo|Cria barreiras invisíveis
Memo Memo no Mi|paramecia|Charlotte Pudding|Manipula memórias
Mochi Mochi no Mi|paramecia|Charlotte Katakuri|Controla mochi (paramecia especial)
Pero Pero no Mi|paramecia|Charlotte Perospero|Doces que prendem e se espalham
Bisu Bisu no Mi|paramecia|Charlotte Cracker|Cria biscoitos e soldados deles
Buku Buku no Mi|paramecia|Charlotte Mont-d'Or|Entra em livros e prende pessoas neles
Mira Mira no Mi|paramecia|Charlotte Brûlée|Viaja pelos espelhos
Shibo Shibo no Mi|paramecia|Charlotte Smoothie|Espreme e seca o que toca
Netsu Netsu no Mi|paramecia|Charlotte Oven|Esquenta e derrete o que toca
Hito Hito no Mi|zoan|Tony Tony Chopper|Vira humano e híbrido
Neko Neko no Mi, Modelo: Leopardo|zoan|Rob Lucci|Transforma-se em leopardo
Ushi Ushi no Mi, Modelo: Girafa|zoan|Kaku|Transforma-se em girafa
Ushi Ushi no Mi, Modelo: Bisão|zoan|Dalton|Transforma-se em bisão
Inu Inu no Mi, Modelo: Lobo|zoan|Jabra|Transforma-se em lobo
Inu Inu no Mi, Modelo: Chacal|zoan|Chaka|Transforma-se em chacal
Tori Tori no Mi, Modelo: Falcão|zoan|Pell|Transforma-se em falcão
Uma Uma no Mi|zoan|Pierre|Transforma-se em cavalo
Sara Sara no Mi, Modelo: Axolotl|zoan|Smiley|Transforma-se em axolote
Hebi Hebi no Mi, Modelo: Anaconda|zoan|Boa Sandersonia|Transforma-se em anaconda
Hebi Hebi no Mi, Modelo: Cobra-Rei|zoan|Boa Marigold|Transforma-se em cobra-rei
Zou Zou no Mi, Modelo: Mamute|zoan-ancestral|Jack|Transforma-se em mamute
Ryu Ryu no Mi, Modelo: Allosaurus|zoan-ancestral|X Drake|Transforma-se em allosaurus
Ryu Ryu no Mi, Modelo: Spinosaurus|zoan-ancestral|Page One|Transforma-se em spinosaurus
Ryu Ryu no Mi, Modelo: Pteranodon|zoan-ancestral|King|Transforma-se em pteranodon
Ryu Ryu no Mi, Modelo: Brachiosaurus|zoan-ancestral|Queen|Transforma-se em brachiosaurus
Ryu Ryu no Mi, Modelo: Pachycephalosaurus|zoan-ancestral|Ulti|Transforma-se em pachycephalosaurus
Ryu Ryu no Mi, Modelo: Triceratops|zoan-ancestral|Sasaki|Transforma-se em triceratops
Neko Neko no Mi, Modelo: Tigre-dentes-de-sabre|zoan-ancestral|Who's-Who|Transforma-se em tigre-dentes-de-sabre
Hito Hito no Mi, Modelo: Daibutsu|zoan-mitica|Sengoku|Vira um Buda gigante de ouro e emite ondas de choque
Hito Hito no Mi, Modelo: Nika|zoan-mitica|Monkey D. Luffy|O Guerreiro da Libertação: corpo e ambiente de borracha (antes chamada Gomu Gomu no Mi)
Tori Tori no Mi, Modelo: Fênix|zoan-mitica|Marco|Chamas azuis que curam e regeneram
Uo Uo no Mi, Modelo: Seiryu|zoan-mitica|Kaido|Transforma-se em dragão azul
Inu Inu no Mi, Modelo: Okuchi no Makami|zoan-mitica|Yamato|Transforma-se em lobo divino
Hebi Hebi no Mi, Modelo: Yamata no Orochi|zoan-mitica|Kurozumi Orochi|Serpente de oito cabeças
Mera Mera no Mi|logia|Portgas D. Ace, Sabo|Transforma-se em fogo
Moku Moku no Mi|logia|Smoker|Transforma-se em fumaça
Suna Suna no Mi|logia|Crocodile|Transforma-se em areia e resseca o que toca
Goro Goro no Mi|logia|Eneru|Transforma-se em raio
Hie Hie no Mi|logia|Aokiji (Kuzan)|Transforma-se em gelo e congela
Pika Pika no Mi|logia|Kizaru (Borsalino)|Transforma-se em luz
Magu Magu no Mi|logia|Akainu (Sakazuki)|Transforma-se em magma
Yami Yami no Mi|logia|Marshall D. Teach|Trevas que atraem e anulam poderes de outras frutas
Gasu Gasu no Mi|logia|Caesar Clown|Transforma-se em gás
Yuki Yuki no Mi|logia|Monet|Transforma-se em neve
`;
const AKUMA_BASE = AKUMA_RAW.trim().split('\n').map(l => {
  const [n, t, u, p] = l.split('|'); return { id: n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), n, t, u, p };
});

const Akuma = (() => {
  const extras = () => (db.world && db.world.akumaExtra) || [];
  const lista = () => AKUMA_BASE.concat(extras());
  const donoDe = id => { const m = (db.world && db.world.akuma) || {}; return m[id] ? db.chars[m[id]] : null; };
  function dar(charId, id) {
    const c = db.chars[charId], f = lista().find(x => x.id === id); if (!c || !f || c.gm) return;
    const velho = c.akuma && c.akuma.id; const dono = donoDe(id);
    if (dono && dono.id !== c.id) { dono.akuma = null; commit('chars', dono.id, dono); }
    c.akuma = { id: f.id, n: f.n, t: f.t, p: f.p }; commit('chars', c.id, c);
    const mapa = Object.assign({}, db.world.akuma); if (velho) delete mapa[velho]; mapa[f.id] = c.id; db.world.akuma = mapa; commit('world', null, db.world);
    sysMsg(chanOf(c), c.nome + ' come a ' + f.n + '. ' + f.p + '.'); sheetDirty = true;
  }
  function tirar(charId) {
    const c = db.chars[charId]; if (!c || !c.akuma) return; const id = c.akuma.id;
    c.akuma = null; commit('chars', c.id, c); const mapa = Object.assign({}, db.world.akuma); delete mapa[id]; db.world.akuma = mapa; commit('world', null, db.world); sheetDirty = true;
  }
  function criar(n, t, u, p) {
    n = String(n || '').trim().slice(0, 50); if (!n) return 'Dê um nome à fruta.';
    const id = 'x-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (lista().some(f => f.id === id)) return 'Já existe uma fruta com esse nome.';
    db.world.akumaExtra = extras().concat([{ id, n, t: AKUMA_TIPOS[t] ? t : 'paramecia', u: String(u || '').slice(0, 60) || '—', p: String(p || '').slice(0, 120) || '—', extra: true }]); commit('world', null, db.world); return null;
  }
  // O catálogo: busca, filtro por tipo; o mestre entrega a fruta a um jogador
  function modal() {
    const ov = $('overlay'), c = me(), gm = !!(c && c.gm); let filtro = '', tipo = '', alvo = '';
    const fechar = () => { ov.className = ''; ov.innerHTML = ''; };
    const desenha = () => {
      const jog = Object.values(db.chars).filter(x => !x.gm), todas = lista(), q = filtro.toLowerCase();
      const rows = todas.filter(f => (!tipo || f.t === tipo) && (!q || (f.n + ' ' + f.u + ' ' + f.p).toLowerCase().includes(q)));
      if (!alvo || !db.chars[alvo]) alvo = jog[0] ? jog[0].id : '';
      ov.innerHTML = `<div class="card akuma-card"><h1 style="font-size:28px">Akuma no Mi</h1>
        <div class="tagline">${todas.length} frutas no catálogo (lista parcial; o mestre pode acrescentar) · ${rows.length} à mostra</div>
        ${c && !gm && c.akuma ? `<div class="note" style="text-align:center">Sua fruta: <b>${esc(c.akuma.n)}</b></div>` : ''}
        <div class="row"><input type="search" id="akBusca" placeholder="Buscar por nome, usuário ou poder" value="${esc(filtro)}" style="flex:1;min-width:160px"></div>
        <div class="row">${[['', 'Todas']].concat(Object.entries(AKUMA_TIPOS)).map(([k, nm]) => `<button class="btn sm ${tipo === k ? '' : 'wood'}" data-tp="${k}">${nm}</button>`).join('')}</div>
        ${gm ? `<div class="row"><label class="note">Entregar a: <select id="akAlvo">${jog.length ? jog.map(x => `<option value="${x.id}" ${x.id === alvo ? 'selected' : ''}>${esc(x.nome)}${x.akuma ? ' (já tem ' + esc(x.akuma.n.split(' no Mi')[0]) + ')' : ''}</option>`).join('') : '<option value="">ninguém na mesa</option>'}</select></label><button class="btn sm wood" id="akTira">Tirar a fruta dele</button></div>` : ''}
        <div class="akuma-list">${rows.map(f => { const d = donoDe(f.id); return `<div class="ord ak-row"><div style="flex:1;min-width:0"><b>${esc(f.n)}</b> <span class="tag ak-${f.t}">${AKUMA_TIPOS[f.t]}</span>${f.extra ? ' <span class="tag">do mestre</span>' : ''}<div class="note">${esc(f.p)} · <i>${esc(f.u)}</i>${d ? ' · <b>com ' + esc(d.nome) + '</b>' : ''}</div></div>${gm ? `<button class="btn sm" data-dar="${f.id}" ${alvo ? '' : 'disabled'}>Entregar</button>` : ''}</div>`; }).join('') || '<div class="note">Nenhuma fruta encontrada.</div>'}</div>
        ${gm ? `<details class="ak-nova"><summary>Acrescentar uma fruta que falta</summary><div class="row"><input type="text" id="nvN" placeholder="Nome (ex.: Hana Hana no Mi)" maxlength="50" style="flex:1"><select id="nvT">${Object.entries(AKUMA_TIPOS).map(([k, nm]) => `<option value="${k}">${nm}</option>`).join('')}</select></div><div class="row"><input type="text" id="nvU" placeholder="Usuário" maxlength="60" style="flex:1"><input type="text" id="nvP" placeholder="Poder" maxlength="120" style="flex:2"></div><div class="row"><button class="btn sm" id="nvOk">Acrescentar</button><span class="note" id="nvErr"></span></div></details>` : ''}
        <div class="actions"><button class="btn" id="akFecha">Fechar</button></div></div>`;
      ov.className = 'on'; $('akFecha').onclick = fechar;
      $('akBusca').oninput = e => { filtro = e.target.value; const pos = e.target.selectionStart; desenha(); const b = $('akBusca'); b.focus(); b.setSelectionRange(pos, pos); };
      ov.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { tipo = b.dataset.tp; desenha(); });
      if ($('akTira')) $('akTira').onclick = () => { if (alvo) { tirar(alvo); desenha(); } };
      if ($('akAlvo')) $('akAlvo').onchange = e => { alvo = e.target.value; };
      ov.querySelectorAll('[data-dar]').forEach(b => b.onclick = () => { if (!alvo) return; dar(alvo, b.dataset.dar); toast('Fruta entregue.'); desenha(); });
      if ($('nvOk')) $('nvOk').onclick = () => { const e = criar($('nvN').value, $('nvT').value, $('nvU').value, $('nvP').value); if (e) $('nvErr').textContent = e; else desenha(); };
    };
    desenha();
  }
  return { lista, dar, tirar, criar, modal, donoDe };
})();
