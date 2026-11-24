// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// Criação de ficha pelo Livro do Jogador (cap. 1.2, pp.9-13): sete passos na ordem do livro.
// 1 Espécie · 2 Estilo de Combate · 3 Profissão · 4 Atributos · 5 Personagem · 6 Equipamento · 7 Tripulação
'use strict';
const Criar = (() => {
  const PASSOS = ['Espécie', 'Estilo de combate', 'Profissão', 'Atributos', 'Personagem', 'Equipamento', 'Tripulação'];
  const PADRAO = [15, 14, 13, 12, 10, 8];
  const uniq = a => [...new Set(a.filter(Boolean))];
  const nomesPer = ks => ks.map(k => PERICIA[k].nome).join(', ');
  const sinal = n => (n >= 0 ? '+' : '') + n;
  const falhasHumanas = ['Ganância', 'Gula', 'Inveja', 'Ira', 'Luxúria', 'Preguiça', 'Orgulho'];

  function novo() {
    return { passo: 1, raca: 'humano', variante: 'comum', raca1: 'humano', raca2: 'mink', rara: '', perEsp: [], falha: 'Orgulho',
      classe: 'espadachim', prim: '', inata: '', hb1: '', perEst: [], prof: 'navegador', perProf: [],
      metodo: 'padrao', rolados: [], base: {}, ajuste: { tipo: '2', a: ['FOR', ''] },
      ant: 'marinheiro', antAttr: 'FOR', antPer: '', nome: '', faccao: 'pirata', sonho: '', realiz: 'liberdade', forma: 'companheirismo', sing: '', honra: '', aparencia: '',
      mar: 'east', ilha: 'rand', img: null, cor: 'vermelho', fonte: 'pirata', din: null };
  }
  const esp = s => ESPECIES[s.raca];
  const est = s => ESTILOS[s.classe];
  const disp = s => (s.metodo === 'padrao' ? PADRAO : s.rolados);
  // O valor final de cada atributo: o da distribuição + o ajuste da espécie + o +2 do antecedente (nunca acima de 20 por esses aumentos)
  function finais(s) {
    const d = disp(s), out = {};
    ATRIBUTOS.forEach(a => {
      let v = s.base[a.k] !== undefined && s.base[a.k] !== '' ? d[+s.base[a.k]] : null; if (v == null) { out[a.k] = null; return; }
      if (s.ajuste.tipo === '2' && s.ajuste.a[0] === a.k) v += 2;
      if (s.ajuste.tipo === '11' && (s.ajuste.a[0] === a.k || s.ajuste.a[1] === a.k)) v += 1;
      if (s.antAttr === a.k) v += 2;
      out[a.k] = Math.min(20, v);
    });
    return out;
  }
  const periciasFinal = s => uniq([...s.perEsp, ...s.perEst, ...s.perProf, s.antPer]);
  const repetidas = s => { const t = [...s.perEsp, ...s.perEst, ...s.perProf, s.antPer].filter(Boolean); return uniq(t.filter((k, i) => t.indexOf(k) !== i)); };
const hbDoEstilo = s => uniq([s.inata, s.hb1]);

  // Falta alguma coisa neste passo? (devolve o motivo, ou '' se pode avançar)
  function falta(s) {
    const e = esp(s), t = est(s), p = PROFISSOES[s.prof];
    switch (s.passo) {
      case 1:
        if (e.mestico) return s.raca1 === s.raca2 ? 'Escolha duas espécies diferentes para o mestiço.' : '';
        if (e.variantes && !s.rara && !s.variante) return 'Escolha a variante.';
        if (e.pericias && s.perEsp.length !== e.pericias.n) return 'Escolha ' + e.pericias.n + ' perícias (faltam ' + (e.pericias.n - s.perEsp.length) + ').';
        return '';
      case 2:
        if (t.prim.length > 1 && !s.prim) return 'Escolha o atributo primário.';
        if (!s.inata) return 'Escolha a Habilidade Básica inata.';
        if (!s.hb1) return 'Escolha a Habilidade Básica do 1º nível.';
        if (s.perEst.length !== t.per.n) return 'Escolha ' + t.per.n + ' perícias do estilo (faltam ' + (t.per.n - s.perEst.length) + ').';
        return '';
      case 3: return s.perProf.length !== 2 ? 'Escolha 2 perícias da profissão (faltam ' + (2 - s.perProf.length) + ').' : '';
      case 4: {
        const ix = ATRIBUTOS.map(a => s.base[a.k]); if (ix.some(v => v === undefined || v === '')) return 'Distribua os seis valores pelos atributos.';
        if (new Set(ix).size !== 6) return 'Cada valor só pode ser usado uma vez.';
        if (s.ajuste.tipo === '2' && !s.ajuste.a[0]) return 'Escolha o atributo do ajuste da espécie.';
        if (s.ajuste.tipo === '11' && (!s.ajuste.a[0] || !s.ajuste.a[1] || s.ajuste.a[0] === s.ajuste.a[1])) return 'Escolha dois atributos diferentes para o +1 e +1.';
        return '';
      }
      case 5: return !s.antPer ? 'Escolha a perícia do antecedente.' : '';
      case 6: return s.din == null ? 'Role o dinheiro inicial.' : '';
      default: return '';
    }
  }

  // ---- peças de tela ----
  const opt = (pares, cur) => pares.map(([k, n]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(n)}</option>`).join('');
  const chips = (lista, sel, cls, max) => lista.map(k => `<button class="chip ${sel.includes(k) ? 'on' : ''}" data-${cls}="${k}" ${!sel.includes(k) && sel.length >= max ? 'disabled' : ''}>${esc(PERICIA[k].nome)}</button>`).join('');

  function passo1(s) {
    const e = esp(s), un = Acc.unlocked();
    let h = `<div class="races">${Object.entries(ESPECIES).map(([k, x]) => `<button class="race ${s.raca === k ? 'on' : ''}" data-esp="${k}"><b>${x.nome}</b><small>${x.mestico ? 'duas espécies' : 'PV ' + x.pv + ' · ' + x.desloc + ' m'}</small></button>`).join('')}</div>`;
    if (e.mestico) {
      const so = Object.entries(ESPECIES).filter(([k]) => k !== 'mestico').map(([k, x]) => [k, x.nome]);
      h += `<div class="row"><div class="field" style="flex:1"><label>Primeira espécie</label><select id="crR1">${opt(so, s.raca1)}</select></div><div class="field" style="flex:1"><label>Segunda espécie</label><select id="crR2">${opt(so, s.raca2)}</select></div></div>
        <div class="estilo-desc"><b>Mestiço:</b> ${esc(e.ben)} PV base = a média das duas (${especiePV({ raca: 'mestico', raca1: s.raca1, raca2: s.raca2 })}).</div>`;
    } else {
      h += `<div class="estilo-desc"><b>Benefício:</b> ${esc(e.ben)}<br><b>Dificuldade:</b> ${esc(e.dif)}<br><small>PV base ${e.pv} · deslocamento ${e.desloc} m · nado ${e.nado} m · tamanho ${e.tam} · preconceito ${e.prec}</small></div>`;
      if (e.variantes) h += `<div class="field"><label>Variante</label><div class="races">${e.variantes.map(v => `<button class="race ${s.variante === v.k && !s.rara ? 'on' : ''}" data-var="${v.k}"><b>${v.nome}</b><small>${esc(v.t)}</small></button>`).join('')}</div></div>`;
      if (un.length) h += `<div class="field"><label>Variação Rara (da roleta)</label><div class="races">${un.map(k => `<button class="race rare ${s.rara === k ? 'on' : ''}" data-rara="${k}"><b>${VARIACOES_RARAS[k].nome}</b><small>${esc(VARIACOES_RARAS[k].t)}</small></button>`).join('')}<button class="race ${!s.rara ? 'on' : ''}" data-rara=""><b>Sem variação rara</b></button></div></div>`;
      if (e.pericias) {
        const lista = PERICIAS.map(p => p.k).filter(k => !(e.pericias.excluir || []).includes(k));
        h += `<div class="field"><label>${s.raca === 'humano' ? 'Adaptação' : 'Herança Cultural'}: escolha ${e.pericias.n} perícias <small>(${s.perEsp.length}/${e.pericias.n})</small></label><div class="chips">${chips(lista, s.perEsp, 'pe', e.pericias.n)}</div></div>`;
      }
      if (s.raca === 'humano') h += `<div class="field"><label>Aspectos Humanos: a sua falha</label><select id="crFalha">${opt(falhasHumanas.map(f => [f, f]), s.falha)}</select></div>`;
    }
    return h;
  }
  function passo2(s) {
    const t = est(s);
    let h = `<div class="races">${Object.entries(ESTILOS).map(([k, x]) => `<button class="race ${s.classe === k ? 'on' : ''}" data-est="${k}"><b>${x.nome}</b><small>d${x.dv} · ${x.prim.join(' ou ')}</small></button>`).join('')}</div>
      <div class="estilo-desc"><b>${t.nome}:</b> ${esc(t.desc)}<br><small>Dado de Vida d${t.dv} · salvaguardas ${t.salv.join(' e ')} · arma favorita: ${esc(t.arma)}</small></div>`;
    if (t.prim.length > 1) h += `<div class="field"><label>Atributo primário</label><div class="seg">${t.prim.map(k => `<button data-prim="${k}" class="${s.prim === k ? 'on' : ''}">${ATRIBUTOS.find(a => a.k === k).nome}</button>`).join('')}</div></div>`;
    h += `<div class="field"><label>Habilidade Básica inata (escolha 1)</label><div class="chips">${t.inata.map(k => `<button class="chip ${s.inata === k ? 'on' : ''}" data-inata="${k}">${esc(HABILIDADES[k].nome)}</button>`).join('')}</div></div>
      <div class="field"><label>Habilidade Básica do 1º nível (escolha 1)</label><div class="chips">${Object.entries(HABILIDADES).filter(([k]) => k !== s.inata).map(([k, x]) => `<button class="chip ${s.hb1 === k ? 'on' : ''}" data-hb1="${k}" title="${esc(x.t)}">${esc(x.nome)}</button>`).join('')}</div></div>
      <div class="note">${[s.inata, s.hb1].filter(Boolean).map(k => '<b>' + HABILIDADES[k].nome + ':</b> ' + esc(HABILIDADES[k].t)).join('<br>')}</div>
      <div class="field"><label>Perícias do estilo: escolha ${t.per.n} <small>(${s.perEst.length}/${t.per.n})</small></label><div class="chips">${chips(t.per.de || PERICIAS.map(p => p.k), s.perEst, 'ps', t.per.n)}</div></div>`;
    return h;
  }
  function passo3(s) {
    const p = PROFISSOES[s.prof], livre = !p.per, lista = livre ? PERICIAS.map(x => x.k).filter(k => !SEM_ESPECIAIS.includes(k)) : p.per;
    return `<div class="races">${Object.entries(PROFISSOES).map(([k, x]) => `<button class="race ${s.prof === k ? 'on' : ''}" data-prof="${k}"><b>${x.nome}</b></button>`).join('')}</div>
      <div class="estilo-desc"><b>${p.nome}:</b> ${esc(p.desc)}<br><small>Kit inicial: ${esc(p.kit)}</small></div>
      <div class="field"><label>Perícias: escolha 2 <small>(${s.perProf.length}/2)</small></label><div class="chips">${chips(lista, s.perProf, 'pp', 2)}</div></div>`;
  }
  function passo4(s) {
    const d = disp(s), usados = new Set(ATRIBUTOS.map(a => s.base[a.k]).filter(v => v !== undefined && v !== '').map(String)), fin = finais(s), e = esp(s);
    let h = `<div class="seg"><button data-met="padrao" class="${s.metodo === 'padrao' ? 'on' : ''}">Conjunto padrão (15, 14, 13, 12, 10, 8)</button><button data-met="rolar" class="${s.metodo === 'rolar' ? 'on' : ''}">Rolar 4d6, descartando o menor</button></div>`;
    if (disp(s).length) h += `<div class="row"><button class="btn sm wood" id="crAuto">Sugerir distribuição</button><span class="note">Põe os maiores valores no atributo primário, em Constituição e em Destreza.</span></div>`;
    if (s.metodo === 'rolar') h += `<div class="row"><button class="btn sm" id="crRolar">${s.rolados.length ? 'Rolar de novo' : 'Rolar os seis valores'}</button><span class="note">${s.rolados.length ? 'Valores: <b>' + s.rolados.join(', ') + '</b>' : 'Role para começar.'}</span></div>`;
    if (d.length) h += `<table class="atab"><tr><th>Atributo</th><th>Valor</th><th>Ajustes</th><th>Final</th><th>Mod.</th></tr>${ATRIBUTOS.map(a => {
      const cur = s.base[a.k], adj = (s.ajuste.tipo === '2' && s.ajuste.a[0] === a.k ? 2 : 0) + (s.ajuste.tipo === '11' && (s.ajuste.a[0] === a.k || s.ajuste.a[1] === a.k) ? 1 : 0), f = fin[a.k];
      return `<tr><td><b>${a.nome}</b><div class="note">${esc(a.desc)}</div></td><td><select data-b="${a.k}"><option value="">—</option>${d.map((v, i) => `<option value="${i}" ${String(cur) === String(i) ? 'selected' : ''} ${usados.has(String(i)) && String(cur) !== String(i) ? 'disabled' : ''}>${v}</option>`).join('')}</select></td><td>${adj ? '+' + adj + ' espécie' : ''}</td><td><b>${f == null ? '—' : f}</b></td><td>${f == null ? '' : sinal(modDe(f))}</td></tr>`;
    }).join('')}</table>`;
    h += `<div class="field"><label>Ajuste da espécie (${e.nome})</label><div class="seg"><button data-aj="2" class="${s.ajuste.tipo === '2' ? 'on' : ''}">+2 em um atributo</button><button data-aj="11" class="${s.ajuste.tipo === '11' ? 'on' : ''}">+1 em dois atributos</button></div>
      <div class="row"><select id="crAj1">${opt([['', '—'], ...ATRIBUTOS.map(a => [a.k, a.nome])], s.ajuste.a[0])}</select>${s.ajuste.tipo === '11' ? `<select id="crAj2">${opt([['', '—'], ...ATRIBUTOS.map(a => [a.k, a.nome])], s.ajuste.a[1])}</select>` : ''}</div></div>
      <div class="note">${TAB_MOD}. O antecedente (passo 5) soma mais +2 num atributo. Nenhum aumento passa de 20.</div>`;
    return h;
  }
  function passo5(s) {
    const a = ANTECEDENTES[s.ant];
    return `<div class="field"><label>Nome</label><input type="text" id="crNome" maxlength="24" placeholder="Nome do personagem" value="${esc(s.nome)}"></div>
      <div class="field"><label>Lado</label><div class="seg"><button data-f="pirata" class="${s.faccao === 'pirata' ? 'on pirata' : ''}">Pirata</button><button data-f="marinha" class="${s.faccao === 'marinha' ? 'on marinha' : ''}">Marinha</button></div></div>
      <div class="row"><div class="field" style="flex:1"><label>Antecedente</label><select id="crAnt">${opt(Object.entries(ANTECEDENTES).map(([k, x]) => [k, x.nome]), s.ant)}</select></div>
      <div class="field" style="flex:1"><label>+2 em qual atributo? <small>(sugestão: ${a.rec})</small></label><select id="crAntA">${opt(ATRIBUTOS.map(x => [x.k, x.nome]), s.antAttr)}</select></div></div>
      <div class="estilo-desc"><b>${a.nome}:</b> ${esc(a.car)}</div>
      <div class="field"><label>Perícia do antecedente</label><div class="chips">${a.per.map(k => `<button class="chip ${s.antPer === k ? 'on' : ''}" data-ap="${k}">${esc(PERICIA[k].nome)}</button>`).join('')}</div></div>
      <div class="field"><label>Sonho</label><input type="text" id="crSonho" maxlength="80" placeholder="Ex.: ser o Rei dos Piratas" value="${esc(s.sonho)}"></div>
      <div class="row"><div class="field" style="flex:1"><label>Caminho: realização</label><select id="crReal">${opt(Object.entries(REALIZACOES), s.realiz)}</select></div><div class="field" style="flex:1"><label>pela</label><select id="crForma">${opt(Object.entries(FORMAS), s.forma)}</select></div></div>
      <div class="field"><label>Aparência e personalidade</label><textarea id="crApar" rows="2" maxlength="300" placeholder="Idade, cabelo, olhos, marca marcante, jeito de ser…">${esc(s.aparencia)}</textarea></div>
      <div class="field"><label>Singularidades e Defeitos <small>(opcional)</small></label><textarea id="crSing" rows="2" maxlength="300" placeholder="Cada Singularidade pede um Defeito do mesmo nível (livro, cap. 5.5).">${esc(s.sing)}</textarea></div>
      <div class="field"><label>Código de Honra <small>(opcional)</small></label><input type="text" id="crHonra" maxlength="120" value="${esc(s.honra)}"></div>
      <div class="row"><div class="field" style="flex:1"><label>Mar inicial</label><select id="crMar">${opt(Object.entries(SEAS).map(([k, m]) => [k, m.nome]), s.mar)}</select></div>
      <div class="field" style="flex:1"><label>Ilha inicial</label><select id="crIlha"><option value="rand" ${s.ilha === 'rand' ? 'selected' : ''}>Aleatória</option>${islandsOf(s.mar).map(i => `<option value="${i.id}" ${s.ilha === i.id ? 'selected' : ''}>${i.nome}</option>`).join('')}</select></div></div>
      <div class="cr-pic"><img id="crImg" src="${s.img || portraitURL({ id: 'preview-' + s.faccao, faccao: s.faccao })}" alt=""><div><label class="btn wood sm" for="crFile">Subir imagem do personagem…</label><input type="file" id="crFile" accept="image/*"><div class="note" style="margin-top:4px">Vira o seu token e o seu retrato.</div></div></div>
      <div class="field"><label>Estilo no chat</label><div class="row"><select id="crCor">${Object.keys(CORES).map(n => `<option value="${n}" ${s.cor === n ? 'selected' : ''}>${n}</option>`).join('')}</select><select id="crFonte">${Object.entries(FONTES).map(([k, f]) => `<option value="${k}" ${s.fonte === k ? 'selected' : ''}>${f.nome}</option>`).join('')}</select></div></div>`;
  }
  function passo6(s) {
    const t = est(s), p = PROFISSOES[s.prof];
    return `<div class="estilo-desc"><b>Do estilo ${t.nome}:</b> ${esc(t.equip)}<br><b>Da profissão ${p.nome}:</b> ${esc(p.kit)}</div>
      <div class="field"><label>Dinheiro inicial: ${t.din}d10 × 1.000 bellys</label><div class="row"><button class="btn" id="crDin" ${s.din != null ? 'disabled' : ''}>${s.din != null ? 'Já rolado' : 'Rolar o dinheiro'}</button><span class="note">${s.din != null ? '<b>฿ ' + berry(s.din) + '</b>' : ''}</span></div></div>`;
  }
  function passo7(s) {
    const f = finais(s), t = est(s), con = modDe(f.CON), pv = hpMaxOf({ raca: s.raca, raca1: s.raca1, raca2: s.raca2, classe: s.classe, lv: 1, attrs: f, hb: hbDoEstilo(s) });
    const tmp = { raca: s.raca, classe: s.classe, prim: s.prim, lv: 1, attrs: f, hb: hbDoEstilo(s) };
    return `<div class="estilo-desc"><b>${esc(s.nome || 'Sem nome')}</b> · ${esp(s).nome}${s.variante && !esp(s).mestico ? ' (' + ((esp(s).variantes || []).find(v => v.k === s.variante) || { nome: '' }).nome + ')' : ''} · ${t.nome} · ${PROFISSOES[s.prof].nome} · ${ANTECEDENTES[s.ant].nome}<br>
      Vida <b>${pv}</b> · Pontos de Poder <b>${stMaxOf(tmp)}</b> · CR <b>${defOf(tmp)}</b> · Bônus de Proficiência <b>+${bonusProf(1)}</b> · Iniciativa <b>${sinal(modDe(f.DES))}</b> · Deslocamento <b>${esp(s).desloc} m</b></div>
      <div class="note">${ATRIBUTOS.map(a => a.k + ' ' + f[a.k] + ' (' + sinal(modDe(f[a.k])) + ')').join(' · ')}</div>
      <div class="note"><b>Perícias:</b> ${nomesPer(periciasFinal(s)) || '—'}</div>${repetidas(s) ? '<div class="note" style="color:var(--danger)">Você escolheu a mesma perícia mais de uma vez (' + nomesPer(repetidas(s)) + '). Volte e troque uma delas para ganhar mais uma proficiência.</div>' : ''}
      <h3>Tripulação</h3><div class="note">Última coisa do livro: reunir um grupo. Convide os outros jogadores pelo código da mesa e escolham juntos o navio.</div>
      <div class="row"><button class="btn wood" id="crConv">Convidar jogadores</button></div>`;
  }
  const CORPO = [null, passo1, passo2, passo3, passo4, passo5, passo6, passo7];

  function html() {
    const s = crState, f = falta(s), ultimo = s.passo === PASSOS.length;
    return `<div class="card"><h1>Criar personagem</h1><div class="tagline">Livro do Jogador · passo ${s.passo} de ${PASSOS.length}: ${PASSOS[s.passo - 1]}</div>
      <div class="passos">${PASSOS.map((n, i) => `<button class="passo ${i + 1 === s.passo ? 'on' : i + 1 < s.passo ? 'ok' : ''}" data-ir="${i + 1}" ${i + 1 > s.passo ? 'disabled' : ''}><b>${i + 1}</b> ${n}</button>`).join('')}</div>
      <div class="cr-corpo">${CORPO[s.passo](s)}</div>
      <div class="note" style="color:var(--danger);min-height:20px">${esc(f)}</div>
      <div class="actions"><button class="btn wood" id="crBack">${s.passo === 1 ? 'Cancelar' : 'Voltar'}</button>${ultimo ? '<button class="btn" id="crGo">Zarpar</button>' : `<button class="btn" id="crNext" ${f ? 'disabled' : ''}>Avançar</button>`}</div></div>`;
  }

  function bind() {
    const s = crState, q = id => $(id), redo = () => setScene('create'), on = (sel, fn) => document.querySelectorAll(sel).forEach(fn);
    on('[data-ir]', b => b.onclick = () => { s.passo = +b.dataset.ir; redo(); });
    q('crBack').onclick = () => { if (s.passo === 1) { crState = null; setScene('home'); } else { s.passo--; redo(); } };
    if (q('crNext')) q('crNext').onclick = () => { if (!falta(s)) { s.passo++; redo(); } };
    if (q('crGo')) q('crGo').onclick = submit;
    const alterna = (lista, k, max) => { const i = lista.indexOf(k); if (i >= 0) lista.splice(i, 1); else if (lista.length < max) lista.push(k); };
    if (s.passo === 1) {
      on('[data-esp]', b => b.onclick = () => { s.raca = b.dataset.esp; const e = esp(s); s.variante = e.variantes ? e.variantes[0].k : ''; s.perEsp = []; s.rara = ''; redo(); });
      on('[data-var]', b => b.onclick = () => { s.variante = b.dataset.var; s.rara = ''; redo(); });
      on('[data-rara]', b => b.onclick = () => { s.rara = b.dataset.rara; redo(); });
      on('[data-pe]', b => b.onclick = () => { alterna(s.perEsp, b.dataset.pe, esp(s).pericias.n); redo(); });
      if (q('crFalha')) q('crFalha').onchange = e => { s.falha = e.target.value; };
      if (q('crR1')) { q('crR1').onchange = e => { s.raca1 = e.target.value; redo(); }; q('crR2').onchange = e => { s.raca2 = e.target.value; redo(); }; }
    }
    if (s.passo === 2) {
      on('[data-est]', b => b.onclick = () => { s.classe = b.dataset.est; const t = est(s); s.prim = t.prim.length === 1 ? t.prim[0] : ''; s.inata = ''; s.hb1 = ''; s.perEst = []; redo(); });
      on('[data-prim]', b => b.onclick = () => { s.prim = b.dataset.prim; redo(); });
      on('[data-ps]', b => b.onclick = () => { alterna(s.perEst, b.dataset.ps, est(s).per.n); redo(); });
      on('[data-inata]', b => b.onclick = () => { s.inata = b.dataset.inata; if (s.hb1 === s.inata) s.hb1 = ''; redo(); }); on('[data-hb1]', b => b.onclick = () => { s.hb1 = b.dataset.hb1; redo(); });
      if (!s.prim && est(s).prim.length === 1) s.prim = est(s).prim[0];
    }
    if (s.passo === 3) {
      on('[data-prof]', b => b.onclick = () => { s.prof = b.dataset.prof; s.perProf = []; redo(); });
      on('[data-pp]', b => b.onclick = () => { alterna(s.perProf, b.dataset.pp, 2); redo(); });
    }
    if (s.passo === 4) {
      on('[data-met]', b => b.onclick = () => { s.metodo = b.dataset.met; s.base = {}; redo(); });
      if (q('crRolar')) q('crRolar').onclick = () => { s.rolados = Array.from({ length: 6 }, () => { const r = [roll(6), roll(6), roll(6), roll(6)].sort((a, b) => b - a); return r[0] + r[1] + r[2]; }); s.base = {}; redo(); };
      if (q('crAuto')) q('crAuto').onclick = () => { const d = disp(s).map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]), pri = s.prim || est(s).prim[0], ordem = uniq([pri, 'CON', 'DES', 'VON', 'SAB', 'PRE', 'FOR']).slice(0, 6); const resto = ATRIBUTOS.map(a => a.k).filter(k => !ordem.includes(k)); s.base = {}; ordem.concat(resto).slice(0, 6).forEach((k, i) => { s.base[k] = d[i][1]; }); redo(); };
      on('[data-b]', b => b.onchange = e => { s.base[b.dataset.b] = e.target.value; redo(); });
      on('[data-aj]', b => b.onclick = () => { s.ajuste.tipo = b.dataset.aj; redo(); });
      q('crAj1').onchange = e => { s.ajuste.a[0] = e.target.value; redo(); }; if (q('crAj2')) q('crAj2').onchange = e => { s.ajuste.a[1] = e.target.value; redo(); };
    }
    if (s.passo === 5) {
      q('crNome').oninput = e => { s.nome = e.target.value; const b = q('crNext'); if (b) b.disabled = !!falta(s); };
      q('crNome').onkeydown = e => { if (e.key === 'Enter' && !falta(s)) { s.passo++; redo(); } };
      on('[data-f]', b => b.onclick = () => { s.faccao = b.dataset.f; s.cor = s.faccao === 'marinha' ? 'azul' : 'vermelho'; redo(); });
      q('crAnt').onchange = e => { s.ant = e.target.value; s.antAttr = ANTECEDENTES[s.ant].rec; s.antPer = ''; redo(); }; q('crAntA').onchange = e => { s.antAttr = e.target.value; };
      on('[data-ap]', b => b.onclick = () => { s.antPer = b.dataset.ap; redo(); });
      q('crSonho').oninput = e => { s.sonho = e.target.value; }; q('crApar').oninput = e => { s.aparencia = e.target.value; }; q('crSing').oninput = e => { s.sing = e.target.value; }; q('crHonra').oninput = e => { s.honra = e.target.value; };
      q('crReal').onchange = e => { s.realiz = e.target.value; }; q('crForma').onchange = e => { s.forma = e.target.value; };
      q('crMar').onchange = e => { s.mar = e.target.value; s.ilha = 'rand'; redo(); }; q('crIlha').onchange = e => { s.ilha = e.target.value; };
      q('crCor').onchange = e => { s.cor = e.target.value; }; q('crFonte').onchange = e => { s.fonte = e.target.value; };
      q('crFile').onchange = e => processUpload(e.target.files[0], tune.tokenImgSize, url => { s.img = url; q('crImg').src = url; });
    }
    if (s.passo === 6) q('crDin').onclick = () => { let t = 0; for (let i = 0; i < est(s).din; i++) t += roll(10); s.din = t * 1000; redo(); };
    if (s.passo === 7 && q('crConv')) q('crConv').onclick = () => conviteModal(Mesas.atual());
  }

  function submit() {
    const s = crState; if (!s) return; for (let p = 1; p < PASSOS.length; p++) { const k = s.passo; s.passo = p; const f = falta(s); s.passo = k; if (f) { toast('Passo ' + p + ': ' + f); return; } }
    const id = uid(), island = s.ilha === 'rand' ? islandsOf(s.mar)[Math.floor(rng() * islandsOf(s.mar).length)].id : s.ilha;
    ensureShip(s.faccao, s.mar, island);
    const c = { id, acc: myAcc, v: 2, nome: s.nome.trim() || 'Marujo', faccao: s.faccao, raca: s.raca, raca1: s.raca === 'mestico' ? s.raca1 : '', raca2: s.raca === 'mestico' ? s.raca2 : '', variante: s.variante, rara: s.rara, falha: s.raca === 'humano' ? s.falha : '',
      classe: s.classe, prim: s.prim || est(s).prim[0], hb: hbDoEstilo(s), prof: s.prof, antecedente: s.ant, attrs: finais(s), pericias: periciasFinal(s),
      sonho: s.sonho.trim(), caminho: { r: s.realiz, f: s.forma }, sing: s.sing.trim(), honra: s.honra.trim(), aparencia: s.aparencia.trim(),
      equip: [est(s).equip, PROFISSOES[s.prof].kit], mar: s.mar, img: s.img, cor: s.cor, fonte: s.fonte,
      lv: 1, xp: 0, pts: 0, rep: 0, recompensa: 0, berries: s.din || 0, ataques: [], treino: null, prisao: null, missao: null };
    c.hpMax = hpMaxOf(c); c.hp = c.hpMax; c.stMax = stMaxOf(c); c.st = c.stMax;
    commit('chars', id, c); crState = null; enterPlay(id); aposCriar(c);
  }
  return { novo, html, bind, submit, falta, finais, periciasFinal };
})();
