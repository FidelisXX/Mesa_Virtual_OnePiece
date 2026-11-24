// PROTOTYPE - NOT FOR PRODUCTION
// Question: Uma carreira com raça, nível 1–100, ataques criados e viagem automática continua sendo um jogo de chat gostoso, e a luta naval 3D no meio da viagem vale a pausa na narração?
// Date: 2026-11-24
// OP RPG (Livro do Jogador 2.1): atributos, perícias, espécies, estilos de combate, profissões, antecedentes e as contas da ficha.
// Os números vêm do livro (páginas entre parênteses); o texto das regras está resumido com palavras nossas.
'use strict';

// ---- Atributos e perícias (cap. 9, p.257) ----
const ATRIBUTOS = [
  { k: 'FOR', nome: 'Força', desc: 'Poder físico: ataque e dano corpo a corpo, carga.' },
  { k: 'DES', nome: 'Destreza', desc: 'Agilidade: ataque à distância, Classe de Resistência (CR), iniciativa.' },
  { k: 'CON', nome: 'Constituição', desc: 'Resistência: Pontos de Vida.' },
  { k: 'SAB', nome: 'Sabedoria', desc: 'Raciocínio e memória.' },
  { k: 'VON', nome: 'Vontade', desc: 'Determinação, percepção e Haki.' },
  { k: 'PRE', nome: 'Presença', desc: 'Carisma e trato com os outros.' },
];
const PERICIAS = [
  { k: 'atletismo', nome: 'Atletismo', a: 'FOR' },
  { k: 'acrobacia', nome: 'Acrobacia', a: 'DES' }, { k: 'furtividade', nome: 'Furtividade', a: 'DES' }, { k: 'prestidigitacao', nome: 'Prestidigitação', a: 'DES' },
  { k: 'historia', nome: 'História', a: 'SAB' }, { k: 'investigacao', nome: 'Investigação', a: 'SAB' }, { k: 'medicina', nome: 'Medicina', a: 'SAB' }, { k: 'natureza', nome: 'Natureza', a: 'SAB' }, { k: 'sobrevivencia', nome: 'Sobrevivência', a: 'SAB' },
  { k: 'haki', nome: 'Haki', a: 'VON' }, { k: 'intuicao', nome: 'Intuição', a: 'VON' }, { k: 'percepcao', nome: 'Percepção', a: 'VON' }, { k: 'sobrenatural', nome: 'Sobrenatural', a: 'VON' }, { k: 'sorte', nome: 'Sorte', a: 'VON' },
  { k: 'atuacao', nome: 'Atuação', a: 'PRE' }, { k: 'enganacao', nome: 'Enganação', a: 'PRE' }, { k: 'intimidacao', nome: 'Intimidação', a: 'PRE' }, { k: 'persuasao', nome: 'Persuasão', a: 'PRE' }, { k: 'provocacao', nome: 'Provocação', a: 'PRE' },
];
const PERICIA = Object.fromEntries(PERICIAS.map(p => [p.k, p]));
const periciaKey = nome => { const n = String(nome).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, ''); return PERICIAS.find(p => p.k === n) ? n : null; };
const SEM_ESPECIAIS = ['haki', 'sobrenatural', 'sorte'];   // o humano não escolhe estas em Adaptação (p.22)

// ---- As contas da ficha ----
const modDe = v => Math.floor(((+v || 10) - 10) / 2);                  // (valor − 10) ÷ 2, para baixo (p.11)
const bonusProf = lv => 2 + Math.floor((Math.max(1, Math.min(20, lv || 1)) - 1) / 4);   // +2 níveis 1–4 … +6 níveis 17–20 (p.13)
// Pontos de Experiência para ENTRAR em cada nível (p.13); o nível 1 começa com 0
const PE_NIVEL = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
const NIVEL_MAX = 20;
// Limite de XP de um encontro fácil por nível (Guia do Narrador, p.45): serve de recompensa base de uma missão
const XP_FACIL = [0, 25, 50, 75, 125, 250, 300, 350, 450, 550, 600, 800, 1000, 1100, 1250, 1400, 1600, 2000, 2100, 2400, 2800];
// Estágios da carreira (p.13; a divisão por nível é a provável do livro)
const ESTAGIOS = [[1, 'Pirata Desconhecido'], [5, 'Pirata Infame'], [11, 'Dono dos Mares'], [17, 'Ameaça Mundial']];
const estagioDe = lv => { let e = ESTAGIOS[0][1]; ESTAGIOS.forEach(([n, t]) => { if (lv >= n) e = t; }); return e; };
const TAB_MOD = 'Modificador = (valor − 10) ÷ 2, para baixo';

