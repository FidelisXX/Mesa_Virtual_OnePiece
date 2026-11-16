# Game Brief: Mesa dos Mares

## In your words
VTT de One Piece no East Blue, antes da Grand Line, no estilo da Mesa Virtual do guia: mapa de navegação 3D para viajar entre ilhas, cada ilha é uma mesa 2D com mapa, tokens e chat próprio (só entra no chat quem está na ilha), RPG jogado principalmente por chat com texto rico e customizável, ficha com status de One Piece, jogador escolhe ser pirata ou marinha, cada jogador sobe a imagem do personagem e cria tokens

(do /brainstorm) "Muito do rpg vai ser jogado via chat, poucas vezes por voz, então foca em deixar o chat bem amigavel para costumização de texto." · "COmbina os 3, mas tenha em mente que o jogador pode opitar ser da marinha"

1. Dados: d20 + atributo contra uma dificuldade, no estilo D&D
2. Ficha: Concordo
3. Navegação: o navio pilota livremente pelo teclado, personagens que são navegadores conseguem extrair melhor a velocidade do navio
4. Chat: Concordo
5. Visual: Mar 3D low-poly em toon, estilo Zelda: Wind Waker; nas ilhas, battlemap 2D com grade e cara de mapa pirata (pergaminho, nanquim, rosa dos ventos)

**Pitch:** Uma mesa de RPG de One Piece onde a tripulação pilota o próprio navio por um East Blue 3D e, ao atracar, entra no battlemap e no chat daquela ilha.

**Genre:** mesa virtual de RPG (VTT) + navegação 3D

**Controls:** Mar: W/S velas (velocidade), A/D leme, E atracar perto de uma ilha. Ilha: arrastar tokens com o mouse, roda = zoom, botão do meio/Espaço = mover câmera. Chat: Enter envia, `/r 1d20+3` rola.

**Question:** O ciclo navegar → atracar → jogar pelo chat da ilha → zarpar funciona como mesa de RPG, e o chat é gostoso de usar para interpretar?

**Hooks:** O chat é preso à ilha (só fala ali quem está atracado nela); o navio é pilotado de verdade e o navegador da tripulação deixa ele mais rápido; Pirata e Marinha dividem o mesmo mar.

**Intent:** no goal to reach *(guessed)* · needs 2+ players *(inferred (strong))*

## Look and references
- Look: mar 3D low-poly toon — água turquesa com espuma branca em faixas desenhadas, céu claro com nuvens chapadas, ilhas como montes verdes com casinhas; navios low-poly com vela branca e caveira (pirata) ou vela com gaivota azul (Marinha). Ilhas: battlemap 2D em pergaminho envelhecido, traço de nanquim, grade sépia, rosa dos ventos no canto. UI em madeira escura e latão. Paleta: turquesa (mar), creme (pergaminho), nanquim (traço), vermelho-pirata (destaque do jogador), azul-marinha (destaque da Marinha). Detalhe assinatura: a rota percorrida fica marcada no mar como traço pontilhado de mapa de tesouro. Every figure drawn, no emoji, no plain circles.
- References: Zelda: Wind Waker (mar toon, navegação livre); a Mesa Virtual HxH5e, MESA_VIRTUAL_GUIA.md (tokens, dados, chat, iniciativa, broadcast vs estado durável); Roll20 (chat com rolagens intercaladas).
- View: 3D no mar · 2D nas ilhas · Camera: mar = terceira pessoa atrás do navio, orbitável; ilha = de cima, pan e zoom no cursor.

## First minute
O jogador abre o lobby, escolhe Narrador ou Jogador. O Jogador cria a ficha (nome, Pirata/Marinha, estilo — ex.: Navegador —, distribui 6 atributos, sobe a imagem que vira token). Aparece no mar 3D sobre o navio da tripulação perto da Vila Foosha; uma dica "W para soltar as velas" aparece uma vez. Navega, vê a ilha crescer, aperta E ao entrar no anel de atracação. A tela vira o battlemap de pergaminho da ilha com o token dele no cais, e o chat troca para "Vila Foosha". O Narrador (outra aba) já escreveu uma narração; o jogador responde como personagem, testa negrito/cor, e rola `/r 1d20+FOR` — o dado anima no palco e o resultado cai no chat. É aqui que o gancho se paga.

