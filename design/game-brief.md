# Game Brief: Mesa dos Mares

## In your words
VTT de One Piece no East Blue, antes da Grand Line, no estilo da Mesa Virtual do guia: mapa de navegação 3D para viajar entre ilhas, cada ilha é uma mesa 2D com mapa, tokens e chat próprio (só entra no chat quem está na ilha), RPG jogado principalmente por chat com texto rico e customizável, ficha com status de One Piece, jogador escolhe ser pirata ou marinha, cada jogador sobe a imagem do personagem e cria tokens

(do /brainstorm) "Muito do rpg vai ser jogado via chat, poucas vezes por voz, então foca em deixar o chat bem amigavel para costumização de texto." · "COmbina os 3, mas tenha em mente que o jogador pode opitar ser da marinha"

1. Dados: d20 + atributo contra uma dificuldade, no estilo D&D
2. Ficha: Concordo
3. Navegação: o navio pilota livremente pelo teclado, personagens que são navegadores conseguem extrair melhor a velocidade do navio
4. Chat: Concordo
5. Visual: Mar 3D low-poly em toon, estilo Zelda: Wind Waker; nas ilhas, battlemap 2D com grade e cara de mapa pirata (pergaminho, nanquim, rosa dos ventos)

After play: "Gostaria de ter encontros de batalha naval também, acha que é possivel isso? NE como poderiamos fazer uma batalha naval com rolagem de dados"
After play: "E se tiver a opção, de combate por turno ou real? Quero experimentar os dois" · "Faça isso agora" (a proposta aceita: ficha do navio, postos da tripulação, tiro com d20 + TEC contra a Defesa; primeiro o modo por turnos, depois o tempo real; abordagem depois)
After play: "vamos ajustar o sistema, me ajude a pensar. Será mais um sistema de narração com texto mesmo. A navegação serão duas maneiras, um barquinho navegando de forma automatica até uma ilha, e o mestre pode rolar eventos aleatorios climaticos, ou brigas navais. Na luta naval, vamos para o modelo de navegação 3D, e a luta acontece, depois volta para a navegação. Eu quero que você me ajude a dividir por partes. Faremos um sistema onde tenha várias raças do mundo de One Piece, o jogador pode escolher ser, humano, braços longos, pernas longas, pescoços longos, tritão/sereiano, gigante, tontatta e mink. Eu quero que cada raça tenha algo especial e/ou atributos diferentes, duas raças irão rolar uma roleta para poder pegar, com chances de 1% podendo rolar apenas uma vez, que são os gigantes ancestrais e lunariano. Teremos um sistema de lv 1 ao 100. A progressão de lv deve ser dificil e demorada, os lv 100 são os topo do mundo, como os yonkou e almirantes. O jogo será escrito, mas nos combates faremos uma mistura com rolagem de dados, então os atributos importam, todo jogador pode criar seu proprio ataque, e cada ataque tem seu custo de energia. Quando o jogador for criar um ataque, ele terá o dano inicial, e por custo de energia, o jogador pode comprar efeitos, como +dano, envenenado, atordoado, preso e por ai vai. As ilhas podem ser atualizadas com o gerador de ilha do mestre, de acordo com o que a mesa virtual já faz. No chat da mesa, pode se quiser, o jogador colocar uma iamgem de fundo para ambientação. O mestre pode ser alguém ou uma IA. Todo jogador pode mestrar, basta escolher a tag mestre. A IA que for mestrar, ela será consumida um token de API, para poder trazer a historia, ela deve entender o momento e trazer lutas moderadas, faceis e dificeis. Com liberdade para criar a historia da ilha e lutas. O jogador pode adicionar uma imagem ao seu token. O mundo, eu quero que tenha todas as ilhas catalogadas de One Piece, o jogador escolhe o mar inicial, podendo apenas ser nos 4 mares inicias, east blue, north blue, west blue ou soul blue. A ilha que ele começa também pode ser escolhida, ou ele vai no aleatorio. Quero uma tela de login, para salvar cada informação, então também quero um banco de dados para o sistema. O jogador poderá ser pirata ou marinheiro, e para cada grupo tem uma progressão pelos atos e missões. Pirata vai estar navegando entre ilhas e jogando, vencendo, saqueando, e lutando contra outros piratas, dependendo de seus atos, os piratas ganham pontos de reputação, a cada x pontos eles podem ganhar recompensas por suas cabeças, quando um pirata recebe recompensas, ele ganha um bonus em seus atributos, e quanto maior a recompensa maior o bonus. Quando um pirata for capturado, derrotado por um marinheiro, ele é mandado para a prisão, Ennies Loby, um pirata que é lançado lá, perde metade do valor de seu cartaz de procurado, perde xp, podento até descer de lv. Para piratas que já são muito fortes, com titulos como Pior geração ou yonkou, ser derrotado, é mandado para Impeldown, automaticamente o jogador perde 10 lvs, perfe 80% do seu cartaz de procurado. Quando for marinheiro, o jogador ganha pontos por cumprir missões da marinha em ilhas, proteger ilhas de ataques piratas, e proteger pessoas do governo como os tenryubitos. Com mais reputação o marinheiro vai subindo de patente, até se tornar um almirante, mas só podem existir 3 almirantes e 1 almirante de frota, se o cargo estiver ocupado, ele deve desafiar o almirante e vencer para ocupar o cargo. Um marinheiro que é derrotado por um pirata, perde xp, podendo perder lv e reputação. Sistema de treinamento, o jogador pode deixar o personagem afk treinando, o que gera Xp para evoluir de lv, o marinheiro tem um bonus no treino por ter o treino guiado por superiores. O jogador poderá escolher classes para o personagem, lutador, espadachim ou atirador. Também profissões como, carpinteiro, navegador, timoneiro, cozinheiro, medico. As profissões precisam ajudar o jogador na viagem e terem impactos reais. Toda ilha vai ter um comercio, e lá o jogador pode gastar o dinheiro para comprar recursos para o navio e sua viagem, reparar navio, comprar comida e coisas afins."
After play: "Irei criar uma conta no Supabase para guardar as informações" · "Mestre automatico e humano, a parte da IA pode ser uma api do gemini para consumir e jogar" · "Combinar os três" (a proposta aceita: tudo agora com peças trocáveis, conta local e mestre automático no lugar do Supabase e do Gemini; a ligação real vem depois)
After play: "Eu não achei onde criar tecnicas, o design também não me agrada muito, gostaria de algo mais atual, tema escuro ou claro." · "Eu quero que você se inspire na plataforma Fable, que é uma plataforma de narração com IA" · "Friends & Fables" (a escolha: o mestre de IA que narra e pede testes a partir do que o jogador digita; mapas de pergaminho ficam, o resto da interface vira moderno)
After play: "Essa quantidade de possibilidade textual está mal oganizada para colocar negrito e tal, ajusta isso, outra coisa. Quando escrevo no chat e respondo, o narrador não funciona, a não ser que seja pelos balões de sugestão, isso é porque ainda não está com a chave da API?" (a barra do chat fica compacta, com cor num menu, e o mestre automático passa a responder também à fala; a IA de verdade continua para depois)
After play: "Uma ideia para economizar token, o jogador pode escrever vários textos, imagina o caso de uma mesa ter mais de um jogador, e vai ter um botão que ele pode chamar o narrador, ai o narrador ler tudo que foi colocado e depois segue para a resposta" (o narrador não responde mais a cada mensagem: só quando chamado, lendo tudo de uma vez, o que também vale como uma chamada só à IA no futuro)
After play: "A resposta foi bem ruim, então vamos logo fazer a integração com a API" (o narrador passa a poder ser o Gemini, por um servidor local que guarda a chave; sem o servidor, o narrador de tabela continua como reserva)
After play: "Lembre de colocar um local onde eu possa informar a chave da api" (a chave é digitada no jogo, botão IA, e vai só para o servidor local, que a guarda na memória e no server/.env; o navegador não a guarda)
After play: "Eu quero que também tenha uma versão mobile, onde o jogador que entrar pelo celular consiga mover o token, acessar o chat, tudo de uma forma muito boa, seguindo o modelo do Friend&Fable" · "As mesas podem ter um convite para que possam jogar juntos" (a mesa vira uma sala com código e link de convite, num servidor que repassa tudo em tempo real; o celular ganha abas embaixo, chat em primeiro plano e a cena em tela cheia)
After play: "Veja esses dois sistemas de regras, eu quero implementar eles ao meu jogo. O guia do narrador deve ajudar a IA em como narrar para os jogadores. Já o livro do jogador, deve ser o caminho para que cada jogador crie sua ficha." (o jogo passa a usar o OP RPG: a ficha e a criação seguem o Livro do Jogador; o narrador de IA seguirá o Guia do Narrador; as fichas antigas ficam guardadas só para consulta)