// ---- Espécies (cap. 2, pp.14-32) ----
// pv: Pontos de Vida base; desloc/nado em metros; size: tamanho do token no mapa (1 = um quadrado)
const ESPECIES = {
  anao:      { nome: 'Anão', pv: 8, desloc: 9, nado: 4.5, tam: 'Miúdo', size: 0.7, prec: 'Débil',
    ben: 'Corpo Pequeno: estômago pequeno, Piscar (teletransporte curto), Andar das Fadas (furtividade) e Hóspede Feérico (carona em criatura maior).', dif: 'Ingenuidade Anormal: −10 em testes de Vontade (Intuição).', cultura: true },
  celestial: { nome: 'Celestial', pv: 10, desloc: 12, nado: 3, tam: 'Médio', size: 1, prec: 'Débil',
    ben: 'Herança Cultural: proficiente em dials; começa com 3 dials cotidianos e 1 bélico; 2 perícias extras (exceto Sobrenatural e Sorte).', dif: 'Anjos Caídos: −2 em Destreza (Acrobacia) abaixo de 5.000 m de altitude.', cultura: true,
    variantes: [{ k: 'birkan', nome: 'Birkans', t: '+5 em Presença (Atuação): Sacerdote Celestial.' }, { k: 'shandian', nome: 'Shandians', t: '+5 em Força (Atletismo): Guerreiro Celestial.' }, { k: 'skypean', nome: 'Skypeans', t: '+5 em Presença (Persuasão): Diplomata Celestial.' }],
    pericias: { n: 2, excluir: ['sobrenatural', 'sorte'] } },
  gigante:   { nome: 'Gigante', pv: 20, desloc: 9, nado: 3, tam: 'Enorme', size: 2, prec: 'Inexistente', def: 0,
    ben: 'Força Colossal: dobra o Bônus de Proficiência em testes e salvaguardas de Força; Corpo Assustador: +2 em Presença (Intimidação).', dif: 'Necessidades Gigantescas: come e bebe 5 vezes mais e ocupa o espaço de 20 tripulantes no navio.', cultura: true },
  humano:    { nome: 'Humano', pv: 10, desloc: 9, nado: 4.5, tam: 'Médio', size: 1, prec: 'Inexistente',
    ben: 'Adaptação: escolhe 3 perícias proficientes (exceto Haki, Sobrenatural e Sorte).', dif: 'Aspectos Humanos: escolhe uma falha (Ganância, Gula, Inveja, Ira, Luxúria, Preguiça ou Orgulho).', cultura: true,
    variantes: [{ k: 'comum', nome: 'Humano Comum', t: 'Aptidão Natural: dobra o Bônus de Proficiência em uma perícia.' }, { k: 'zarrao', nome: 'Humanozarrão', t: 'Colosso: tamanho Grande e +2 em salvaguardas de Força.' },
      { k: 'bracos', nome: 'Tribo Braços Longos', t: 'Braços Especiais: alcance de 3 m com os braços; +2 em Destreza (Prestidigitação).', reach: 1 }, { k: 'kuja', nome: 'Tribo Kuja (só mulheres)', t: 'Cobra Companheira, Arco de Cobra e Restringir; duas falhas de Aspectos Humanos.' },
      { k: 'pernas', nome: 'Tribo Pernas Longas', t: 'Pernas Especiais: alcance de 3 m com as pernas; deslocamento 12 m.', reach: 1 }, { k: 'pescoco', nome: 'Tribo Pescoço de Cobra', t: 'Pescoço Esticado: alcance de 3 m com a cabeça; +2 em Vontade (Percepção) visual.', reach: 1 },
      { k: 'tresolhos', nome: 'Tribo dos 3 Olhos', t: 'Abrir os Olhos: proficiência em Vontade (Haki, Sobrenatural ou Sorte).' }],
    pericias: { n: 3, excluir: SEM_ESPECIAIS } },
  lunariano: { nome: 'Lunariano', pv: 16, desloc: 9, nado: 3, tam: 'Médio', size: 1, prec: 'Medíocre', fireImmune: true,
    ben: 'Heat: 1x por rodada, +1d10 de dano de Fogo num ataque (usos = nível). Manipulação do Fogo: resistência a fogo e esfera de fogo.', dif: 'Cabeça a Prêmio: ao se expor em público, 1d12 ≤ 6 atrai o Governo ou a Marinha.', cultura: true },
  mestico:   { nome: 'Mestiço', pv: 0, desloc: 9, nado: 4.5, tam: 'Médio', size: 1, prec: 'a maior das duas', mestico: true,
    ben: 'Dois Mundos e Miscigenação: escolhe um Benefício de cada uma das duas espécies e uma Dificuldade de uma delas.', dif: 'Uma das Dificuldades das duas espécies, à escolha.' },
  mink:      { nome: 'Mink', pv: 12, desloc: 9, nado: 4.5, tam: 'Pequeno a Grande', size: 1, prec: 'Medíocre', electro: true,
    ben: 'Electro: 1x por rodada, +1d10 de dano Elétrico num ataque (usos = nível). Ancestralidade: traços do animal. Forma Sulong sob a lua cheia.', dif: 'Instintos Animalescos: diante do objeto de instinto, Vontade CD 15 ou Atordoado por 1d4 turnos.',
    variantes: [{ k: 'agil', nome: 'Ágeis', t: 'Corpo Leve: deslocamento 12 m, escalada 9 m.' }, { k: 'meao', nome: 'Meãos', t: 'Estamina Animal: deslocamento 18 m.' }, { k: 'robusto', nome: 'Robustos', t: 'Pisada Firme: deslocamento 12 m, ignora terreno difícil.' }] },
  povomar:   { nome: 'Povo do Mar', pv: 14, desloc: 9, nado: 15, tam: 'Médio a Grande', size: 1, prec: 'Severo', evento: 2,
    ben: 'Força Superior: proficiente e soma metade do Bônus de Proficiência em salvaguardas e testes de Força.', dif: 'Criatura do Mar: precisa de água em dobro (4x em dia quente), senão ganha Exaustão.',
    variantes: [{ k: 'homempeixe', nome: 'Homem-Peixe', t: 'Corpo Marinho: um Traço Comum de Zoan.' }, { k: 'sireno', nome: 'Sireno', t: 'Natação Superior: nado 18 m e Disparada como ação bônus.' }] },
};
// Variações Raras (p.32): só uma, não vale para mestiço, e troca o Benefício da espécie. Saem na roleta.
const VARIACOES_RARAS = {
  bucaneiro:  { nome: 'Bucaneiro', t: 'Mente Solar: sucesso automático contra qualquer efeito que manipule a mente.' },
  experimento: { nome: 'Experimento Científico', t: 'Corpo Engenhado: Melhoria Genética; desvantagem em Atuação, Intuição e Persuasão.' },
  noite:      { nome: 'Filho da Noite', t: 'Corpo Estranho: pode comer várias Akuma no Mi; não dorme nem faz descanso longo comum.' },
  sangue:     { nome: 'Sangue Ancestral', t: 'Poder Maligno: +1 dado de dano extra (usos = nível, 1x por rodada); até o 12º nível sofre o mesmo dano.' },
  clone:      { nome: 'Clone', t: 'Habilidade Herdada: +3 espaços de Singularidade e pode dispensar 1 Defeito Médio.' },
};

