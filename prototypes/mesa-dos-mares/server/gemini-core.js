// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// O núcleo do narrador de IA (prompt, chamada ao Gemini com troca de modelo, limpeza da resposta).
// Usado pelo servidor local (server/narrador.js) e pela função do Vercel (api/narrar.js).
// cfg: { KEY, MODEL (pode ser trocado por aqui), MOCK }
'use strict';
module.exports = function criar(cfg) {
  const TIMEOUT_MS = 22000, MAX_BODY = 40000;
  const ATTRS = ['FOR', 'AGI', 'VIG', 'TEC', 'ESP', 'CAR'], TIPOS = ['aldeao', 'bandido', 'marujo', 'oficial', 'rival', 'cozinha'];

  const SISTEMA = [
    'Você é o Mestre (narrador) de uma mesa de RPG por texto, num mundo inspirado em One Piece, nos quatro mares antes da Grand Line (East, North, West e South Blue).',
    'Escreva em português do Brasil, com voz de mestre de mesa: viva, concreta, com cheiro, som e gente.',
    'Regras do ofício:',
    '1) Leia o que cada jogador escreveu e responda ao que ele de fato disse ou fez, chamando-o pelo nome. Nunca ignore uma fala ou ação, e nunca faça o jogador dizer ou decidir algo que ele não escreveu.',
    '2) Seja curto: 1 a 3 parágrafos, no máximo cerca de 140 palavras no total. Sem listas, sem repetir o texto dos jogadores.',
    '3) Não decida o resultado de ações arriscadas: peça um teste. Havendo risco, incerteza ou oposição, peça ao jogador o atributo certo (FOR força, AGI agilidade, VIG vigor, TEC técnica, ESP espírito/percepção, CAR carisma) com dificuldade 10 (fácil), 15 (média) ou 20 (difícil). Ações simples e seguras não pedem teste. Peça no máximo um teste por jogador.',
    '4) NPCs têm voz, desejo e medo; quando falam, use aspas. Mostre a reação do mundo ao que o jogador fez.',
    '5) Use o lugar: o nome, o tema e a descrição dele são a sua cena. Não invente regras, itens mágicos nem dinheiro.',
    '6) Luta: só proponha uma se um jogador procurar briga ou a cena pedir claramente. Escolha a dificuldade pelo nível médio do grupo: fácil (inimigos 2 níveis abaixo), moderada (no nível), difícil (4 níveis acima e mais gente). Tipos permitidos: ' + TIPOS.join(', ') + '. No máximo 4 inimigos.',
    '7) Responda SOMENTE com um JSON válido, sem texto fora dele, neste formato:',
    '{"narracao": "texto", "testes": [{"jogador": "nome exato", "atributo": "FOR|AGI|VIG|TEC|ESP|CAR", "cd": 10, "motivo": "frase curta"}], "luta": null}',
    'Quando houver luta, "luta" é {"dificuldade": "facil|moderada|dificil", "inimigos": [{"tipo": "bandido", "nivel": 3}]}; senão é null. "testes" pode ser uma lista vazia.',
  ].join('\n');

  const lim = (s, n) => String(s == null ? '' : s).slice(0, n);
  function montarPedido(ctx) {
    const l = ctx.lugar || {};
    const jog = (ctx.jogadores || []).slice(0, 8).map(j => `- ${lim(j.nome, 40)}: ${lim(j.raca, 30)}, ${lim(j.classe, 20)}, ${lim(j.profissao, 20)}, ${lim(j.lado, 12)}, nível ${+j.nivel || 1}, Vida ${lim(j.vida, 12)}`).join('\n');
    const hist = (ctx.historico || []).slice(-12).map(h => `${lim(h.quem, 40)}: ${lim(h.texto, 400)}`).join('\n');
    const novas = (ctx.novas || []).slice(0, 24).map(n => `[${n.tipo === 'acao' ? 'ação' : 'fala'}] ${lim(n.quem, 40)}: ${lim(n.texto, 500)}`).join('\n');
    return `LUGAR: ${lim(l.nome, 60)} (${lim(l.mar, 20)}; tema: ${lim(l.tema, 20)}). ${lim(l.descricao, 400)}\nNÍVEL MÉDIO DO GRUPO: ${+ctx.nivelMedio || 1}\nJOGADORES NA CENA:\n${jog || '(ninguém)'}\n\nCONVERSA ANTERIOR (para contexto):\n${hist || '(começo da cena)'}\n\nO QUE OS JOGADORES ESCREVERAM DESDE A SUA ÚLTIMA FALA (responda a TODOS):\n${novas}`;
  }
  // Aceita só o que o jogo sabe usar: atributo, CD e tipos de inimigo conhecidos
  function limpar(j) {
    const out = { narracao: lim(j && j.narracao, 1800).trim(), testes: [], luta: null };
    (Array.isArray(j && j.testes) ? j.testes : []).slice(0, 8).forEach(t => {
      const a = String(t.atributo || '').toUpperCase(); if (!ATTRS.includes(a)) return;
      out.testes.push({ jogador: lim(t.jogador, 40), atributo: a, cd: Math.max(8, Math.min(25, +t.cd || 15)), motivo: lim(t.motivo, 90) });
    });
    if (j && j.luta && Array.isArray(j.luta.inimigos)) {
      const ini = j.luta.inimigos.filter(i => TIPOS.includes(i.tipo)).slice(0, 4).map(i => ({ tipo: i.tipo, nivel: Math.max(1, Math.min(100, Math.round(+i.nivel || 1))) }));
      if (ini.length) out.luta = { dificuldade: ['facil', 'moderada', 'dificil'].includes(j.luta.dificuldade) ? j.luta.dificuldade : 'moderada', inimigos: ini };
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

  async function narrar(ctx) {
    if (cfg.MOCK) { // resposta de teste, sem chave e sem custo
      const nomes = [...new Set((ctx.novas || []).map(n => n.quem))];
      return { narracao: '[teste sem IA] O mestre lê ' + nomes.join(' e ') + ' e a cena responde: o vento muda, e alguém por perto repara em vocês.', testes: nomes.slice(0, 2).map(n => ({ jogador: n, atributo: 'CAR', cd: 15, motivo: 'o clima da cena pede' })), luta: null, uso: 0 };
    }
    if (!cfg.KEY) throw new Error('GEMINI_API_KEY não configurada (crie server/.env)');
    // Narrar é uma tarefa curta: pouco "pensamento" interno deixa a resposta rápida e dentro do limite de tokens.
    // O campo muda de nome entre as famílias (2.x: thinkingBudget; 3.x: thinkingLevel); se a API recusar, repete sem ele.
    const corpoPara = (modelo, pensar) => JSON.stringify({
      systemInstruction: { parts: [{ text: SISTEMA }] },
      contents: [{ role: 'user', parts: [{ text: montarPedido(ctx) }] }],
      generationConfig: Object.assign({ responseMimeType: 'application/json', temperature: 0.9, maxOutputTokens: 1400 },
        pensar ? { thinkingConfig: /(^|-)3\./.test(modelo) ? { thinkingLevel: 'low' } : { thinkingBudget: 0 } } : {}),
    });
    // Uma tentativa com um modelo, com o seu próprio limite de tempo (a API às vezes demora quando está cheia)
    const enviar = async (modelo, pensar) => {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.KEY }, body: corpoPara(modelo, pensar) });
        return { r, data: await r.json() };
      } catch (e) { return { r: { ok: false, status: 504 }, data: { error: { message: 'tempo esgotado (' + Math.round(TIMEOUT_MS / 1000) + ' s)' } } }; }
      finally { clearTimeout(timer); }
    };
    const tentar = async modelo => {
      let x = await enviar(modelo, true);
      if (x.r.status === 400) { console.log('o modelo', modelo, 'recusou o pedido (' + lim(x.data && x.data.error && x.data.error.message, 90) + '); repetindo sem o ajuste de pensamento'); x = await enviar(modelo, false); }
      return x;
    };
    const motivo = x => lim(x.data && x.data.error && x.data.error.message, 200);
    let usado = cfg.MODEL, res = await tentar(cfg.MODEL);
    // Modelo aposentado (404), API cheia (503), limite (429) ou lenta (504): tenta o mesmo e depois os outros "flash" que a sua chave enxerga
    if (!res.r.ok && [404, 429, 503, 504].includes(res.r.status)) {
      const era404 = res.r.status === 404;
      console.log('Gemini', res.r.status, 'com', cfg.MODEL, '-', motivo(res));
      if (!era404) { await new Promise(ok => setTimeout(ok, 1500)); res = await tentar(cfg.MODEL); }
      if (!res.r.ok && [404, 429, 503, 504].includes(res.r.status)) {
        const outros = (await descobrirModelo(AbortSignal.timeout(8000))).filter(n => n !== cfg.MODEL).slice(0, 3);
        for (const n of outros) {
          console.log('tentando o modelo', n); res = await tentar(n); usado = n;
          if (res.r.ok) { if (era404) { console.log('o modelo', cfg.MODEL, 'não existe mais; passando a usar', n); cfg.MODEL = n; } break; }
        }
      }
    }
    if (!res.r.ok) throw new Error('Gemini ' + res.r.status + ': ' + motivo(res));
    const data = res.data, txt = (((data.candidates || [])[0] || {}).content || {}).parts;
    const texto = Array.isArray(txt) ? txt.map(p => p.text || '').join('') : '';
    if (!texto) throw new Error('resposta vazia' + (data.promptFeedback ? ' (bloqueada pelo filtro)' : ''));
    const out = limpar(extrairJson(texto)); out.uso = (data.usageMetadata && data.usageMetadata.totalTokenCount) || 0; out.modelo = usado;
    if (!out.narracao) throw new Error('narração vazia');
    return out;
  }
  return { narrar, descobrirModelo, MAX_BODY, TIMEOUT_MS };
};
