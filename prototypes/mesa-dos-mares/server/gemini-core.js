// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// O núcleo do narrador de IA (prompt, chamada ao Gemini com troca de modelo, limpeza da resposta).
// Usado pelo servidor local (server/narrador.js) e pela função do Vercel (api/narrar.js).
// cfg: { KEY, MODEL (pode ser trocado por aqui), MOCK }
'use strict';
module.exports = function criar(cfg) {
  const TIMEOUT_MS = 22000, MAX_BODY = 40000;
  const ATTRS = ['FOR', 'DES', 'CON', 'SAB', 'VON', 'PRE'], ANTIGO = { AGI: 'DES', VIG: 'CON', TEC: 'DES', ESP: 'VON', CAR: 'PRE' }, TIPOS = ['aldeao', 'bandido', 'marujo', 'oficial', 'rival', 'cozinha'];
  const PERICIAS = ['atletismo', 'acrobacia', 'furtividade', 'prestidigitacao', 'historia', 'investigacao', 'medicina', 'natureza', 'sobrevivencia', 'haki', 'intuicao', 'percepcao', 'sobrenatural', 'sorte', 'atuacao', 'enganacao', 'intimidacao', 'persuasao', 'provocacao'];
  const DIFICULDADES = ['facil', 'media', 'dificil', 'mortal'];

  // Escrito a partir do Guia do Narrador 2.0 do OP RPG (capítulos 1 a 3), em palavras nossas
  const SISTEMA = [
    'Você é o Narrador de uma mesa de OP RPG, um RPG de mesa de One Piece com dado de 20 lados, nos quatro mares antes da Grand Line (East, North, West e South Blue).',
    'Escreva em português do Brasil, com voz de mestre de mesa: viva, concreta, com cheiro, som e gente.',
    'O seu papel é ser contador de histórias (ajudar todos a enxergar a cena), ator (dar vida aos PdNs) e árbitro (aplicar as regras a favor da diversão). As regras servem à história, e não o contrário. O objetivo nunca é massacrar os jogadores: é montar um mundo que reage às escolhas deles.',
    'Como narrar:',
    '1) Responda ao que cada jogador fez ou disse, chamando-o pelo nome. Nunca ignore ninguém e nunca fale, sinta ou decida pelo personagem de um jogador.',
    '2) Seja curto: 1 a 3 parágrafos, no máximo cerca de 140 palavras. Sem listas e sem repetir o que os jogadores escreveram. Mostre em vez de explicar: faça os PdNs agirem, com voz, desejo e medo, e use aspas nas falas deles. Termine deixando uma porta aberta (um gancho, uma pergunta, uma escolha) sem decidir pelo grupo.',
    '3) Consistência é a chave: o mesmo lugar, os mesmos PdNs, as mesmas consequências. Use o lugar da cena (nome, tema, descrição) e o histórico. Não invente itens mágicos, Akuma no Mi nem dinheiro: isso é decisão do mestre humano. Recompense criatividade e bons planos.',
    '4) Quando pedir um teste: só se falhar tiver consequência significativa. Se a tarefa é fácil e segura, ou impossível, não peça teste: narre direto. Peça no máximo um teste por jogador. Ao pedir um teste, narre só a tentativa (o instante antes do resultado) e NÃO diga se deu certo nem errado: quem decide é o dado, e o resultado vem depois. Atributos: FOR (força), DES (agilidade, mira), CON (vigor), SAB (raciocínio, memória), VON (percepção, determinação, Haki), PRE (carisma). Se couber, indique também a perícia (campo "pericia"): ' + PERICIAS.join(', ') + '.',
    '5) Dificuldade (CD) do teste: 10 fácil, 15 moderada, 20 difícil (use quase só essas três); 25 muito difícil só para grupos de nível 10 ou mais; tarefa de CD 5 não precisa de teste. Plano criativo ou ambiente favorável baixa a CD; plano ruim a sobe.',
    '6) Ao falar com um PdN, ele tem uma atitude (amigável, indiferente ou hostil) que muda no máximo um passo por conversa. Convencer, enganar ou intimidar pedem teste de PRE (perícias persuasao, enganacao, intimidacao). Pedir de novo o que já falhou é infrutífero ou arrisca deixar o PdN hostil.',
    '7) Luta: só proponha uma se um jogador procurar briga ou a cena pedir claramente. Escolha a dificuldade pelo nível médio e pelo tamanho do grupo: "facil" (inimigos bem abaixo do nível, quase sem risco), "media" (um inimigo de nível igual ao do grupo, ou um bando um pouco abaixo; um ou dois sustos), "dificil" (acima do nível ou bando grande; pode haver baixas), "mortal" (só se os jogadores forçarem, e a cena deve avisar o perigo). Nos níveis 1 a 4 evite oficiais da Marinha e qualquer inimigo de nível maior que o do grupo. Um encontro casual jamais deve exterminar o grupo: ofereça fugir, se esconder ou negociar, e deixe os inimigos fugirem ou se renderem quando perdem metade da vida. Tipos permitidos: ' + TIPOS.join(', ') + '. No máximo 4 inimigos, de nível 1 a 20.',
    '8) A escala da história segue o estágio do grupo: Piratas Desconhecidos (níveis 1 a 4: o destino de uma vila, com bandidos, lobos e soldados de baixa patente), Piratas Infames (5 a 10: uma região), Donos dos Mares (11 a 16: uma nação) e Ameaças Mundiais (17 a 20). Não traga ameaças de um estágio muito acima.',
    '9) Conheça quem joga: quem interpreta ganha PdNs para conversar; quem explora ganha pistas e detalhes do lugar; quem provoca ganha consequências; quem luta ganha ação e um relato vivo do estrago. Equilibre os tipos na mesma cena.',
    '10) Responda SOMENTE com um JSON válido, sem texto fora dele, neste formato:',
    '{"narracao": "texto", "testes": [{"jogador": "nome exato", "atributo": "FOR|DES|CON|SAB|VON|PRE", "pericia": "uma perícia da lista ou vazio", "cd": 10, "motivo": "frase curta"}], "luta": null}',
    'Quando houver luta, "luta" é {"dificuldade": "facil|media|dificil|mortal", "inimigos": [{"tipo": "bandido", "nivel": 3}]}; senão é null. "testes" pode ser uma lista vazia.',
  ].join('\n');

  const lim = (s, n) => String(s == null ? '' : s).slice(0, n);
  function montarPedido(ctx) {
    const l = ctx.lugar || {};
    const jog = (ctx.jogadores || []).slice(0, 8).map(j => `- ${lim(j.nome, 40)}: ${lim(j.raca, 30)}, ${lim(j.classe, 20)}, ${lim(j.profissao, 20)}, ${lim(j.lado, 12)}, nível ${+j.nivel || 1}, CR ${+j.cr || '?'}, Vida ${lim(j.vida, 12)}`).join('\n');
    const hist = (ctx.historico || []).slice(-12).map(h => `${lim(h.quem, 40)}: ${lim(h.texto, 400)}`).join('\n');
    const novas = (ctx.novas || []).slice(0, 24).map(n => `[${n.tipo === 'acao' ? 'ação' : 'fala'}] ${lim(n.quem, 40)}: ${lim(n.texto, 500)}`).join('\n');
    return `LUGAR: ${lim(l.nome, 60)} (${lim(l.mar, 20)}; tema: ${lim(l.tema, 20)}). ${lim(l.descricao, 400)}\nNÍVEL MÉDIO DO GRUPO: ${+ctx.nivelMedio || 1} (${+ctx.tamanho || (ctx.jogadores || []).length || 1} jogador(es); estágio: ${lim(ctx.estagio, 30) || 'Piratas Desconhecidos'})\nJOGADORES NA CENA:\n${jog || '(ninguém)'}\n\nCONVERSA ANTERIOR (para contexto):\n${hist || '(começo da cena)'}\n\nO QUE OS JOGADORES ESCREVERAM DESDE A SUA ÚLTIMA FALA (responda a TODOS):\n${novas}`;
  }
  // Aceita só o que o jogo sabe usar: atributo, CD e tipos de inimigo conhecidos
  function limpar(j) {
    const out = { narracao: lim(j && j.narracao, 1800).trim(), testes: [], luta: null };
    (Array.isArray(j && j.testes) ? j.testes : []).slice(0, 8).forEach(t => {
      let a = String(t.atributo || '').toUpperCase(); a = ANTIGO[a] || a;
      const per = String(t.pericia || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
      if (!ATTRS.includes(a) && !PERICIAS.includes(per)) return;
      out.testes.push({ jogador: lim(t.jogador, 40), atributo: ATTRS.includes(a) ? a : '', pericia: PERICIAS.includes(per) ? per : '', cd: Math.max(5, Math.min(30, Math.round(+t.cd || 15))), motivo: lim(t.motivo, 90) });
    });
    if (j && j.luta && Array.isArray(j.luta.inimigos)) {
      const ini = j.luta.inimigos.filter(i => TIPOS.includes(i.tipo)).slice(0, 4).map(i => ({ tipo: i.tipo, nivel: Math.max(1, Math.min(20, Math.round(+i.nivel || 1))) }));
      const d = j.luta.dificuldade === 'moderada' ? 'media' : j.luta.dificuldade;
      if (ini.length) out.luta = { dificuldade: DIFICULDADES.includes(d) ? d : 'media', inimigos: ini };
    }
    return out;
  }
  function extrairJson(txt) {
    try { return JSON.parse(txt); } catch (e) { /* tenta achar o objeto no meio do texto */ }
    const a = txt.indexOf('{'), b = txt.lastIndexOf('}'); if (a >= 0 && b > a) return JSON.parse(txt.slice(a, b + 1));
    throw new Error('a IA não devolveu JSON');
  }

  // Lista os modelos da chave e escolhe o "flash" de texto mais novo (sem lite, imagem, voz, tempo real ou experimental)
  async function descobrirModelo(signal) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { signal, headers: { 'x-goog-api-key': cfg.KEY } });
      const j = await r.json(); if (!r.ok) return null;
      const ok = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => String(m.name || '').replace(/^models\//, ''))
        .filter(n => /flash/i.test(n) && !/(image|tts|live|audio|embed|exp|robotics|computer|learn|omni)/i.test(n));
      const ver = n => (n.match(/(\d+(?:\.\d+)?)/) || [0, 0])[1] * 1;
      // estável antes de prévia; os "lite" primeiro (têm capacidade própria e respondem mesmo quando os flash estão lotados); depois a versão mais alta
      ok.sort((a, b) => (/preview/i.test(a) - /preview/i.test(b)) || (/lite/i.test(b) - /lite/i.test(a)) || ver(b) - ver(a));
      return ok;
    } catch (e) { return []; }
  }

  // Uma chamada ao Gemini que devolve JSON, com a troca de modelo quando ele some, lota ou demora
  const semPensar = new Set(), mortos = new Set();   // modelos que recusam o ajuste de pensamento: nas próximas chamadas já vai sem ele
  async function chamar(sistema, pedido, maxTok, temp) {
    if (!cfg.KEY) throw new Error('GEMINI_API_KEY não configurada (crie server/.env)');
    // Tarefa curta: pouco "pensamento" interno deixa a resposta rápida e dentro do limite de tokens.
    // O campo muda de nome entre as famílias (2.x: thinkingBudget; 3.x: thinkingLevel); se a API recusar, repete sem ele.
    const corpoPara = (modelo, pensar) => JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [{ role: 'user', parts: [{ text: pedido }] }],
      generationConfig: Object.assign({ responseMimeType: 'application/json', temperature: temp == null ? 0.9 : temp, maxOutputTokens: maxTok || 1400 },
        pensar ? { thinkingConfig: /(^|-)3\./.test(modelo) ? { thinkingLevel: 'low' } : { thinkingBudget: 0 } } : {}),
    });
    // Uma tentativa com um modelo, com o seu próprio limite de tempo (a API às vezes demora quando está cheia)
    const t0 = Date.now(), PRAZO = cfg.PRAZO || 80000, sobra = () => PRAZO - (Date.now() - t0);   // o prazo total da chamada (o jogo espera 90 s; no Vercel, menos)
    const enviar = async (modelo, pensar) => {
      const ms = Math.max(4000, Math.min(TIMEOUT_MS, sobra())), ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.KEY }, body: corpoPara(modelo, pensar) });
        return { r, data: await r.json() };
      } catch (e) { return { r: { ok: false, status: 504 }, data: { error: { message: 'tempo esgotado (' + Math.round(ms / 1000) + ' s)' } } }; }
      finally { clearTimeout(timer); }
    };
    const tentar = async modelo => {
      let x = await enviar(modelo, !semPensar.has(modelo));
      if (x.r.status === 400 && !semPensar.has(modelo)) { semPensar.add(modelo); console.log('o modelo', modelo, 'recusou o pedido (' + lim(x.data && x.data.error && x.data.error.message, 90) + '); repetindo sem o ajuste de pensamento'); x = await enviar(modelo, false); }
      if (!x.r.ok) console.log('  falhou com', modelo, '->', x.r.status, lim(x.data && x.data.error && x.data.error.message, 160));
      return x;
    };
    const motivo = x => lim(x.data && x.data.error && x.data.error.message, 200);
    // Tenta o modelo configurado e, se ele falhar (lotado, lento ou aposentado), os outros que a chave enxerga, até acabar o prazo.
    // Cada modelo ganha uma segunda chance quando o erro é de lotação; modelos que respondem 404 são lembrados e pulados.
    let usado = cfg.MODEL, res = null; const falhas = [], fila = [cfg.MODEL];
    for (let i = 0; i < fila.length && i < 8; i++) {
      const modelo = fila[i]; if (i > 0 && mortos.has(modelo)) continue;
      usado = modelo; res = await tentar(modelo);
      if (!res.r.ok && [429, 503, 504].includes(res.r.status) && sobra() > 9000) { await new Promise(ok => setTimeout(ok, 1500)); res = await tentar(modelo); }
      if (res.r.ok) { if (i > 0 && mortos.has(cfg.MODEL)) { console.log('o modelo', cfg.MODEL, 'não existe para esta chave; passando a usar', modelo); cfg.MODEL = modelo; } break; }
      if (res.r.status === 404) mortos.add(modelo);
      falhas.push({ modelo, status: res.r.status, msg: motivo(res) });
      if (sobra() < 5000) break;
      if (i === 0 && fila.length === 1) { const outros = (await descobrirModelo(AbortSignal.timeout(6000))) || []; ['gemini-flash-latest', 'gemini-flash-lite-latest'].concat(outros).forEach(m => { if (!fila.includes(m)) fila.push(m); }); }
    }
    if (!res.r.ok) {
      const lotado = falhas.filter(f => [429, 503, 504].includes(f.status)), pior = lotado[0] || falhas[falhas.length - 1] || { status: res.r.status, msg: motivo(res) };
      throw new Error(lotado.length ? 'A API do Gemini está lotada agora (erro ' + pior.status + ' em ' + falhas.length + ' modelo(s)). Tente de novo em instantes.' : 'Gemini ' + pior.status + ': ' + pior.msg);
    }
    const data = res.data, txt = (((data.candidates || [])[0] || {}).content || {}).parts;
    const texto = Array.isArray(txt) ? txt.map(p => p.text || '').join('') : '';
    if (!texto) throw new Error('resposta vazia' + (data.promptFeedback ? ' (bloqueada pelo filtro)' : ''));
    return { json: extrairJson(texto), uso: (data.usageMetadata && data.usageMetadata.totalTokenCount) || 0, modelo: usado };
  }

  async function narrar(ctx) {
    if (cfg.MOCK) { // resposta de teste, sem chave e sem custo
      const nomes = [...new Set((ctx.novas || []).map(n => n.quem))];
      return { narracao: '[teste sem IA] O mestre lê ' + nomes.join(' e ') + ' e a cena responde: o vento muda, e alguém por perto repara em vocês.', testes: nomes.slice(0, 2).map(n => ({ jogador: n, atributo: 'PRE', pericia: 'persuasao', cd: 15, motivo: 'o clima da cena pede' })), luta: null, uso: 0 };
    }
    const x = await chamar(SISTEMA, montarPedido(ctx), 1400, 0.9);
    const out = limpar(x.json); out.uso = x.uso; out.modelo = x.modelo;
    if (!out.narracao) throw new Error('narração vazia');
    return out;
  }

  // ---- Abertura de cena: o narrador de IA apresenta a ilha e entrega uma missão aleatória ao jogador ----
  const SISTEMA_ABERTURA = [
    'Você é o Narrador de uma mesa de OP RPG (RPG de mesa de One Piece, d20), nos quatro mares antes da Grand Line. Escreva em português do Brasil, com voz de mestre de mesa.',
    'Um jogador acaba de chegar a uma ilha e você vai ABRIR a cena. Faça duas coisas:',
    '1) Uma introdução curta (1 a 2 parágrafos, até 120 palavras): mostre o lugar com cheiro, som e gente, apresente um PdN com voz e deixe uma porta aberta. Use o lugar informado (nome, tema, descrição) e não decida nada pelo personagem do jogador.',
    '2) UMA missão aleatória e original, adequada ao lugar, ao nível e ao estágio do grupo (nível 1 a 4: o destino de uma vila, ameaças pequenas; evite oficiais da Marinha). Tipos possíveis: investigar, escoltar, resgatar, entregar, caçar, infiltrar, recuperar um objeto, fazer a paz. A missão precisa de um objetivo concreto, um PdN que a dê, e três resultados possíveis (sucesso, parcial, fracasso) com consequências. Não conceda Akuma no Mi nem dinheiro.',
    'Responda SOMENTE com um JSON válido neste formato:',
    '{"introducao": "texto", "missao": {"titulo": "até 6 palavras", "descricao": "1 a 2 frases", "objetivo": "uma frase concreta", "tipo": "investigar|escoltar|resgatar|entregar|cacar|infiltrar|recuperar|paz", "dificuldade": "facil|media|dificil"}}',
  ].join('\n');
  async function abertura(ctx) {
    ctx = ctx || {};
    if (cfg.MOCK) return { introducao: '[teste sem IA] ' + lim(ctx.lugar && ctx.lugar.nome, 60) + ' acorda devagar. Um morador acena para você.', missao: { titulo: 'Recado urgente', descricao: 'Um morador precisa entregar um recado antes do anoitecer.', objetivo: 'Entregar o recado ao faroleiro.', tipo: 'entregar', dificuldade: 'facil' }, uso: 0 };
    const x = await chamar(SISTEMA_ABERTURA, montarPedido(Object.assign({}, ctx, { novas: [] })) + '\n\nABRA A CENA para o jogador que acabou de chegar' + (ctx.jogadores && ctx.jogadores[0] ? ': ' + lim(ctx.jogadores[0].nome, 40) : '') + '.', 900, 1);
    const j = x.json || {}, m = j.missao || {};
    const out = { introducao: lim(j.introducao, 1400).trim(), missao: { titulo: lim(m.titulo, 60).trim(), descricao: lim(m.descricao, 300).trim(), objetivo: lim(m.objetivo, 200).trim(), tipo: lim(m.tipo, 20), dificuldade: ['facil', 'media', 'dificil'].includes(m.dificuldade) ? m.dificuldade : 'facil' }, uso: x.uso, modelo: x.modelo };
    if (!out.introducao || !out.missao.titulo || !out.missao.objetivo) throw new Error('a abertura veio incompleta');
    return out;
  }

  // ---- Gerador de ficha de NPC: o mestre descreve, a IA escolhe tipo, perfil, nome e uma nota; os números vêm do nível, no jogo ----
  const PERFIS = ['equilibrado', 'tanque', 'brutamontes', 'agil', 'atirador', 'fraco', 'chefe'];
  const SISTEMA_FICHA = [
    'Você ajuda o Mestre de uma mesa de RPG de One Piece (quatro mares iniciais) a criar um NPC a partir de uma descrição curta.',
    'Escolha: um nome (se a descrição não der um, invente um que combine), o "tipo" mais próximo entre ' + TIPOS.join(', ') + ',',
    'e o "perfil" de combate entre ' + PERFIS.join(', ') + ' (tanque = aguenta muito, brutamontes = bate forte, agil = esquiva, atirador = ataca de longe, fraco = frágil, chefe = muito acima dos comuns).',
    'Escreva uma "nota" de uma frase com a aparência e o jeito do NPC, em português do Brasil.',
    'Responda SOMENTE com JSON: {"nome": "...", "tipo": "...", "perfil": "...", "nota": "..."}',
  ].join('\n');
  async function gerarFicha(body) {
    const descricao = lim(body && body.descricao, 400).trim(), nivel = Math.max(1, Math.min(999, Math.round(+(body && body.nivel) || 1)));
    if (!descricao) throw new Error('descreva o personagem');
    if (cfg.MOCK) return { nome: 'NPC de teste', tipo: 'bandido', perfil: 'equilibrado', nota: '[teste sem IA] ' + descricao.slice(0, 80), uso: 0 };
    const x = await chamar(SISTEMA_FICHA, 'NÍVEL: ' + nivel + '\nDESCRIÇÃO: ' + descricao, 400, 0.8), j = x.json || {};
    return { nome: lim(j.nome, 24).trim(), tipo: TIPOS.includes(j.tipo) ? j.tipo : 'bandido', perfil: PERFIS.includes(j.perfil) ? j.perfil : 'equilibrado', nota: lim(j.nota, 200).trim(), uso: x.uso, modelo: x.modelo };
  }
  return { narrar, gerarFicha, abertura, descobrirModelo, MAX_BODY, TIMEOUT_MS };
};