// ---- Habilidades Básicas (cap. 3, pp.38-40) ----
const HABILIDADES = {
  aprimoramento: { nome: 'Aprimoramento de Atributo', t: '+2 em um atributo ou +1 em dois (máx. 20).' },
  concentracao:  { nome: 'Concentração Inabalável', t: 'Sucesso automático no 1º teste de concentração e +2 no 2º (1x por descanso longo).' },
  corpo:         { nome: 'Corpo de Guerreiro', t: 'Ataque desarmado de verdade (1d4 a 1d10 por nível) e CR = 10 + atributo primário + Constituição (limitada).' },
  defesa:        { nome: 'Defesa Ofensiva', t: 'A CR usa o atributo primário no lugar de Destreza; Em Guarda e Aparar com a arma favorita.' },
  inefavel:      { nome: 'Dificuldade Inefável', t: '+ metade do Bônus de Proficiência nas CDs das suas Técnicas.' },
  energia:       { nome: 'Gerenciamento de Energia', t: 'Ação bônus: recupera 1d8 + Bônus de Proficiência em PP (1x por descanso longo).' },
  menteCorpo:    { nome: 'Mente e Corpo', t: 'Ação bônus: ignora os 5 primeiros níveis de Exaustão por 10 minutos (3 usos).' },
  mira:          { nome: 'Mira Treinada', t: 'Ataques à distância causam um dado de dano maior; crítico atinge mais uma criatura.' },
  perito:        { nome: 'Perito em Técnicas', t: 'Não gasta PP se a Técnica não afeta nada; mais dano e cura nos níveis altos.' },
  preparacao:    { nome: 'Preparação para a Batalha', t: 'Ação bônus por 1 minuto: dano mínimo = metade do máximo e +3 dados nas Técnicas (1x por descanso longo).' },
  socorros:      { nome: 'Primeiros Socorros', t: 'Ação bônus: cura 10 PV por nível + PV temporários e encerra Envenenado e Sangramento (gasta 1 kit).' },
  prodigio:      { nome: 'Prodígio do Combate', t: 'Ataque de Oportunidade, Crítico Marcial (19-20) e Reverter Superioridade.' },
  quebrador:     { nome: 'Quebrador de Regras', t: 'Escolhe um: Vitalidade Exuberante, Força Magnífica ou Aprimoramento Inato.' },
  recuo:         { nome: 'Recuo Estratégico', t: 'Ação bônus: recua até 2x o deslocamento e usa Disparada ou Esconder.' },
  folego:        { nome: 'Retomar o Fôlego', t: 'Ação bônus: cura 2d10 + Constituição (3 usos por descanso longo).' },
  robusto:       { nome: 'Robusto', t: '+3 PV por nível, inclusive os já ganhos.' },
  sortudo:       { nome: 'Sortudo', t: 'Rerrola um ataque, perícia ou salvaguarda, sua ou inimiga (3 usos por descanso longo).' },
  limites:       { nome: 'Superando Limites', t: 'Ao começar um encontro com 0 PP, recupera PP; ou evita a exaustão da sobrecarga.' },
  absoluta:      { nome: 'Superioridade Absoluta', t: 'Se os PV do alvo caírem a seu nível ou menos após o dano, ele cai a 0 PV.' },
};

