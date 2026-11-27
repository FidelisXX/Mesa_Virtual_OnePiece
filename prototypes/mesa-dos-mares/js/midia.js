// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// Mídia da mesa: a imagem/GIF de uma técnica aparece na cena quando ela é usada (Fx) e a trilha sonora da mesa (Trilha).
'use strict';

// ======================================================================================
// Fx: a imagem ou GIF da técnica, no palco de quem está na mesma cena
// ======================================================================================
const Fx = (() => {
  const okUrl = u => /^(https?:\/\/|data:image\/)/i.test(String(u || ''));
  function show(m) {
    const box = document.getElementById('fxStage'); if (!box || !okUrl(m.img)) return;
    const el = document.createElement('div'); el.className = 'fx-pop';
    const im = document.createElement('img'); im.src = m.img; im.alt = ''; im.onerror = () => el.remove();
    const cap = document.createElement('div'); cap.className = 'fx-cap'; cap.textContent = (m.quem ? m.quem + ': ' : '') + (m.nome || '');
    el.appendChild(im); el.appendChild(cap); box.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3100);
  }
  // Quem usa a técnica: mostra na própria tela, avisa quem está na cena e deixa um rastro no chat
  function cast(ch, quem, atk) {
    if (!atk || !okUrl(atk.img)) return;
    show({ img: atk.img, nome: atk.nome, quem });
    if (typeof broadcast === 'function') broadcast({ t: 'fx', ch, img: atk.img, nome: atk.nome, quem });
    const leve = !/^data:/.test(atk.img) || atk.img.length < 200000;   // imagens grandes não vão para o histórico do chat
    if (typeof Chat !== 'undefined') Chat.post({ tipo: 'tecnica', nome: quem, txt: atk.nome, img: leve ? atk.img : null, ch });
  }
  bcHandlers.fx = m => { if (m.ch === currentView()) show(m); };
  return { show, cast, okUrl };
})();

