// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-23
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- Personagem ----
  attrPoints:     { value: 12,   min: 4,   max: 30,  step: 1 },     // pontos para distribuir nos 6 atributos na criação
  attrMax:        { value: 6,    min: 2,   max: 12,  step: 1 },     // máximo por atributo na criação
  hpBase:         { value: 12,   min: 1,   max: 60,  step: 1 },     // Vida = hpBase + VIG × hpPerVig + nível × hpPerLv (+ classe) × raça
  hpPerVig:       { value: 3,    min: 0,   max: 10,  step: 1 },
  hpPerLv:        { value: 4,    min: 0,   max: 12,  step: 1 },
  stBase:         { value: 4,    min: 1,   max: 30,  step: 1 },     // Energia = stBase + ESP × stPerEsp + nível/2
  stPerEsp:       { value: 1,    min: 0,   max: 6,   step: 1 },
  stRegen:        { value: 1,    min: 0,   max: 6,   step: 1 },     // Energia que volta no começo de cada turno de luta
  defBase:        { value: 10,   min: 5,   max: 20,  step: 1 },     // Defesa = defBase + AGI + nível/10
  cdFacil:        { value: 10,   min: 5,   max: 30,  step: 1 },
  cdMedia:        { value: 15,   min: 5,   max: 30,  step: 1 },
  cdDificil:      { value: 20,   min: 5,   max: 35,  step: 1 },
  berriesStart:   { value: 0, min: 0, max: 500000, step: 1000 },   // Berries ao criar o personagem
  // ---- Mercado Negro: preço de cada Akuma no Mi, em Berries, pela categoria da fruta ----
  akumaPrecoC:    { value: 1000000000, min: 1000000, max: 10000000000, step: 100000000 },   // C: a mais barata, 1 bilhão
  akumaPrecoB:    { value: 2000000000, min: 1000000, max: 10000000000, step: 100000000 },
  akumaPrecoA:    { value: 3500000000, min: 1000000, max: 10000000000, step: 100000000 },
  akumaPrecoS:    { value: 5000000000, min: 1000000, max: 10000000000, step: 100000000 },   // S: a mais cara, 5 bilhões

  // ---- Nível 1 a 100: o XP do próximo nível é xpBase × nível ^ xpExp ----
  xpBase:         { value: 40,   min: 5,   max: 400, step: 5 },
  xpExp:          { value: 2.2,  min: 1.2, max: 3.2, step: 0.1 },
  maxLv:          { value: 20,   min: 5,   max: 20,  step: 1 },     // o livro vai do nível 1 ao 20
  xpMul:          { value: 6,    min: 1,   max: 50,  step: 1 },     // multiplica as recompensas de XP do jogo (até a luta passar a dar XP por nível de desafio)
  ptsEvery:       { value: 3,    min: 1,   max: 10,  step: 1 },     // um ponto de atributo a cada tantos níveis
  xpPerNpcLv:     { value: 8,    min: 1,   max: 100, step: 1 },     // XP por nível de um NPC vencido, ajustado pela diferença de nível
  berriesPerNpcLv:{ value: 3000,   min: 0,   max: 30000, step: 500 },
  repPerKill:     { value: 3,    min: 0,   max: 30,  step: 1 },     // reputação por NPC vencido (por nível/4 +)
  roletaChance:   { value: 0.01, min: 0.001, max: 0.5, step: 0.001 }, // chance de cada raça rara na roleta (uma vez por conta)

  // ---- Ataques criados (Energia) ----
  atkBase:        { value: 1,    min: 0,   max: 5,   step: 1 },     // custo de Energia de qualquer ataque
  atkCapBase:     { value: 3,    min: 1,   max: 10,  step: 1 },     // custo máximo de um ataque = atkCapBase + nível ÷ atkCapLv
  atkCapLv:       { value: 8,    min: 1,   max: 30,  step: 1 },
  atkMax:         { value: 6,    min: 1,   max: 12,  step: 1 },     // ataques que se pode guardar
  fxDano:         { value: 2,    min: 1,   max: 8,   step: 1 },     // custo do +dano (1d6 a mais, até 3 vezes)
  fxVeneno:       { value: 3,    min: 1,   max: 8,   step: 1 },
  fxAtordoar:     { value: 4,    min: 1,   max: 8,   step: 1 },
  fxPrender:      { value: 3,    min: 1,   max: 8,   step: 1 },
  fxQueimar:      { value: 3,    min: 1,   max: 8,   step: 1 },
  fxAlcance:      { value: 2,    min: 1,   max: 8,   step: 1 },     // +2 quadrados de alcance, até 2 vezes
  statusDie:      { value: 4,    min: 2,   max: 12,  step: 2 },     // dado de dano por turno de veneno e queimadura (queimadura usa +2 lados)
  poisonTurns:    { value: 3,    min: 1,   max: 8,   step: 1 },
  burnTurns:      { value: 2,    min: 1,   max: 8,   step: 1 },
  rootTurns:      { value: 2,    min: 1,   max: 6,   step: 1 },

  // ---- Pirata: reputação → recompensa → bônus. Marinha: reputação → patente → bônus ----
  repFirstBounty: { value: 50,   min: 5,   max: 500, step: 5 },     // reputação para o primeiro cartaz de procurado
  bountyBase:     { value: 3000000, min: 100000, max: 50000000, step: 100000 },
  bountyExp:      { value: 1.7,  min: 1,   max: 3,   step: 0.1 },
  bountyCap:      { value: 5000000000, min: 100000000, max: 20000000000, step: 100000000 },
  bountyAttrTier: { value: 0.5,  min: 0,   max: 2,   step: 0.1 },  // bônus em todos os atributos = degraus de recompensa × isto
  bountyWorst:    { value: 300000000, min: 10000000, max: 5000000000, step: 10000000 },   // a partir daqui: Pior Geração (vai para Impel Down)
  bountyYonkou:   { value: 2000000000, min: 100000000, max: 10000000000, step: 100000000 }, // a partir daqui: Yonkou
  rankRepMul:     { value: 0.2,  min: 0.02, max: 3,  step: 0.02 },  // multiplica a reputação de cada patente (a tabela está em db.js)
  rankAttrPer:    { value: 0.4,  min: 0,   max: 1.5, step: 0.1 },   // bônus em todos os atributos por patente
  saqueRep:       { value: 6,    min: 0,   max: 40,  step: 1 },
  saqueBerries:   { value: 12000,  min: 0,   max: 200000, step: 1000 },   // por nível da ilha-base de dificuldade (nível do jogador)
  missaoRep:      { value: 14,   min: 0,   max: 80,  step: 1 },
  missaoBerries:  { value: 20000,  min: 0,   max: 300000, step: 1000 },
  enieSec:        { value: 120,  min: 10,  max: 3600, step: 10 },   // segundos de pena em Enies Lobby
  impelSec:       { value: 420,  min: 10,  max: 7200, step: 10 },   // segundos de pena em Impel Down
  enieBounty:     { value: 0.5,  min: 0,   max: 1,   step: 0.05 },  // fração da recompensa perdida em Enies Lobby
  impelBounty:    { value: 0.8,  min: 0,   max: 1,   step: 0.05 },
  impelLv:        { value: 10,   min: 0,   max: 50,  step: 1 },     // níveis perdidos em Impel Down
  enieXp:         { value: 0.7,  min: 0,   max: 3,   step: 0.05 },  // XP perdido (× o XP do nível atual); pode descer de nível
  navyLoseXp:     { value: 0.4,  min: 0,   max: 3,   step: 0.05 },  // marinheiro vencido por pirata
  navyLoseRep:    { value: 0.1,  min: 0,   max: 1,   step: 0.05 },
  medicoLossMul:  { value: 0.5,  min: 0,   max: 1,   step: 0.05 },  // o Médico a bordo reduz as perdas de XP

  // ---- Treino AFK ----
  trainXpHour:    { value: 60,   min: 1,   max: 2000, step: 5 },    // XP por hora no nível 1
  trainLvExp:     { value: 1.0,  min: 0,   max: 2.2, step: 0.1 },   // o treino cresce com nível ^ isto
  trainCapH:      { value: 8,    min: 1,   max: 48,  step: 1 },     // horas acumuladas no máximo
  navyTrainMul:   { value: 1.5,  min: 1,   max: 4,   step: 0.1 },   // bônus do treino guiado da Marinha
  trainSpeed:     { value: 1,    min: 1,   max: 3600, step: 1 },    // multiplica o relógio do treino (para testar sem esperar)

  // ---- Viagem automática ----
  chartSecPerUnit:{ value: 70,   min: 10,  max: 600, step: 5 },     // segundos para cruzar a carta inteira de ponta a ponta
  navegadorMul:   { value: 0.75, min: 0.3, max: 1,   step: 0.05 },  // tempo de viagem com Navegador a bordo
  velaMul:        { value: 0.1,  min: 0,   max: 0.4, step: 0.02 },  // cada nível de velas encurta a viagem em tanto
  foodPerUnit:    { value: 6,    min: 1,   max: 20,  step: 1 },     // comida por unidade da carta (com mínimo de 1)
  foodStart:      { value: 14,   min: 0,   max: 60,  step: 1 },
  shipCasco:      { value: 40,   min: 10,  max: 150, step: 1 },
  eventChance:    { value: 0.9,  min: 0,   max: 1,   step: 0.05 },  // chance de a viagem ter um evento
  eventNaval:     { value: 0.35, min: 0,   max: 1,   step: 0.05 },  // dos eventos, quantos são luta naval
  eventAtMin:     { value: 0.3,  min: 0.05, max: 0.9, step: 0.05 }, // o evento chega entre estes pontos do caminho
  eventAtMax:     { value: 0.7,  min: 0.1, max: 0.95, step: 0.05 },
  climaCD:        { value: 14,   min: 6,   max: 28,  step: 1 },     // CD base do teste de clima (sobe com a gravidade)
  climaDano:      { value: 6,    min: 1,   max: 20,  step: 1 },     // dado de dano no casco numa falha de clima
  autoEncounter:  { value: 0.6,  min: 0,   max: 1,   step: 0.05 },  // chance do mestre automático armar uma luta ao chegar na ilha

  // ---- Comércio ----
  priceFood:      { value: 800,    min: 100,   max: 10000, step: 100 },     // por unidade de comida
  priceRepair:    { value: 600,    min: 100,   max: 10000, step: 100 },     // por ponto de casco
  priceHeal:      { value: 4000,   min: 100,   max: 50000, step: 500 },     // curativo: recupera metade da Vida
  priceCannon:    { value: 60000,  min: 5000,  max: 500000, step: 5000 },
  priceSails:     { value: 80000,  min: 5000,  max: 500000, step: 5000 },
  carpDiscount:   { value: 0.5,  min: 0,   max: 1,   step: 0.05 },  // desconto do Carpinteiro no reparo
  cannonMax:      { value: 6,    min: 1,   max: 12,  step: 1 },
  sailsMax:       { value: 4,    min: 1,   max: 8,   step: 1 },

  // ---- Dados ----
  maxDice:        { value: 60,   min: 1,   max: 200, step: 1 },     // dados por rolagem
  diceAnimTime:   { value: 1.3,  min: 0.2, max: 4,   step: 0.1 },   // s de animação do d20 no palco
  diceQueueGap:   { value: 0.5,  min: 0,   max: 3,   step: 0.1 },   // s entre animações na fila

  // ---- Chat ----
  groupMinutes:   { value: 3,    min: 0,   max: 30,  step: 1 },     // falas seguidas da mesma pessoa agrupadas
  msgShown:       { value: 160,  min: 20,  max: 1000, step: 10 },   // mensagens mostradas por canal
  msgCap:         { value: 700,  min: 50,  max: 5000, step: 50 },   // mensagens guardadas na mesa
  msgMaxLen:      { value: 600,  min: 50,  max: 4000, step: 50 },   // caracteres por mensagem

  // ---- Luta naval em 3D (tempo real) ----
  rtSpeed:        { value: 26,   min: 8,   max: 80,  step: 1 },     // u/s do navio com todas as velas
  rtAccel:        { value: 9,    min: 2,   max: 30,  step: 1 },     // u/s² para chegar à velocidade alvo
  rtTurn:         { value: 0.8,  min: 0.2, max: 2.5, step: 0.05 },  // rad/s no leme com o navio andando
  rtTimoneiro:    { value: 0.2,  min: 0,   max: 1,   step: 0.05 },  // bônus de giro e aceleração com Timoneiro a bordo
  rtCooldown:     { value: 4.5,  min: 1,   max: 15,  step: 0.5 },   // s de recarga de cada bordo
  rtRange:        { value: 95,   min: 30,  max: 250, step: 5 },     // alcance do canhão em unidades do mundo
  rtArc:          { value: 55,   min: 15,  max: 85,  step: 5 },     // graus de abertura do arco de tiro, de cada lado da perpendicular
  rtRangePen:     { value: 30,   min: 10,  max: 120, step: 5 },     // a cada tantas unidades de distância, −1 no ataque
  rtEnemySpeed:   { value: 0.8,  min: 0.3, max: 1.4, step: 0.05 },  // velocidade dos navios inimigos, em relação à dos jogadores
  rtNpcCooldown:  { value: 6,    min: 2,   max: 20,  step: 0.5 },   // s de recarga dos inimigos
  rtRepair:       { value: 12,   min: 3,   max: 40,  step: 1 },     // s de recarga do conserto do Carpinteiro
  navalDmgDie:    { value: 6,    min: 4,   max: 12,  step: 2 },     // lados do dado de dano (um dado por canhão)
  navalCanhoes:   { value: 3,    min: 1,   max: 8,   step: 1 },     // canhões por bordo no navio dos jogadores
  navalDef:       { value: 12,   min: 6,   max: 22,  step: 1 },     // Defesa base do navio dos jogadores (+ Timoneiro)
  navalMoral:     { value: 12,   min: 3,   max: 40,  step: 1 },     // Moral: cada acerto sofrido tira 1 (crítico, 2)
  navalFillerAtk: { value: 1,    min: 0,   max: 6,   step: 1 },     // bônus de tiro de um navio sem artilheiro

  // ---- Batalha naval por turnos (grade de mar; 1 quadrado ≈ 25 m) ----
  navalCols:      { value: 24,   min: 12,  max: 40,  step: 1 },     // quadrados de largura do mapa de mar
  navalRows:      { value: 12,   min: 8,   max: 26,  step: 1 },     // quadrados de altura
  navalVel:       { value: 4,    min: 1,   max: 10,  step: 1 },     // pontos de movimento por turno (1 ponto = avançar 1 quadrado ou virar 45°)
  navalNavVel:    { value: 1,    min: 0,   max: 4,   step: 1 },     // pontos extras com um Navegador a bordo
  navalRange:     { value: 6,    min: 2,   max: 14,  step: 1 },     // quadrados de alcance do canhão
  navalArc:       { value: 50,   min: 15,  max: 85,  step: 5 },     // graus de abertura do arco de tiro, de cada lado da perpendicular
  navalRangePen:  { value: 3,    min: 1,   max: 8,   step: 1 },     // a cada tantos quadrados de distância, −1 no ataque
  navalVacantPen: { value: 2,    min: 0,   max: 6,   step: 1 },     // penalidade de quem cobre um posto que não é dele
  navalManeuver:  { value: 2,    min: 0,   max: 4,   step: 1 },     // pontos extras de movimento com a manobra do Timoneiro bem-sucedida
  navalFleeCD:    { value: 18,   min: 8,   max: 30,  step: 1 },     // CD para fugir pela borda do mapa
  navalNpcDelay:  { value: 1.1,  min: 0.2, max: 4,   step: 0.1 },   // s antes de o navio inimigo agir

  // ---- Ilha (battlemap 2D) ----
  cellPx:         { value: 48,   min: 24,  max: 96,  step: 4 },     // px por quadrado no zoom 1
  tokenImgSize:   { value: 128,  min: 48,  max: 256, step: 16 },    // px da imagem enviada (recorte quadrado)
  zoomMin:        { value: 0.3,  min: 0.1, max: 1,   step: 0.05 },
  zoomMax:        { value: 3,    min: 1,   max: 8,   step: 0.25 },
  bgImgMax:       { value: 1400, min: 400, max: 2400, step: 100 },  // lado máximo (px) da imagem de fundo do chat
};