// ---- Estilos de Combate (cap. 3, pp.33-112) ----
// dv: Dado de Vida; salv: salvaguardas proficientes; prim: atributo primário (escolhe um se houver dois);
// per: { n, de: lista ou null para qualquer }; inata: Habilidades Básicas Inatas (escolhe uma); din: dinheiro inicial (nd10 × 1.000)
const ESTILOS = {
  atirador:   { nome: 'Atirador', dv: 8, salv: ['DES', 'SAB'], prim: ['DES'], per: { n: 3, de: null }, arma: 'pistola ou mosquete', inata: ['mira', 'absoluta'], din: 5, equip: '2 pistolas ou 1 mosquete, 80 munições esféricas', reach: 6, dado: 8,
    desc: 'Armas de fogo e tiro certeiro: Duelista ou Sniper.' },
  aventureiro:{ nome: 'Aventureiro', dv: 10, salv: ['DES', 'CON'], prim: ['DES'], per: { n: 3, de: null }, arma: 'chicote ou pistola', inata: ['defesa', 'perito'], din: 10, equip: '1 pistola, 80 munições, 1 chicote, 1 adaga', reach: 4, dado: 6,
    desc: 'Chicote e pistola, explorador e sobrevivente.' },
  brutamontes:{ nome: 'Brutamontes', dv: 12, salv: ['FOR', 'CON'], prim: ['FOR'], per: { n: 2, de: ['atletismo', 'intimidacao', 'provocacao', 'sobrevivencia'] }, arma: 'kanabo, machado grande, martelo de guerra, espada montante ou Corporal', inata: ['corpo', 'absoluta'], din: 6, equip: '1 kanabo', reach: 1, dado: 10,
    desc: 'Força bruta e sede de sangue.' },
  carateca:   { nome: 'Carateca Homem-Peixe', dv: 12, salv: ['CON', 'FOR'], prim: ['FOR'], per: { n: 2, de: ['acrobacia', 'atletismo', 'atuacao', 'intimidacao'] }, arma: 'tridente ou Corporal', inata: ['corpo', 'aprimoramento'], din: 15, equip: '1 arma marcial à escolha ou ฿ 40.000', reach: 1, dado: 8,
    desc: 'Golpes com a água do corpo e do mar.' },
  ciborgue:   { nome: 'Ciborgue', dv: 12, salv: ['FOR', 'SAB'], prim: ['FOR', 'SAB'], per: { n: 2, de: ['atletismo', 'investigacao', 'prestidigitacao', 'sobrevivencia'] }, arma: 'bazuca, canhão, escopeta ou metralhadora', inata: ['aprimoramento', 'perito'], din: 10, equip: '20 unidades de combustível de motor', reach: 4, dado: 8,
    desc: 'Corpo robótico com modificações.' },
  espadachim: { nome: 'Espadachim', dv: 10, salv: ['DES', 'VON'], prim: ['FOR', 'DES'], per: { n: 2, de: ['atletismo', 'intimidacao', 'intuicao', 'percepcao'] }, arma: 'uma arma cortante', inata: ['perito', 'limites'], din: 5, equip: '2 sabres ou 2 katanas', reach: 1, dado: 8,
    desc: 'Posturas de uma a nove espadas.' },
  guerrilheiro:{ nome: 'Guerrilheiro', dv: 10, salv: ['DES', 'FOR'], prim: ['FOR', 'SAB'], per: { n: 2, de: ['acrobacia', 'atletismo', 'furtividade', 'historia', 'sobrevivencia'] }, arma: 'qualquer arma ou Corporal', inata: ['corpo', 'perito'], din: 5, equip: '2 pistolas, 1 mosquete ou 2 armas cortantes', reach: 4, dado: 8,
    desc: 'Mestre das armas e da estratégia.' },
  lutador:    { nome: 'Lutador', dv: 12, salv: ['CON', 'FOR'], prim: ['FOR'], per: { n: 2, de: ['atletismo', 'intimidacao', 'provocacao', 'sobrevivencia'] }, arma: 'arma marcial ou Corporal', inata: ['corpo', 'limites'], din: 15, equip: '1 arma marcial à escolha ou ฿ 40.000', reach: 1, dado: 6,
    desc: 'Punhos e chutes: briga de rua e de arena.' },
  ninja:      { nome: 'Ninja', dv: 8, salv: ['DES', 'SAB'], prim: ['DES'], per: { n: 2, de: ['acrobacia', 'enganacao', 'furtividade', 'prestidigitacao'] }, arma: 'katana, kunai, adaga, shuriken, foice ou arco', inata: ['defesa', 'sortudo'], din: 6, equip: '1 katana, 5 kunais, 30 shurikens', reach: 4, dado: 6,
    desc: 'Sombras, ninjutsu e assassinato.' },
  okama:      { nome: 'Okama Kenpo', dv: 10, salv: ['DES', 'PRE'], prim: ['FOR', 'PRE'], per: { n: 3, de: ['acrobacia', 'atletismo', 'atuacao', 'enganacao', 'intimidacao', 'intuicao', 'provocacao'] }, arma: 'arma marcial ou Corporal', inata: ['corpo', 'limites'], din: 15, equip: '1 arma marcial ou ฿ 40.000', reach: 1, dado: 6,
    desc: 'Balé e amizade: proteger quem se ama.' },
  rokushiki:  { nome: 'Rokushiki', dv: 10, salv: ['DES', 'FOR'], prim: ['FOR', 'DES'], per: { n: 2, de: ['acrobacia', 'atletismo', 'enganacao', 'furtividade', 'historia', 'investigacao'] }, arma: 'adaga, katana, bastão ou Corporal', inata: ['corpo', 'perito'], din: 15, equip: '1 arma marcial ou ฿ 40.000', reach: 1, dado: 6,
    desc: 'Soru, Tekkai, Shigan, Rankyaku e os outros do Governo.' },
  samurai:    { nome: 'Samurai', dv: 10, salv: ['CON', 'VON'], prim: ['FOR', 'DES'], per: { n: 2, de: ['intimidacao', 'intuicao', 'percepcao', 'sobrevivencia'] }, arma: 'arco, daito katana, foice, kanabo, katana, lança, nodachi, pistola ou shikomizue', inata: ['absoluta', 'limites'], din: 7, equip: '2 katanas', reach: 1, dado: 8,
    desc: 'Código de honra e juramento.' },
};