## Challenge
É uma mesa: o desafio vem do Narrador. O sistema dá: testes d20 + atributo contra CD 10/15/20, vantagem/desvantagem, combate por iniciativa (d20 + AGI), Vida e Estamina nos tokens; Vida 0 = Nocauteado. No mar, a primeira "dificuldade" chega em 2–3 min: o mar aberto entre ilhas é longe, e sem Navegador a viagem é mais lenta. Perder não apaga nada: o Narrador decide as consequências. *(guessed)*

## Core loop
- Navegar: a tripulação pilota o navio pelo mar 3D até uma ilha (Navegador = mais velocidade).
- Atracar: entrar na ilha troca para o battlemap e o chat dela; quem ficou no mar não lê esse chat.
- Jogar: interpretar pelo chat (fala/narração/OOC), rolar d20 + atributo, mover tokens, combate por iniciativa.
- Zarpar: voltar ao navio e seguir para a próxima ilha.

## Goal & fail state
- Uma sessão está completa quando a tripulação visita uma ilha, joga uma cena pelo chat dela, navega até outra e vê o chat trocar.
- Falha no sistema: Vida 0 → token Nocauteado (cinza, sem ações); o Narrador pode restaurar. *(guessed)*

## Features
- [x] Ficha de personagem: Pirata ou Marinha, FOR/AGI/VIG/TEC/ESP/CAR, Vida e Estamina, estilo de luta (espadachim, atirador, lutador, navegador, cozinheiro, médico), Akuma no Mi opcional, Recompensa (pirata) ou Patente (marinha), imagem enviada vira token
- [ ] Mar 3D toon pilotável por teclado com 4 ilhas (Vila Foosha, Shells Town, Orange Town, Baratie) *(provisional)*; velocidade sobe com Navegador
- [ ] Battlemap 2D por ilha (pergaminho + grade) com tokens arrastáveis; jogador só move os seus; Narrador cria tokens de NPC e move qualquer um
- [ ] Chat preso à ilha (+ chat "a bordo"): fala com retrato, narração, OOC; negrito, itálico, cor, sussurro, grito; cor e fonte por personagem; rolagens intercaladas
- [ ] Dados: d20 + atributo vs CD, `/r` com fórmula, vantagem/desvantagem, animação no palco, botões de teste na ficha
- [ ] Iniciativa e turnos simples com Vida/Estamina no token (thin stand-in)
- [ ] Narrador e Jogadores em abas separadas, sincronizados ao vivo (stand-in do Supabase Realtime)

## Your systems
- ficha com status de One Piece · in the slice
- navegação 3D pilotada por teclado, navegador dá velocidade · in the slice
- mesa 2D por ilha com mapa e tokens · in the slice
- chat por ilha com texto rico customizável · in the slice
- dados d20 + atributo · in the slice
- upload de imagem do personagem e criação de tokens · in the slice
- pirata ou marinha · in the slice
- combate/iniciativa · thin stand-in *(guessed)*
- Haki · later

## Keep
-

## Avoid
- Voz como foco: o jogo é por chat ("poucas vezes por voz")

## Out of scope
- Online: session with friends on their own machines: needs a server, so not built; built instead: cada aba do navegador é um participante, sincronizado ao vivo nesta máquina
- Haki e a Grand Line: grow it
- Supabase, login e contas: needs a server
- Trilha sonora do YouTube, gerador procedural de mapas, bestiário: add it as a feature
- Sigilo real de rolagens secretas: needs a server

## Build order
1. A fatia: criar ficha com imagem → navegar no 3D → atracar → jogar no chat da ilha com dados e tokens → zarpar até outra ilha e ver o chat trocar. Tudo em duas abas (Narrador + Jogador).
2. Dentro da fatia, primeiro o mar 3D e o navio pilotável (a parte menos provada), depois a sincronização entre abas, o chat rico, o battlemap e a ficha.

---
**Kill condition:** se navegar entre ilhas parecer só uma tela de carregamento chata, e não parte da sessão. *(guessed)*

**Who it's for / what they feel:** grupo de amigos fãs de One Piece que jogam RPG por texto e querem sentir que são uma tripulação de verdade. *(guessed)*

**Games you love / don't:** Love Wind Waker (o mar), a Mesa Virtual HxH5e (a mesa), Roll20 (o chat). *(guessed)*