**Pitch:** Uma carreira de One Piece jogada por texto: crie um pirata ou marinheiro de uma raça rara, navegue sozinho entre as ilhas dos quatro mares, lute com ataques que você mesmo monta e suba do nível 1 ao 100.

**Genre:** RPG de mesa por chat (VTT) com carreira e viagem

**Controls:** Celular: toque e arraste o token, pinça para o zoom, abas embaixo, botão Narrador na aba Cena; luta 3D com direcional na tela. Login e criação por cliques. Mar: clique numa ilha da carta náutica e em Viajar; o barco vai sozinho. Luta naval 3D: W/S velas, A/D leme, Q/E tiro de bombordo/boreste, R conserta. Ilha: arrastar tokens, roda = zoom, botão do meio/Espaço = mover câmera. Chat: Enter envia, `/r 1d20+3` rola.

**Question:** Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?

**Hooks:** O ataque é seu: dano inicial mais efeitos comprados com Energia. A raça muda o jogo, e duas raças só saem numa roleta de 1% que se gira uma vez. Pirata cresce em recompensa e arrisca a prisão; marinheiro sobe de patente e disputa os cargos de almirante. O mestre é um jogador com a tag mestre ou o mestre automático.

**Intent:** payoff builds *(you said: progressão difícil e demorada)* · needs 2+ players *(inferred (strong))*