// ---- Profissões (cap. 4, pp.130-158) ----
const PROFISSOES = {
  nenhuma:      { nome: 'Sem profissão', per: null, kit: 'Ajudante Perfeito (+5 ao ajudar), Foco (2 perícias à escolha), Parceiro de Treino e Tempo Livre (até 5 funções no navio).', desc: 'Sem profissão: ajuda os outros e ocupa várias funções no navio.' },
  adestrador:   { nome: 'Adestrador', per: ['acrobacia', 'atuacao', 'intuicao', 'percepcao', 'persuasao', 'sobrevivencia'], kit: 'mochila pequena, 30 rações para animais, chicote, apito, 1 kit médico, 3 kits de primeiros socorros', desc: 'Cria e treina animais.' },
  arqueologo:   { nome: 'Arqueólogo', per: ['historia', 'intuicao', 'investigacao', 'percepcao', 'persuasao', 'sobrevivencia'], kit: 'mochila pequena, lanterna, corda, tenda, chicote, porta-mapas, caderno, kit de escalada', desc: 'Lê ruínas e procura tesouros perdidos.' },
  botanico:     { nome: 'Botânico', per: ['historia', 'intuicao', 'investigacao', 'natureza', 'percepcao', 'sobrevivencia'], kit: 'mochila pequena, lupa, ferramentas de coleta, 5 frascos, estilete de poda', desc: 'Conhece e cultiva plantas.' },
  cacador:      { nome: 'Caçador de Recompensas', per: ['furtividade', 'intimidacao', 'investigacao', 'percepcao', 'persuasao', 'sobrevivencia'], kit: 'mochila pequena, 3 kits de primeiros socorros, 2 cordas, 2 algemas, bússola ou log pose', desc: 'Rastreia e captura procurados.' },
  carpinteiro:  { nome: 'Carpinteiro', per: ['acrobacia', 'atletismo', 'historia', 'investigacao', 'persuasao', 'prestidigitacao'], kit: 'mochila pequena, 10 plantas de construção, serrote, martelo, kit de construção', desc: 'Conserta o casco em viagem e na luta naval, e paga metade no reparo do comércio.' },
  cientista:    { nome: 'Cientista', per: ['investigacao', 'intuicao', 'medicina', 'percepcao', 'prestidigitacao', 'natureza'], kit: 'mochila pequena, kit médico, kit de pesquisa, kit de primeiros socorros, kit de chaves, kit de construção, mini computador', desc: 'Pesquisa, inventa e faz experimentos.' },
  contrabandista:{ nome: 'Contrabandista', per: ['enganacao', 'furtividade', 'intimidacao', 'intuicao', 'persuasao', 'provocacao'], kit: 'mochila pequena, capa com bolsos falsos, kit de falsificação, mapa de rotas clandestinas', desc: 'Leva o que não pode ser levado.' },
  cozinheiro:   { nome: 'Cozinheiro', per: ['atuacao', 'intuicao', 'persuasao', 'prestidigitacao', 'provocacao', 'sobrevivencia'], kit: 'mochila pequena, kit de cozinha, 3 kits de temperos, roupa de gala', desc: 'A tripulação gasta metade da comida e recupera Energia ao chegar.' },
  engenheiro:   { nome: 'Engenheiro', per: ['historia', 'intuicao', 'investigacao', 'percepcao', 'prestidigitacao', 'sobrevivencia'], kit: 'mochila pequena, martelo, kit de chaves, kit de construção, mini computador', desc: 'Constrói máquinas e estruturas.' },
  espiao:       { nome: 'Espião', per: ['enganacao', 'furtividade', 'intuicao', 'investigacao', 'percepcao', 'prestidigitacao'], kit: 'mochila pequena, óculos ampliador, aparelho de escuta, caderno criptografado, kit de disfarce, kit de abrir cadeados, mini câmera', desc: 'Infiltra, escuta e disfarça.' },
  farmaceutico: { nome: 'Farmacêutico', per: ['historia', 'intuicao', 'investigacao', 'medicina', 'natureza', 'percepcao'], kit: 'mochila pequena, kit médico, kit de pesquisa, kit de primeiros socorros, kit de herbalismo, kit de venenos, reagentes básicos', desc: 'Remédios e venenos.' },
  ferreiro:     { nome: 'Ferreiro', per: ['atletismo', 'historia', 'intuicao', 'investigacao', 'percepcao', 'prestidigitacao'], kit: 'mochila pequena, martelo de forja pequeno, ferramentas de metal, pedra de amolar, bigorna pequena, molde simples', desc: 'Forja e conserta armas.' },
  informante:   { nome: 'Informante', per: ['enganacao', 'furtividade', 'investigacao', 'intuicao', 'percepcao', 'persuasao'], kit: 'mochila pequena, caderno codificado, mapa da região, ferramentas de comunicação discreta', desc: 'Compra e vende segredos.' },
  inventor:     { nome: 'Inventor', per: ['historia', 'investigacao', 'intuicao', 'natureza', 'prestidigitacao', 'percepcao'], kit: 'mochila pequena, kit de chaves, kit de construção, caixa de peças', desc: 'Cria engenhocas.' },
  jornalista:   { nome: 'Jornalista', per: ['enganacao', 'historia', 'investigacao', 'intuicao', 'percepcao', 'persuasao'], kit: 'mochila pequena, caderno, máquina fotográfica, gravador, livro de entrevista', desc: 'Conta e vende notícias.' },
  medico:       { nome: 'Médico', per: ['intuicao', 'investigacao', 'medicina', 'percepcao', 'prestidigitacao', 'sobrevivencia'], kit: 'mochila pequena, 1 kit médico, 3 kits de primeiros socorros', desc: 'A tripulação recupera Vida ao chegar e perde menos XP nas derrotas.' },
  musico:       { nome: 'Músico', per: ['atuacao', 'enganacao', 'furtividade', 'intimidacao', 'persuasao', 'prestidigitacao', 'provocacao'], kit: 'mochila pequena, 1 instrumento à escolha', desc: 'Toca e anima a tripulação.' },
  navegador:    { nome: 'Navegador', per: ['enganacao', 'intuicao', 'investigacao', 'percepcao', 'persuasao', 'sobrevivencia'], kit: 'mochila pequena, bússola, log pose, compasso, balestilha, astrolábio', desc: 'A viagem é 25% mais curta e +3 nos testes de clima.' },
  psiquiatra:   { nome: 'Psiquiatra', per: ['intuicao', 'investigacao', 'medicina', 'percepcao', 'persuasao', 'provocacao'], kit: 'mochila pequena, caderno clínico, kit médico', desc: 'Cuida da mente da tripulação.' },
  timoneiro:    { nome: 'Timoneiro', per: ['atletismo', 'atuacao', 'intuicao', 'percepcao', 'persuasao', 'prestidigitacao'], kit: 'mochila pequena, bússola ou log pose, 10 cordas, tambor', desc: '+2 nos testes de clima; o navio vira melhor e desvia de tiros na luta 3D.' },
};