// ======================================================================================
// Trilha: a lista é da mesa (db.world.trilha); cada aparelho toca por conta própria e pode silenciar
// ======================================================================================
const Trilha = (() => {
  const LOCAL = 'mdm-musica';
  const loc = () => { try { return Object.assign({ ligada: true, vol: 60 }, JSON.parse(localStorage.getItem(LOCAL) || '{}')); } catch (e) { return { ligada: true, vol: 60 }; } };
  const salvaLoc = v => { try { localStorage.setItem(LOCAL, JSON.stringify(v)); } catch (e) { /* tudo bem */ } };
  const T = () => Object.assign({ lista: [], atual: null, tocando: false, vol: 70, soMestre: false }, (db.world && db.world.trilha) || {});
  const grava = t => { db.world.trilha = t; commit('world', null, db.world); };
  // youtube.com/watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID
  function ytId(u) {
    const m = String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/i); return m ? m[1] : null;
  }
  function add(nome, url) {
    url = String(url || '').trim(); const yt = ytId(url);
    if (!yt && !/^https?:\/\/\S+\.(mp3|ogg|wav|m4a|aac|opus|webm)(\?\S*)?$/i.test(url)) return 'Use um link do YouTube ou um link direto de áudio (.mp3, .ogg, .wav, .m4a…).';
    const t = T(); if (t.lista.length >= 60) return 'A lista já tem 60 faixas.';
    const c = me(); const f = { id: uid(), nome: String(nome || '').trim().slice(0, 50) || (yt ? 'Faixa do YouTube' : decodeURIComponent(url.split('/').pop().split('?')[0]).slice(0, 50)), tipo: yt ? 'yt' : 'url', src: yt || url, por: c ? c.nome : '' };
    t.lista = t.lista.concat([f]); grava(t); return null;
  }
  const podeMexer = () => { const t = T(), c = me(); return !t.soMestre || !!(c && c.gm); };
  function tocar(id) { if (!podeMexer()) { toast('Só o mestre controla a trilha desta mesa.'); return; } const t = T(); t.atual = id; t.tocando = true; grava(t); }
  function pausar() { if (!podeMexer()) { toast('Só o mestre controla a trilha desta mesa.'); return; } const t = T(); t.tocando = false; grava(t); }
  function tirar(id) {
    const t = T(), f = t.lista.find(x => x.id === id), c = me(); if (!f || !c) return;
    if (!c.gm && f.por !== c.nome) { toast('Só quem pôs a faixa (ou o mestre) pode tirá-la.'); return; }
    t.lista = t.lista.filter(x => x.id !== id); if (t.atual === id) { t.atual = null; t.tocando = false; } grava(t);
  }
  function volume(v) { const t = T(); t.vol = Math.max(0, Math.min(100, Math.round(v))); grava(t); }
  function soMestre(on) { const t = T(); t.soMestre = !!on; grava(t); }

  // ---- Tocar de verdade neste aparelho ----
  let audio = null, frame = null, tocandoSig = '', travado = false, meu = null;
  const volFinal = () => (T().vol / 100) * (loc().vol / 100);
  function parar() {
    if (audio) { audio.pause(); audio.src = ''; audio = null; }
    if (frame) { frame.remove(); frame = null; }
    travado = false;
  }
  function ytVol() { if (frame && frame.contentWindow) frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.round(volFinal() * 100)] }), '*'); }
  function iniciar(f) {
    parar();
    if (f.tipo === 'url') {
      audio = new Audio(f.src); audio.loop = true; audio.volume = volFinal();
      audio.play().catch(() => { travado = true; });   // o navegador só deixa tocar depois de um clique: tenta de novo no próximo
    } else {
      const box = document.getElementById('trilhaBox'); if (!box) return;
      frame = document.createElement('iframe'); frame.allow = 'autoplay'; frame.setAttribute('aria-hidden', 'true');
      frame.src = 'https://www.youtube.com/embed/' + f.src + '?autoplay=1&loop=1&playlist=' + f.src + '&controls=0&enablejsapi=1';
      frame.onload = () => { setTimeout(ytVol, 600); setTimeout(ytVol, 2000); }; box.appendChild(frame);
    }
  }
  // Chamado a cada quadro: só age quando algo mudou
  function sync() {
    if (typeof db === 'undefined' || !db || !db.world) return;
    const t = T(), l = loc(), f = t.lista.find(x => x.id === t.atual);
    if (meu) return;   // tocando um arquivo só meu: a trilha da mesa espera
    const sig = [l.ligada && t.tocando && f ? f.id : '', l.ligada, t.vol, l.vol].join('|');
    if (sig === tocandoSig) return; const antes = tocandoSig.split('|'); tocandoSig = sig;
    if (!(l.ligada && t.tocando && f)) { parar(); return; }
    if (antes[0] !== f.id) iniciar(f); else { if (audio) audio.volume = volFinal(); ytVol(); }
  }
  addEventListener('pointerdown', () => { if (travado && audio) { audio.play().then(() => { travado = false; }).catch(() => {}); } }, true);
  // Um arquivo do seu computador: só você ouve
  function meuArquivo(file) {
    if (!file || !/^audio\//.test(file.type)) { toast('Escolha um arquivo de áudio.'); return; }
    parar(); tocandoSig = ''; meu = { nome: file.name }; audio = new Audio(URL.createObjectURL(file)); audio.loop = true; audio.volume = loc().vol / 100; audio.play().catch(() => { travado = true; });
  }
  function pararMeu() { meu = null; parar(); tocandoSig = ''; }
  // O que a pílula do topo mostra: o nome do que toca, "sem música" ou "ativar som" (desligada aqui ou o navegador bloqueou o áudio)
  function estado() {
    const t = T(), l = loc(), f = t.lista.find(x => x.id === t.atual);
    if (meu) return { txt: meu.nome, ouvindo: !travado, acao: travado ? 'ativar' : 'abrir' };
    if (!t.tocando || !f) return { txt: 'sem música', ouvindo: false, acao: 'abrir' };
    if (!l.ligada || travado) return { txt: 'ativar som', ouvindo: false, acao: 'ativar', faixa: f.nome };
    return { txt: f.nome, ouvindo: true, acao: 'abrir' };
  }
  function ativar() {
    const v = loc();
    if (!v.ligada) { v.ligada = true; salvaLoc(v); sync(); return; }
    if (travado && audio) audio.play().then(() => { travado = false; }).catch(() => {});
  }

  // ---- A janela da trilha ----
  function modal() {
    const ov = $('overlay'), fechar = () => { ov.className = ''; ov.innerHTML = ''; };
    const desenha = () => {
      const t = T(), l = loc(), c = me(), gm = !!(c && c.gm);
      ov.innerHTML = `<div class="card akuma-card"><h1 style="font-size:28px">Trilha sonora</h1>
        <div class="tagline">Qualquer pessoa da mesa pode pôr faixas${t.soMestre ? ' · hoje só o mestre controla o play' : ''}</div>
        <div class="row"><label><input type="checkbox" id="trOn" ${l.ligada ? 'checked' : ''}> Ouvir a trilha neste aparelho</label></div>
        <div class="row"><label class="note" style="flex:1">Meu volume <input type="range" id="trVolMeu" min="0" max="100" value="${l.vol}" style="width:100%"></label>${t.tocando ? '<button class="btn sm wood" id="trPausa">Pausar para todos</button>' : ''}</div>
        <div class="row"><label class="note" style="flex:1">Volume da mesa <input type="range" id="trVol" min="0" max="100" value="${t.vol}" style="width:100%"></label>${gm ? `<label class="note"><input type="checkbox" id="trSoM" ${t.soMestre ? 'checked' : ''}> Só o mestre controla</label>` : ''}</div>
        <div class="akuma-list">${t.lista.map(f => `<div class="ord ak-row"><div style="flex:1;min-width:0"><b>${esc(f.nome)}</b> ${t.atual === f.id && t.tocando ? '<span class="tag">tocando</span>' : ''}<div class="note">${f.tipo === 'yt' ? 'YouTube' : 'Áudio'}${f.por ? ' · por ' + esc(f.por) : ''}</div></div><button class="btn sm" data-tocar="${f.id}">${t.atual === f.id && t.tocando ? 'Tocando' : 'Tocar'}</button><button class="btn sm wood" data-tirar="${f.id}" title="Tirar da lista">✕</button></div>`).join('') || '<div class="note">Nenhuma faixa ainda. Cole um link abaixo.</div>'}</div>
        <div class="row"><input type="text" id="trUrl" placeholder="Link do YouTube ou de um arquivo de áudio (.mp3…)" style="flex:1;min-width:180px"></div>
        <div class="row"><input type="text" id="trNome" placeholder="Nome da faixa (opcional)" maxlength="50" style="flex:1"><button class="btn sm" id="trAdd">Adicionar à mesa</button></div>
        <div class="note" id="trErr" style="color:var(--danger)"></div>
        <div class="row"><label class="btn wood sm" for="trFile">Tocar um arquivo meu…</label><input type="file" id="trFile" accept="audio/*" hidden>${meu ? `<span class="note">Só você ouve: ${esc(meu.nome)}</span><button class="btn sm wood" id="trMeuFim">Parar</button>` : ''}</div>
        <div class="actions"><button class="btn" id="trFecha">Fechar</button></div></div>`;
      ov.className = 'on'; $('trFecha').onclick = fechar;
      $('trOn').onchange = e => { const v = loc(); v.ligada = e.target.checked; salvaLoc(v); if (!v.ligada) pararMeu(); sync(); };
      $('trVolMeu').oninput = e => { const v = loc(); v.vol = +e.target.value; salvaLoc(v); if (audio) audio.volume = meu ? v.vol / 100 : volFinal(); ytVol(); };
      $('trVol').onchange = e => volume(+e.target.value);
      if ($('trSoM')) $('trSoM').onchange = e => { soMestre(e.target.checked); desenha(); };
      if ($('trPausa')) $('trPausa').onclick = () => { pausar(); desenha(); };
      ov.querySelectorAll('[data-tocar]').forEach(b => b.onclick = () => { if (meu) pararMeu(); tocar(b.dataset.tocar); desenha(); });
      ov.querySelectorAll('[data-tirar]').forEach(b => b.onclick = () => { tirar(b.dataset.tirar); desenha(); });
      $('trAdd').onclick = () => { const e = add($('trNome').value, $('trUrl').value); if (e) $('trErr').textContent = e; else desenha(); };
      $('trFile').onchange = e => { meuArquivo(e.target.files[0]); desenha(); };
      if ($('trMeuFim')) $('trMeuFim').onclick = () => { pararMeu(); desenha(); };
    };
    desenha();
  }
  return { add, tocar, pausar, tirar, volume, soMestre, ytId, sync, modal, estado, ativar, T };
})();
