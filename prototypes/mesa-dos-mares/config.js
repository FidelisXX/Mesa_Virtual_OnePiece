// PROTOTYPE - NOT FOR PRODUCTION
// Question: O ciclo navegar → atracar → jogar pelo chat da ilha → zarpar funciona como mesa de RPG, e o chat é gostoso de usar para interpretar?
// Date: 2026-11-16
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- Navegação (unidades do mundo 3D; 1 u ≈ 1 m) ----
  shipMaxSpeed:   { value: 22,   min: 5,   max: 80,  step: 1 },     // u/s com todas as velas e vento a favor
  shipAccel:      { value: 5,    min: 1,   max: 30,  step: 0.5 },   // u/s² para chegar à velocidade alvo
  shipTurnRate:   { value: 0.85, min: 0.2, max: 3,   step: 0.05 },  // rad/s no leme com o navio andando
  shipTurnStill:  { value: 0.35, min: 0,   max: 1,   step: 0.05 },  // fração do leme com o navio parado
  windPenalty:    { value: 0.6,  min: 0,   max: 0.95, step: 0.05 }, // fração da velocidade perdida contra o vento
  navWindReduce:  { value: 0.6,  min: 0,   max: 1,   step: 0.05 },  // quanto o Navegador corta da perda pelo vento
  navSpeedBonus:  { value: 0.15, min: 0,   max: 1,   step: 0.01 },  // bônus de velocidade com Navegador a bordo
  navTecBonus:    { value: 0.04, min: 0,   max: 0.2, step: 0.01 },  // bônus extra por ponto de TEC do Navegador
  dockRadius:     { value: 42,   min: 10,  max: 120, step: 1 },     // u: distância do centro da ilha para atracar
  seaRadius:      { value: 520,  min: 200, max: 2000, step: 10 },   // u: além disso é a Grand Line (fora do escopo)
  poseSendEvery:  { value: 0.1,  min: 0.03, max: 1,  step: 0.01 },  // s entre envios da posição ao vivo do navio
  routeSampleDist:{ value: 6,    min: 1,   max: 30,  step: 1 },     // u entre pontos da rota pontilhada
  routeMaxPoints: { value: 260,  min: 20,  max: 2000, step: 10 },   // pontos guardados da rota
  camDist:        { value: 36,   min: 12,  max: 120, step: 1 },     // u: câmera atrás do navio
  camHeight:      { value: 15,   min: 3,   max: 80,  step: 1 },     // u: altura da câmera
  waveHeight:     { value: 0.9,  min: 0,   max: 4,   step: 0.1 },   // u: amplitude das ondas
  waveSpeed:      { value: 1.1,  min: 0,   max: 4,   step: 0.1 },   // velocidade das ondas

  // ---- Ficha (d20 + atributo contra CD) ----
  attrPoints:     { value: 10,   min: 4,   max: 24,  step: 1 },     // pontos para distribuir nos 6 atributos
  attrMax:        { value: 5,    min: 2,   max: 10,  step: 1 },     // máximo por atributo na criação
  hpBase:         { value: 10,   min: 1,   max: 50,  step: 1 },     // Vida = hpBase + VIG × hpPerVig
  hpPerVig:       { value: 3,    min: 0,   max: 10,  step: 1 },
  stBase:         { value: 5,    min: 1,   max: 30,  step: 1 },     // Estamina = stBase + ESP × stPerEsp
  stPerEsp:       { value: 2,    min: 0,   max: 10,  step: 1 },
  defBase:        { value: 10,   min: 5,   max: 20,  step: 1 },     // Defesa = defBase + AGI
  cdFacil:        { value: 10,   min: 5,   max: 30,  step: 1 },
  cdMedia:        { value: 15,   min: 5,   max: 30,  step: 1 },
  cdDificil:      { value: 20,   min: 5,   max: 35,  step: 1 },
  akumaCost:      { value: 2,    min: 0,   max: 10,  step: 1 },     // Estamina gasta para usar a Akuma no Mi

  // ---- Dados ----
  maxDice:        { value: 60,   min: 1,   max: 200, step: 1 },     // dados por rolagem
  diceAnimTime:   { value: 1.3,  min: 0.2, max: 4,   step: 0.1 },   // s de animação do d20 no palco
  diceQueueGap:   { value: 0.5,  min: 0,   max: 3,   step: 0.1 },   // s entre animações na fila

  // ---- Chat ----
  groupMinutes:   { value: 3,    min: 0,   max: 30,  step: 1 },     // falas seguidas da mesma pessoa agrupadas
  msgShown:       { value: 160,  min: 20,  max: 1000, step: 10 },   // mensagens mostradas por canal
  msgCap:         { value: 600,  min: 50,  max: 5000, step: 50 },   // mensagens guardadas na mesa
  msgMaxLen:      { value: 600,  min: 50,  max: 4000, step: 50 },   // caracteres por mensagem

  // ---- Batalha naval por turnos (grade de mar; 1 quadrado ≈ 25 m) ----
  navalCols:      { value: 24,   min: 12,  max: 40,  step: 1 },     // quadrados de largura do mapa de mar
  navalRows:      { value: 12,   min: 8,   max: 26,  step: 1 },     // quadrados de altura
  navalCasco:     { value: 40,   min: 10,  max: 120, step: 1 },     // Casco (Vida) do navio dos jogadores
  navalCanhoes:   { value: 3,    min: 1,   max: 8,   step: 1 },     // canhões por bordo: dados de dano por tiro
  navalVel:       { value: 4,    min: 1,   max: 10,  step: 1 },     // pontos de movimento por turno (1 ponto = avançar 1 quadrado ou virar 45°)
  navalNavVel:    { value: 1,    min: 0,   max: 4,   step: 1 },     // pontos extras com um Navegador a bordo
  navalDef:       { value: 12,   min: 6,   max: 22,  step: 1 },     // Defesa do navio dos jogadores
  navalMoral:     { value: 12,   min: 3,   max: 40,  step: 1 },     // Moral da tripulação: cada acerto sofrido tira 1 (crítico, 2)
  navalRange:     { value: 6,    min: 2,   max: 14,  step: 1 },     // quadrados de alcance do canhão
  navalArc:       { value: 50,   min: 15,  max: 85,  step: 5 },     // graus de abertura do arco de tiro, de cada lado da perpendicular
  navalDmgDie:    { value: 6,    min: 4,   max: 12,  step: 2 },     // lados do dado de dano (um dado por canhão)
  navalRangePen:  { value: 3,    min: 1,   max: 8,   step: 1 },     // a cada tantos quadrados de distância, −1 no ataque
  navalVacantPen: { value: 2,    min: 0,   max: 6,   step: 1 },     // penalidade de quem cobre um posto que não é dele
  navalManeuver:  { value: 2,    min: 0,   max: 4,   step: 1 },     // pontos extras de movimento com a manobra do Timoneiro bem-sucedida
  navalFillerAtk: { value: 1,    min: 0,   max: 6,   step: 1 },     // bônus de um posto operado pelo Narrador
  navalFleeCD:    { value: 18,   min: 8,   max: 30,  step: 1 },     // CD para fugir pela borda do mapa
  navalNpcDelay:  { value: 1.1,  min: 0.2, max: 4,   step: 0.1 },   // s antes de o navio inimigo agir

  // ---- Ilha (battlemap 2D) ----
  cellPx:         { value: 48,   min: 24,  max: 96,  step: 4 },     // px por quadrado no zoom 1
  tokenImgSize:   { value: 128,  min: 48,  max: 256, step: 16 },    // px da imagem enviada (recorte quadrado)
  zoomMin:        { value: 0.3,  min: 0.1, max: 1,   step: 0.05 },
  zoomMax:        { value: 3,    min: 1,   max: 8,   step: 0.25 },
};