// ---- Antecedentes (cap. 5.6, pp.170-175): 1 perícia, +2 num atributo (o recomendado é só uma dica) e uma característica ----
const ANTECEDENTES = {
  amnesia:    { nome: 'Amnésia', per: ['investigacao', 'intuicao', 'percepcao', 'historia'], rec: 'SAB', car: 'Ecos do Passado: teste de Vontade (Sorte) para lembrar de algo (1x por descanso longo).' },
  artista:    { nome: 'Artista', per: ['acrobacia', 'atuacao', 'historia', 'persuasao', 'prestidigitacao', 'provocacao'], rec: 'PRE', car: 'Rock Star: um show rende bellys com um bom teste de Presença (Atuação).' },
  criminoso:  { nome: 'Criminoso', per: ['enganacao', 'furtividade', 'intimidacao', 'prestidigitacao'], rec: 'DES', car: 'Contatos: conhece o submundo (teste de Vontade (Sorte)).' },
  derrotado:  { nome: 'Derrotado', per: ['intuicao', 'investigacao', 'historia', 'sobrevivencia'], rec: 'VON', car: 'Marcas da Derrota.' },
  erudito:    { nome: 'Erudito', per: ['historia', 'investigacao', 'natureza', 'sobrenatural'], rec: 'SAB', car: 'Conhecimento Acumulado.' },
  escravo:    { nome: 'Escravo', per: ['atletismo', 'intuicao', 'percepcao', 'sobrevivencia'], rec: 'CON', car: 'Esperança.' },
  exilado:    { nome: 'Exilado', per: ['historia', 'intuicao', 'persuasao', 'investigacao'], rec: 'PRE', car: 'Apoio no Exílio.' },
  familiad:   { nome: 'Família D.', per: ['haki', 'intimidacao', 'intuicao', 'percepcao'], rec: 'VON', car: 'Vontade dos D.: recompensa que cresce mais e herança ao morrer.' },
  marinheiro: { nome: 'Marinheiro', per: ['atletismo', 'investigacao', 'medicina', 'sobrevivencia'], rec: 'FOR', car: 'Carteirada: abre portas com a farda.' },
  mercador:   { nome: 'Mercador', per: ['enganacao', 'intuicao', 'investigacao', 'persuasao'], rec: 'PRE', car: 'Bom Negócio.' },
  mercenario: { nome: 'Mercenário', per: ['atletismo', 'intimidacao', 'investigacao', 'sobrevivencia'], rec: 'FOR', car: 'Contrato Temporário.' },
  nobre:      { nome: 'Nobre', per: ['historia', 'intuicao', 'investigacao', 'natureza'], rec: 'SAB', car: 'Influência.' },
  orfao:      { nome: 'Órfão', per: ['atletismo', 'furtividade', 'intuicao', 'sobrevivencia'], rec: 'FOR', car: 'Malandragem.' },
  predestinado:{ nome: 'Predestinado', per: ['intuicao', 'percepcao', 'persuasao', 'sorte'], rec: 'VON', car: 'Mão do Destino.' },
  revolucionario:{ nome: 'Revolucionário', per: ['atuacao', 'enganacao', 'historia', 'intuicao', 'persuasao', 'provocacao'], rec: 'PRE', car: 'Discurso e Histórias do Mar.' },
  sacerdote:  { nome: 'Sacerdote', per: ['historia', 'medicina', 'persuasao', 'sobrenatural'], rec: 'SAB', car: 'Fiéis.' },
  tenryuubito:{ nome: 'Tenryuubito', per: ['historia', 'intuicao', 'percepcao', 'sobrevivencia'], rec: 'VON', car: 'Costas Quentes.' },
};

// ---- Sonho e Caminho (cap. 5.3 e 5.4, p.160-161): nove caminhos = Realização × Forma ----
const REALIZACOES = { conhecimento: 'Conhecimento', liberdade: 'Liberdade', poder: 'Poder' };
const FORMAS = { companheirismo: 'Companheirismo', forca: 'Força', enganacao: 'Enganação' };