## Look and references
- Look: mar 3D low-poly toon — água turquesa com espuma branca em faixas desenhadas, céu claro com nuvens chapadas; navios low-poly com vela branca e caveira (pirata) ou vela com gaivota azul (Marinha). A viagem é uma carta náutica em pergaminho com o barquinho desenhado e rota pontilhada. Ilhas: battlemap 2D em pergaminho envelhecido, traço de nanquim, grade sépia, rosa dos ventos no canto. A interface é moderna e lisa, com tema escuro e claro (botão Tema), cantos redondos e painéis de vidro sobre o mapa; só os mapas e as cartas seguem em pergaminho. Paleta: turquesa (destaque da interface e do mar), âmbar (narração), creme (pergaminho), nanquim (traço), vermelho-pirata e azul-marinha (os dois lados). Every figure drawn, no emoji, no plain circles.
- References: Zelda: Wind Waker (mar toon); a Mesa Virtual HxH5e, MESA_VIRTUAL_GUIA.md (tokens, dados, chat, iniciativa); Roll20 (chat com rolagens intercaladas).
- View: carta 2D na viagem · 3D na luta naval · 2D nas ilhas · Camera: luta 3D em terceira pessoa atrás do navio; ilha de cima, pan e zoom no cursor.

## First minute
Login ou cadastro (conta local neste navegador), depois "Novo personagem": nome, lado (Pirata/Marinha), raça (com a roleta de 1% uma vez), classe, profissão, mar inicial e ilha (escolhida ou aleatória), atributos e imagem. O personagem aparece no battlemap da ilha com o chat dela e a narração de abertura do mestre automático. Ele abre a carta náutica, escolhe outra ilha e o barquinho segue sozinho. No caminho cai um evento (clima ou navio inimigo); se for briga naval, a tela vira o mar 3D, ele atira de bombordo, vê o dado rolar no chat e vence. De volta à carta, chega à ilha nova, cria um ataque com efeito comprado com Energia e usa. Esse é o momento em que o gancho se paga.

