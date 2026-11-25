// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// O chat preso ao lugar: fala, ação, narração, OOC, sussurro, grito, rolagens; texto rico e estilo por personagem.
'use strict';

const CORES = { vermelho: '#b52a1f', azul: '#1f5fbf', verde: '#2a7d39', dourado: '#9a6f08', roxo: '#7d3c98', laranja: '#c0500a', rosa: '#b8175a', mar: '#0f7f8c', cinza: '#5d5d5d', nanquim: '#2b2118' };
// Cores de personagem: as do tema claro e versões mais vivas para o escuro
const CORES_D = { vermelho: '#ff7a70', azul: '#6ea8ff', verde: '#5fd08a', dourado: '#f0c24b', roxo: '#c08bf0', laranja: '#ff9b54', rosa: '#ff7fb0', mar: '#46d1c4', cinza: '#b4bfca', nanquim: '#e8eef4' };
const isDark = () => document.documentElement.dataset.theme !== 'light';
function mixHex(h, to, k) { // clareia uma cor hex (#rgb ou #rrggbb) para ler no tema escuro
  const p = x => { x = x.replace('#', ''); if (x.length === 3) x = x.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)); };
  const a = p(h), b = p(to); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
// a cor de um nome (ou hex) no tema atual
function tc(k) {
  if (CORES[k]) return isDark() ? CORES_D[k] : CORES[k];
  if (/^#[0-9a-fA-F]{3,6}$/.test(k || '')) return isDark() ? mixHex(k, '#ffffff', 0.5) : k;
  return isDark() ? '#e8eef4' : '#15212c';
}
const FONTES = {
  pirata:  { nome: 'Pirata (serifa)',    css: 'Georgia, "Times New Roman", serif' },
  classica:{ nome: 'Clássica',           css: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  mao:     { nome: 'À mão',              css: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' },
  maquina: { nome: 'Máquina de escrever',css: '"Courier New", Courier, monospace' },
  moderna: { nome: 'Moderna',            css: '"Trebuchet MS", "Segoe UI", sans-serif' },
};
const MODOS = [
  { k: 'fala', nome: 'Fala', dica: 'Fala do personagem, com retrato' },
  { k: 'acao', nome: 'Ação', dica: 'O que o personagem faz (/me). Falas entre "aspas" ganham destaque', mais: true },
  { k: 'narra', nome: 'Narração', dica: 'Bloco de narração (só o Narrador)', gm: true },
  { k: 'ooc', nome: 'OOC', dica: 'Fora do personagem: conversa de jogador', mais: true },
  { k: 'sussurro', nome: 'Sussurro', dica: 'Só você, o alvo e o Narrador leem' },
  { k: 'grito', nome: 'Grito', dica: 'BEM GRANDE e tremendo', mais: true },
];

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const $ = id => document.getElementById(id);

const Chat = (() => {
  let modo = 'fala', comoNpc = '', lastCh = null, lastCount = -1, gmIniciado = false;
  const lastSeen = {}; // canal → ts da última mensagem vista (contador do Narrador)

  // ---- Texto rico: escapa primeiro, depois aplica a marcação ----
  function format(txt, m) {
    let h = esc(txt);
    h = h.replace(/\{(#[0-9a-fA-F]{3,6}|[a-z]+)\|([^{}]*)\}/g, (all, c, s) => { const col = c[0] === '#' ? tc(c) : (CORES[c] ? tc(c) : null); return col ? `<span style="color:${col}">${s}</span>` : all; });
    h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>');
    h = h.replace(/__(.+?)__/g, '<u>$1</u>').replace(/~~(.+?)~~/g, '<s>$1</s>');
    h = h.replace(/\(\((.+?)\)\)/g, '<span class="ooc-in">(($1))</span>');
    if (m && m.tipo === 'acao') h = h.replace(/&quot;(.+?)&quot;/g, `<span class="aspas" style="color:${m.cor || '#2b2118'}">“$1”</span>`);
    // menções
    const nomes = Object.values(db.chars).map(c => c.nome).filter(Boolean).sort((a, b) => b.length - a.length);
    h = h.replace(/@([\wÀ-ú]+(?: [\wÀ-ú]+)?)/g, (all, n) => {
      const hit = nomes.find(x => norm(x) === norm(n) || norm(x).split(' ')[0] === norm(n).split(' ')[0]);
      if (!hit) return all; const mine = me() && norm(me().nome) === norm(hit);
      return `<span class="mention${mine ? ' me' : ''}">@${esc(hit)}</span>`;
    });
    // rolagens inline [[1d20+3]]
    if (m && m.inl) h = h.replace(/\u0001(\d+)\u0001/g, (all, i) => { const r = m.inl[+i]; return r ? `<span class="inl" title="${esc(r.formula)}: ${esc(detTxt(r.det))}">${r.total}</span>` : ''; });
    return h.replace(/\n/g, '<br>');
  }
  function detTxt(det) { return det.map(d => d.k !== undefined ? (d.k >= 0 ? '+' : '') + d.k : (d.sign < 0 ? '-' : '') + d.d + 'd' + d.s + '[' + d.r.join(',') + ']').join(' '); }

  function canSee(m) {
    if (m.tipo !== 'sussurro') return true;
    return isGM() || m.uid === myId || m.alvo === myId;
  }
  function visible(ch) { return db.msgs.filter(m => m.ch === ch && canSee(m)).slice(-tune.msgShown); }

  function portraitFor(m) {
    if (m.npc) { const t = db.tokens[m.npc]; return t ? tokenPortrait(t) : portraitURL(null); }
    return portraitURL(db.chars[m.uid] || { id: m.uid, nome: m.nome, faccao: m.fac });
  }
  const tokPortraitCache = {};
  function tokenPortrait(t) {
    if (t.img) return t.img;
    const key = t.id + ':' + kindOf(t); if (tokPortraitCache[key]) return tokPortraitCache[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; const g = cv.getContext('2d');
    g.save(); g.beginPath(); g.arc(48, 48, 48, 0, 7); g.clip(); drawBust(g, 48, 52, 44, kindOf(t), t.seed || 1); drawHat(g, 48, 52, 44, kindOf(t)); g.restore();
    return (tokPortraitCache[key] = cv.toDataURL());
  }

  function hora(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  function msgHTML(m, prev) {
    const fonte = (FONTES[m.fonte] || FONTES.pirata).css, cor = tc(m.cor);
    if (m.tipo === 'sistema') return `<div class="m sys">${format(m.txt, m)}</div>`;
    if (m.tipo === 'narra') return `<div class="m narra"><div class="narra-by">${esc(m.nome)} · ${hora(m.ts)}${m.uso ? ' · ' + m.uso + ' tokens' : ''}</div><div class="narra-txt">${format(m.txt, m)}</div>${(m.asks || []).length ? `<div class="narra-ask">Testes pedidos: ${m.asks.map(a => `<button class="btn sm" data-ask="${a.attr}" data-cd="${a.cd}" data-who="${a.who}" title="${esc(a.motivo || '')}">${esc(a.nome)}: rolar ${esc(a.rot || a.attr)} (CD ${a.cd})</button>`).join('')}</div>` : ''}${m.ask ? `<div class="narra-ask">O mestre pede um teste: <button class="btn sm" data-ask="${m.ask.attr}" data-cd="${m.ask.cd}">Rolar ${m.ask.attr} (CD ${m.ask.cd})</button></div>` : ''}</div>`;
    if (m.tipo === 'ooc') return `<div class="m ooc"><b>${esc(m.nome)}</b> (( ${format(m.txt, m)} )) <span class="hr">${hora(m.ts)}</span></div>`;
    if (m.tipo === 'acao') return `<div class="m acao" style="font-family:${fonte}"><span class="who" style="color:${cor}">${esc(m.nome)}</span> ${format(m.txt, m)}</div>`;
    if (m.tipo === 'sussurro') {
      const alvo = db.chars[m.alvo] ? db.chars[m.alvo].nome : '?';
      return `<div class="m sus" style="font-family:${fonte}"><span class="sus-tag">sussurro · ${esc(m.nome)} para ${esc(alvo)}</span>${format(m.txt, m)}</div>`;
    }
    if (m.tipo === 'tecnica') return `<div class="m acao tecnica" style="font-family:${fonte}"><span class="who">${esc(m.nome)}</span> usa <b>${esc(m.txt)}</b>${m.img ? `<img class="tec-img" src="${esc(m.img)}" alt="">` : ''}</div>`;
    if (m.tipo === 'rolagem') return rollHTML(m);
    const grouped = prev && prev.uid === m.uid && prev.npc === m.npc && (prev.tipo === 'fala' || prev.tipo === 'grito') && m.ts - prev.ts < tune.groupMinutes * 60000;
    const body = m.tipo === 'grito' ? `<div class="grito" style="color:${cor}">${format(m.txt.toUpperCase(), m)}</div>` : `<div class="fala-txt" style="font-family:${fonte}">${format(m.txt, m)}</div>`;
    if (grouped) return `<div class="m fala cont"><div class="pic-sp"></div><div class="fala-body">${body}</div></div>`;
    return `<div class="m fala"><img class="pic" src="${portraitFor(m)}" alt=""><div class="fala-body"><div class="fala-head"><span class="who" style="color:${cor};font-family:${fonte}">${esc(m.nome)}</span><span class="hr">${hora(m.ts)}</span></div>${body}</div></div>`;
  }
  function diceFaces(det) {
    return det.map(d => {
      if (d.k !== undefined) return `<span class="dk">${d.k >= 0 ? '+' : '−'}${Math.abs(d.k)}</span>`;
      const faces = d.r.map(v => `<span class="df d${d.s}${d.s === 20 && v === 20 ? ' crit' : ''}${d.s === 20 && v === 1 ? ' fumble' : ''}">${v}</span>`).join('');
      const drop = (d.x || []).map(v => `<span class="df d${d.s} drop">${v}</span>`).join('');
      return (d.sign < 0 ? '<span class="dk">−</span>' : '') + faces + drop;
    }).join('');
  }
  function rollHTML(m) {
    const r = m.roll, one20 = r.det.filter(d => d.s === 20).reduce((a, d) => a + d.r.length, 0) === 1, nat = one20 ? r.det.find(d => d.s === 20).r[0] : null;
    let res = '';
    if (r.cd) { const ok = r.total >= r.cd; res = `<div class="res ${ok ? 'ok' : 'no'}">${ok ? 'Sucesso' : 'Falha'} <small>contra CD ${r.cd}</small></div>`; }
    if (r.vs) res = `<div class="res ${r.total >= r.vs.def ? 'ok' : 'no'}">${r.total >= r.vs.def ? 'Acertou' : 'Errou'} <small>${esc(r.vs.nome)} (Defesa ${r.vs.def})</small></div>`;
    const natTxt = nat === 20 ? '<div class="nat crit">20 natural!</div>' : nat === 1 ? '<div class="nat fumble">1 natural</div>' : '';
    const modo = r.modo && r.modo !== 'normal' ? ` · ${r.modo}` : '';
    return `<div class="m roll${m.secreta ? ' secreta' : ''}"><div class="roll-head"><img class="pic sm" src="${portraitFor(m)}" alt=""><b>${esc(m.nome)}</b><span>${esc(r.label || 'Rolagem')}${modo}</span><span class="hr">${hora(m.ts)}</span></div>` +
      `<div class="roll-body"><div class="faces">${diceFaces(r.det)}</div><div class="total">${r.total}</div></div><div class="formula">${esc(r.formula)}</div>${natTxt}${res}</div>`;
  }

  function render() {
    const ch = currentView(); if (!ch) return;
    if (ch === lastCh && !dirty.msgs) return;
    dirty.msgs = false;
    const list = $('chatList'), msgs = visible(ch);
    const atBottom = list.scrollTop + list.clientHeight > list.scrollHeight - 60 || ch !== lastCh;
    let html = '', prev = null;
    msgs.forEach(m => { html += msgHTML(m, prev); prev = m; });
    if (!msgs.length) html = `<div class="m sys">Ninguém falou nada em ${esc(chanName(ch))} ainda.</div>`;
    list.innerHTML = html;
    if (atBottom) list.scrollTop = list.scrollHeight;
    lastCh = ch; lastCount = msgs.length; lastSeen[ch] = msgs.length ? msgs[msgs.length - 1].ts : 0;
    head();
  }
  // fundo de imagem do chat (só para quem escolheu, por canal)
  function applyBg(ch) {
    const l = $('chatList'); let u = null; try { u = localStorage.getItem('mdm-bg-' + ch); } catch (e) { u = null; }
    if (u) { l.style.backgroundImage = 'linear-gradient(' + (isDark() ? 'rgba(14,21,29,.84), rgba(14,21,29,.84)' : 'rgba(237,241,246,.84), rgba(237,241,246,.84)') + '), url(' + u + ')'; l.style.backgroundSize = 'cover'; l.style.backgroundPosition = 'center'; }
    else l.style.backgroundImage = '';
    const b = $('chatBgClear'); if (b) b.hidden = !u;
  }
  function setBg(file) { const ch = currentView(); processBg(file, tune.bgImgMax, url => { try { localStorage.setItem('mdm-bg-' + ch, url); } catch (e) { toast('Imagem pesada demais para guardar.'); return; } applyBg(ch); }); }
  function clearBg() { try { localStorage.removeItem('mdm-bg-' + currentView()); } catch (e) { /* tudo bem */ } applyBg(currentView()); }
  function head() {
    const ch = currentView(), here = whoIn(ch);
    $('chatPlace').textContent = chanName(ch);
    $('chatWho').innerHTML = here.map(c => `<img class="pic xs" src="${portraitURL(c)}" title="${esc(c.nome)}${c.gm ? ' (Narrador)' : ''}" alt="">`).join('') +
      `<span class="who-n">${here.length} aqui</span>`;
    const lock = $('chatLock'); lock.textContent = isIsland(ch) ? 'Só quem está nesta ilha lê este chat.' : isPrison(ch) ? 'Só quem está preso aqui lê este chat.' : 'Só a tripulação a bordo lê este chat.'; $('chatPlace').title = lock.textContent; applyBg(ch);
    // sussurro: alvos
    const sel = $('susAlvo'), cur = sel.value;
    sel.innerHTML = here.filter(c => c.id !== myId).map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('') || '<option value="">ninguém aqui</option>';
    if (cur) sel.value = cur;
    // narrador: falar como NPC
    const como = $('comoNpc'), barra = $('comoBar');
    if (isGM()) {
      if (!gmIniciado) { gmIniciado = true; setModo('narra'); }   // o Mestre começa narrando
      const toks = Island.tokensOn(ch).filter(t => t.owner === 'gm');
      como.innerHTML = '<option value="">Narrador</option>' + toks.map(t => `<option value="${t.id}">${esc(t.nome)}</option>`).join('');
      if (!toks.some(t => t.id === comoNpc)) comoNpc = '';
      como.value = comoNpc; barra.hidden = false; comoVisual();
    } else barra.hidden = true;
  }
  // Quem está falando: o retrato, o nome e o botão para voltar ao Narrador
  function comoVisual() {
    const t = comoNpc && db.tokens[comoNpc], c = me(); if (!c) return;
    $('comoImg').src = t ? tokenPortrait(t) : portraitURL(c); $('comoVolta').hidden = !t;
    $('comoBar').style.borderLeftColor = t ? ((NPC_KINDS[t.kind] || {}).cor || '#5b4636') : '';
    placeholder();
  }
  function placeholder() {
    const t = comoNpc && db.tokens[comoNpc], quem = t ? t.nome : '';
    $('chatInput').placeholder = { fala: quem ? 'Fale como ' + quem + '…' : 'Fale como seu personagem…', acao: quem ? 'Descreva o que ' + quem + ' faz…' : 'Descreva o que seu personagem faz…', narra: 'Narre a cena…', ooc: 'Conversa fora do personagem…', sussurro: 'Sussurre…', grito: 'GRITE!' }[modo];
  }
  function setComo(id) {
    comoNpc = id && db.tokens[id] ? id : '';
    if (modo === 'fala' || modo === 'narra') setModo(comoNpc ? 'fala' : 'narra');   // NPC fala; o Narrador narra
    $('comoNpc').value = comoNpc; comoVisual(); preview();
  }
  // Selecionar um NPC no mapa passa a fala para ele
  function seguir() {
    if (!isGM()) return; const t = db.tokens[Island.sel];
    if (t && t.owner === 'gm' && t.isl === currentView() && t.id !== comoNpc) setComo(t.id);
  }
  function unread(ch) { const last = lastSeen[ch] || 0; return db.msgs.filter(m => m.ch === ch && m.ts > last && m.uid !== myId).length; }

  // ---- Envio ----
  function post(row) {
    const m = Object.assign({ id: uid(), ts: Date.now(), ch: currentView(), uid: myId }, row);
    commit('msgs', m.id, m); onNew(m, false); return m;
  }
  function sysMsg(ch, txt) { commit('msgs', null, { id: uid(), ts: Date.now(), ch, uid: 'sistema', nome: '', tipo: 'sistema', txt }); }
  function speaker() {
    const c = me();
    if (c && c.gm && comoNpc && db.tokens[comoNpc]) { const t = db.tokens[comoNpc]; return { nome: t.nome, npc: t.id, cor: (NPC_KINDS[t.kind] || {}).cor || '#5b4636', fonte: 'pirata' }; }
    return { nome: c ? (c.gm ? (c.nome || 'Narrador') : c.nome) : '?', cor: c && c.cor, fonte: c && c.fonte, fac: c && c.faccao };
  }
  function postRoll(r, extra) {
    const sp = speaker();
    const m = post(Object.assign({ tipo: 'rolagem', nome: sp.nome, npc: sp.npc, fac: sp.fac, roll: r }, extra || {}));
    return m;
  }
  function send() {
    const ta = $('chatInput'); let txt = ta.value.trim(); if (!txt) return;
    if (txt.length > tune.msgMaxLen) { toast('Mensagem longa demais (máx. ' + tune.msgMaxLen + ').'); return; }
    let tipo = modo, alvo = null;
    const cmd = txt.match(/^\/(\w+)\s*(.*)$/s);
    if (cmd) {
      const c = cmd[1].toLowerCase(), rest = cmd[2];
      if (c === 'r' || c === 'roll' || c === 'rolar') { rollFormula(rest || '1d20'); ta.value = ''; preview(); return; }
      if (c === 'teste') { const [a0, cd] = rest.trim().split(/\s+/), a = a0.toUpperCase(), k = ATTRS.some(x => x.k === a) ? a : periciaKey(a0); if (k) teste(k, cd ? +cd : 0, 'normal'); else toast('Use /teste FOR 15 ou /teste atletismo 15 (FOR, DES, CON, SAB, VON, PRE ou uma perícia).'); ta.value = ''; preview(); return; }
      if (c === 'limpar' && isGM()) { clearChannel(currentView()); ta.value = ''; return; }
      const map = { me: 'acao', acao: 'acao', n: 'narra', narrar: 'narra', ooc: 'ooc', s: 'sussurro', sus: 'sussurro', g: 'grito', grito: 'grito', f: 'fala' };
      if (map[c]) { tipo = map[c]; txt = rest; }
      if (tipo === 'sussurro' && c !== undefined && (c === 's' || c === 'sus')) {
        const here = whoIn(currentView()).filter(x => x.id !== myId).sort((a, b) => b.nome.length - a.nome.length);
        const hit = here.find(x => norm(txt).startsWith(norm(x.nome))) || here.find(x => norm(txt).startsWith(norm(x.nome).split(' ')[0]));
        if (hit) { alvo = hit.id; txt = txt.slice((norm(txt).startsWith(norm(hit.nome)) ? hit.nome : hit.nome.split(' ')[0]).length).trim(); }
      }
    }
    if (tipo === 'narra' && !isGM()) tipo = 'acao';
    if (tipo === 'sussurro' && !alvo) alvo = $('susAlvo').value || null;
    if (tipo === 'sussurro' && !alvo) { toast('Ninguém aqui para ouvir o sussurro.'); return; }
    if (!txt) return;
    // rolagens inline [[...]]
    const inl = [];
    txt = txt.replace(/\[\[(.+?)\]\]/g, (all, f) => { const r = parseRolagem(f, me()); if (r.erro) return all; inl.push(r); return '\u0001' + (inl.length - 1) + '\u0001'; });
    const sp = speaker();
    post({ tipo, txt, alvo, inl: inl.length ? inl : undefined, nome: sp.nome, npc: sp.npc, cor: sp.cor, fonte: sp.fonte, fac: sp.fac });
    ta.value = ''; preview(); autosize();
    if (tipo !== 'fala' && tipo !== 'grito' && modo !== 'fala' && !cmd) { /* mantém o modo escolhido */ }
  }
  function rollFormula(f) {
    const r = parseRolagem(f, me()); if (r.erro) { toast(r.erro); return; }
    r.label = 'Rolagem'; postRoll(r);
  }
  function teste(a, cd, modoD, label) {
    const c = me(), per = PERICIA[a]; const r = rolarD20(per ? bonusDe(c, a) : attr(c, a), modoD || 'normal');
    r.label = label || ('Teste de ' + (per ? per.nome : (ATTRS.find(x => x.k === a) || { nome: a }).nome)); r.cd = cd || 0; r.modo = modoD; postRoll(r);
  }

  // ---- Quando chega mensagem (minha ou de outra aba) ----
  function onNew(m, remote) {
    if (!m || m.ch !== currentView() || !canSee(m)) return;
    if (m.tipo === 'rolagem') Dice.queue(m);
    if (!remote) return;
    const mine = me() && m.uid !== myId && norm(m.txt || '').includes('@' + norm(me().nome).split(' ')[0]);
    if (mine) { tone(988, 0.12, 'sine', 0.35); setTimeout(() => tone(1318, 0.18, 'sine', 0.35), 120); toast(m.nome + ' mencionou você.'); }
    else if (m.tipo === 'grito') tone(140, 0.3, 'sawtooth', 0.2);
    else if (m.tipo !== 'rolagem') tone(660, 0.05, 'sine', 0.12);
  }

  // ---- Barra de ferramentas ----
  function wrap(a, b) {
    const ta = $('chatInput'), s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, sel = v.slice(s, e) || 'texto';
    ta.value = v.slice(0, s) + a + sel + b + v.slice(e); ta.focus(); ta.selectionStart = s + a.length; ta.selectionEnd = s + a.length + sel.length; preview();
  }
  function setModo(k) {
    if (k === 'narra' && !isGM()) return;
    modo = k; document.querySelectorAll('#modos button[data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    if (MODOS.find(m => m.k === k && m.mais)) $('modos').classList.add('aberto');
    $('susAlvo').hidden = k !== 'sussurro';
    placeholder();
    preview();
  }
  function preview() {
    const v = $('chatInput').value, pv = $('chatPreview');
    if (!v.trim() || /^\/(r|roll|rolar|teste)\b/.test(v)) { pv.hidden = true; return; }
    const sp = speaker(); let tipo = modo, t = v;
    const cmd = v.match(/^\/(\w+)\s*(.*)$/s); if (cmd) { const map = { me: 'acao', acao: 'acao', n: 'narra', ooc: 'ooc', s: 'sussurro', g: 'grito', grito: 'grito' }; if (map[cmd[1]]) { tipo = map[cmd[1]]; t = cmd[2]; } }
    t = t.replace(/\[\[(.+?)\]\]/g, '[$1]');
    pv.hidden = false; pv.innerHTML = '<span class="pv-tag">prévia</span>' + msgHTML({ tipo, txt: t, nome: sp.nome, cor: sp.cor, fonte: sp.fonte, uid: myId, npc: sp.npc, ts: Date.now(), alvo: $('susAlvo').value }, null);
  }
  function autosize() { const ta = $('chatInput'); ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; }
  function mentionBar() {
    const ta = $('chatInput'), v = ta.value.slice(0, ta.selectionStart), m = v.match(/@([\wÀ-ú]*)$/), bar = $('mentionBar');
    if (!m) { bar.hidden = true; return; }
    const opts = whoIn(currentView()).filter(c => c.id !== myId && norm(c.nome).startsWith(norm(m[1])));
    if (!opts.length) { bar.hidden = true; return; }
    bar.hidden = false; bar.innerHTML = opts.map(c => `<button data-n="${esc(c.nome)}"><img class="pic xs" src="${portraitURL(c)}" alt="">${esc(c.nome)}</button>`).join('');
    bar.querySelectorAll('button').forEach(b => b.onclick = () => { const s = ta.selectionStart; const before = ta.value.slice(0, s).replace(/@([\wÀ-ú]*)$/, '@' + b.dataset.n + ' '); ta.value = before + ta.value.slice(s); ta.focus(); bar.hidden = true; preview(); });
  }

  function init() {
    $('chatList').addEventListener('click', e => { const b = e.target.closest('[data-ask]'); if (b && me() && !me().gm) { if (b.dataset.who && b.dataset.who !== myId) { toast('Esse teste é de outro jogador.'); return; } b.disabled = true; teste(b.dataset.ask, +b.dataset.cd, 'normal', 'Teste pedido pelo mestre'); } });
    $('modos').innerHTML = MODOS.map(m => `<button data-k="${m.k}" title="${esc(m.dica)}" class="${(m.gm ? 'gm-only ' : '') + (m.mais ? 'mais' : '')}">${m.nome}</button>`).join('') + '<button class="mais-btn gm-only" id="modosMais" title="Mais modos: Ação, OOC e Grito">⋯</button>';
    $('modos').querySelectorAll('button[data-k]').forEach(b => b.onclick = () => setModo(b.dataset.k));
    $('modosMais').onclick = () => $('modos').classList.toggle('aberto');
    const ta = $('chatInput');
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); wrap('**', '**'); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); wrap('*', '*'); }
      if (e.key === 'Escape') ta.blur();
    });
    ta.addEventListener('input', () => { preview(); autosize(); mentionBar(); });
    $('chatSend').onclick = send;
    $('comoNpc').onchange = e => setComo(e.target.value);
    $('comoVolta').onclick = () => setComo('');
    $('susAlvo').onchange = preview;
  }

  return { init, render, head, seguir, setBg, clearBg, send, sysMsg, post, postRoll, teste, rollFormula, setModo, onNew, unread, format, get modo() { return modo; }, portraitFor, tokenPortrait };
})();
const sysMsg = (ch, txt) => Chat.sysMsg(ch, txt);

// ---- O d20 caindo no palco, em fila ----
const Dice = (() => {
  const q = []; let cur = null, gap = 0;
  function queue(m) { if (q.length < 6) q.push(m); }
  function update(dt) {
    const box = document.getElementById('diceStage'); if (!box) return;
    if (cur) {
      cur.t += dt; const k = cur.t / tune.diceAnimTime;
      if (k < 1) { if ((cur.flip += dt) > 0.07) { cur.flip = 0; cur.show = (cur.show * 7 + 3) % 20 + 1; } } // só visual: não gasta o rng()
      else cur.show = cur.nat;
      box.innerHTML = `<div class="die ${k < 1 ? 'rolling' : 'landed'}${cur.nat === 20 && k >= 1 ? ' crit' : ''}${cur.nat === 1 && k >= 1 ? ' fumble' : ''}">${d20Svg(cur.show, cur.cor)}<div class="die-cap">${esc(cur.nome)}${k >= 1 ? ': <b>' + cur.total + '</b>' : ''}</div></div>`;
      if (cur.t > tune.diceAnimTime + 1.1) { cur = null; box.innerHTML = ''; gap = tune.diceQueueGap; }
      return;
    }
    if (gap > 0) { gap -= dt; return; }
    const m = q.shift(); if (!m) return;
    const d = m.roll.det.find(x => x.s === 20), c = db.chars[m.uid];
    cur = { t: 0, flip: 0, show: 1, nat: d ? d.r[0] : m.roll.total, total: m.roll.total, nome: m.nome, cor: c && c.faccao === 'marinha' ? '#2f5fa8' : (m.npc ? '#7a5a34' : '#b3261e') };
    tone(180, 0.05, 'square', 0.15); setTimeout(() => tone(240, 0.05, 'square', 0.12), 90); setTimeout(() => tone(200, 0.06, 'square', 0.1), 200);
  }
  return { queue, update };
})();