## Challenge
Fácil, moderado ou difícil conforme o nível do grupo: o primeiro evento na viagem chega entre 30% e 70% do caminho e a primeira luta de ilha vem na primeira ou segunda chegada. Perder custa: Vida 0 deixa o token Nocauteado; pirata vencido pela Marinha vai para Enies Lobby (perde metade da recompensa e XP, e pode descer de nível) ou, se for Pior Geração ou Yonkou, para Impel Down (−10 níveis, −80% da recompensa); marinheiro vencido por pirata perde XP, reputação e talvez nível. O nível sobe devagar: o XP do nível seguinte cresce com o nível elevado a 2,2.

## Core loop
- Viajar: escolher a próxima ilha e deixar o barquinho ir; o mestre (ou o automático) sorteia clima ou briga naval no caminho.
- Atracar: o battlemap e o chat da ilha; narração, comércio, missões ou saque.
- Lutar: dados + atributos, com os ataques que o jogador criou; vencer dá XP, berries e reputação.
- Crescer: nível, recompensa (pirata) ou patente (marinha), treino AFK e reparos do navio.

## Goal & fail state
- Uma sessão está completa quando o personagem sai de uma ilha, vence um evento no mar, chega a outra ilha e usa um ataque que ele criou.
- A meta de longo prazo é o nível 100: Yonkou (pirata) ou Almirante (marinha).
- Falha: Vida 0 nocauteia; a derrota para o lado rival custa XP, reputação, recompensa ou prisão como descrito em Challenge.

## Features
- [x] Login e cadastro (conta local neste navegador) com vários personagens por conta; o Mestre entra pela tag mestre
- [x] Personagem pelo OP RPG (Livro do Jogador 2.1): criação em 7 passos (espécie, estilo de combate, profissão, atributos, personagem, equipamento, tripulação), seis atributos (FOR, DES, CON, SAB, VON, PRE), 8 espécies, 12 estilos, 20 profissões, 17 antecedentes, 19 perícias, Vida/CR/Pontos de Poder pelas fórmulas do livro, níveis 1 a 20; a roleta de 1% agora sorteia as Variações Raras
- [x] Ataques criados: dano inicial + efeitos comprados com Energia (+dano, veneno, atordoar, prender, queimar, alcance), rolagem d20 + atributo contra a Defesa
- [x] Mundo: 4 mares iniciais, ilhas catalogadas, mar e ilha inicial escolhidos ou aleatórios
- [x] Viagem automática pela carta náutica com eventos de clima (as profissões decidem), navio com Casco e comida, e luta naval em 3D (tempo real) ou por turnos
- [x] Pirata e Marinha: reputação, recompensa com bônus de atributos, Enies Lobby, Impel Down, patentes até Almirante (3 vagas + Almirante de Frota, por desafio)
- [x] Comércio em toda ilha (comida, reparo, curativo, canhões, velas), treino AFK, missões da Marinha e saque
- [x] Mestre humano (tag mestre) e mestre automático por tabela, no formato que a API do Gemini usaria depois; fundo de imagem no chat; gerador de ilha do mestre
- [x] Narração em primeiro plano, no estilo de um mestre de IA: os jogadores escrevem à vontade e o botão "Chamar o narrador" faz o mestre automático ler tudo o que a mesa escreveu de uma vez e responder a todos (um teste por jogador, com botão de rolar, e lutas armadas); ações rápidas sob o chat
- [x] O narrador de IA segue o Guia do Narrador do OP RPG (testes só com consequência, CDs 10/15/20, luta por nível e tamanho do grupo, escala por estágio)
- [x] Narrador de IA (Gemini) por um servidor local (`server/narrador.js`) que guarda a chave fora do navegador (a chave é informada no jogo, botão IA, e o servidor só aceita pedidos do jogo local); uma chamada por vez que a mesa chama o narrador, mostrando os tokens gastos; se o modelo sumir (404) ou estiver lotado (503), o servidor troca sozinho por outro que a chave enxerga, começando pelos "lite"; sem o servidor, o narrador de tabela responde
- [x] Aba Técnicas (criar, editar e usar), barra de atalhos no mapa e teclas 1 a 9; tema escuro e claro e modo Foco que dá mais espaço ao chat
- [x] Mesas com convite (código de 6 letras e link): várias pessoas, em computador ou celular, jogam juntas, com chat, fichas e tokens em tempo real pelo servidor local (`--lan`)
- [x] Mundo do narrador: ao entrar como Mestre ele começa vendo os quatro mares com todas as ilhas e quem está em cada uma; abre o mapa de uma ilha ou leva um jogador para lá
- [x] Ilhas povoadas: moradores e lojistas (mercado, estaleiro, curandeiro, taverna) em toda ilha; clicar no lojista abre o balcão e a compra sai da carteira
- [x] Mídia da mesa: catálogo de Akuma no Mi (lista parcial), imagem/GIF nas técnicas e trilha sonora compartilhada
- [x] Versão para celular: abas embaixo (Cena, Chat, Ficha, Técnicas, Mesa), chat em primeiro plano, mapa em tela cheia com pinça e arrasto, direcional de toque na luta 3D e botão flutuante do narrador

## Your systems
- conta e personagens salvos (local) · in the slice
- raças, roleta de 1% e classes · in the slice
- nível 1–100 e treino AFK · in the slice
- criador de ataques com efeitos · in the slice
- viagem automática, clima e navio (casco, comida, canhões, velas) · in the slice
- luta naval 3D em tempo real e por turnos · in the slice
- recompensa, patentes e prisões · in the slice
- comércio, missões e saque · in the slice
- mestre humano e mestre automático · in the slice
- fundo de imagem do chat e gerador de ilha · in the slice
- narrador de IA (Gemini) por servidor local · in the slice
- Supabase de verdade (login real e banco) · later
- Haki · later

## Keep
-

## Avoid
- Voz como foco: o jogo é por chat ("poucas vezes por voz")

## Out of scope
- Online pela internet (fora da sua rede Wi-Fi): needs a host; built instead: mesas com convite pela rede local (`node server/narrador.js --lan`), no computador, celular ou outra aba
- Hospedagem: preparada para o Vercel (vercel.json, api/, VERCEL.md), falta o primeiro deploy.
- Login real (Supabase Auth): as contas ainda são locais; o banco e o tempo real do Supabase já têm o código pronto (supabase/schema.sql, js/supabase.js), falta um projeto para testar. A IA Gemini entra por um servidor local opcional que guarda a chave
- Haki e a Grand Line: grow it
- Bestiário: add it as a feature
- Sigilo real de rolagens secretas: needs a server
- Abordagem (abordo) nas batalhas navais, com o convés virando mesa de ilha: add it as a feature
- Todas as ilhas de One Piece: o catálogo começa por um punhado de ilhas por mar (as inventadas ficam marcadas "original"): add it as a feature

## Build order
1. Conta, personagem (raça, classe, profissão, roleta) e o mundo dos 4 mares, com a ilha inicial.
2. Ataques criados e a luta na ilha com dados, XP e nível.
3. Viagem automática, eventos de clima e luta naval em 3D (a parte menos provada).
4. Pirata e Marinha (recompensa, patentes, prisões), comércio, treino e missões.
5. Mestre automático e as ferramentas do mestre (gerador de ilha, fundo do chat).

---
**Kill condition:** se a viagem automática e as lutas navais parecerem esperas entre cenas de chat em vez de parte da sessão. *(guessed)*

**Who it's for / what they feel:** grupo de amigos fãs de One Piece que jogam RPG por texto e querem uma carreira de verdade, do nível 1 ao topo do mundo. *(guessed)*

**Games you love / don't:** Love Wind Waker (o mar), a Mesa Virtual HxH5e (a mesa), Roll20 (o chat). *(guessed)*
