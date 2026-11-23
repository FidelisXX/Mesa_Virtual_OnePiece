# Mesa Virtual (VTT) — guia de arquitetura para reaproveitar em outro projeto

Documento extraído do código real da mesa do HxH5e (`mesa/mesa.html`, `mesa/assets/*`).
Objetivo: permitir reproduzir a **lógica** da mesa (battlemap ao vivo, tokens, dados, chat, iniciativa, trilha sonora) em outro projeto, mesmo com outro sistema de RPG.

> **Aviso de fidelidade.** O SQL das tabelas da mesa **não está no repositório** (as migrações em `supabase/migrations/` são só da Torre Celestial). O esquema da seção 4 foi **reconstruído a partir das queries do código**. Confira contra o banco real antes de copiar.

---

## 1. Visão geral

A mesa é um **app de página única, sem build e sem backend próprio**:

- 1 arquivo HTML (~3000 linhas, JS vanilla dentro de uma IIFE) + 4 arquivos em `assets/`.
- **Supabase** faz tudo: Postgres (dados), Realtime (sincronização), Storage (imagens).
- **Sem Supabase Auth.** A identidade vem do app principal via `localStorage`; o `user_id` é gravado explicitamente em cada linha.
- **Sem framework.** O DOM é reconstruído com template strings (`innerHTML`) e listeners reatribuídos depois de cada render.

Papéis:

| Papel | Quem | O que pode |
|---|---|---|
| Narrador (GM) | `mesas.owner === user.id` | Tudo: cenas, mapa, NPCs, bestiário, trilha, mover qualquer token, limpar histórico |
| Jogador | linha em `mesa_membros` | Mover o **próprio** token, rolar dados, chat, ver o que o GM exibe |

Quem **pode criar** mesa é definido fora da mesa (admin ou "mestre" — ver seção 3).

### Arquivos

```
mesa/mesa.html              UI + toda a lógica (lobby, mesa, mapa, tokens, dados, chat, som…)
mesa/assets/nuvem-hxh.js    "Ponte": sessão, Supabase client, fichas, upload de imagem   (window.Nuvem)
mesa/assets/mapgen.js       Gerador procedural de battlemaps (receita → SVG)             (window.MapGen)
mesa/assets/blocos.js       Biblioteca de peças SVG (árvores, pedras, móveis, plantas)   (window.Blocos)
mesa/assets/hxh-mesa.css    Tema (variáveis CSS) e componentes de UI
```

**Para portar:** `nuvem-hxh.js` é a única parte acoplada ao app hospedeiro. Troque-a e o resto quase não muda (seção 3).

---

## 2. Princípios de design (o "porquê" da arquitetura)

1. **Banco é a verdade; tela é otimista.** Toda ação atualiza o estado local e a tela **na hora**, depois grava no banco; se o banco recusar, reverte (`t.x = d.x0` etc.).
2. **Dois canais de tempo real com papéis diferentes:**
   - `postgres_changes` → estado **durável** (tokens, mesa, cenas, mapa, rolagens, membros, mensagens).
   - `broadcast` → estado **efêmero** (token sendo arrastado, régua, ping) e atalhos (`tok`) para não esperar o round-trip do banco.
3. **Estado ao vivo em colunas JSONB da própria linha.** Turno, trilha sonora e config do mapa/grid vivem em `jsonb` (`mesas.turno`, `mesas.trilha`, `mapas.config`). Adicionar um recurso novo = nova chave no JSON, **sem migração**.
4. **Degradação graciosa quando falta coluna/tabela.** O código testa `'trilha' in S.mesa`, `'turno' in S.mesa`, `S.chatOk = !ch.error`, e cai para "só ao vivo" quando uma coluna não existe (`salvarTok` / `semColuna`). Útil para subir código antes da migração.
5. **Preferências por pessoa ficam no `localStorage`**, nunca no banco: câmera por mesa, largura da lateral, volume, som de aviso, posição da janela do token.
6. **Imagens nunca em base64 no banco** — vão para o bucket do Storage e a linha guarda só a URL (linhas pesadas travam o Realtime).
7. **Cada módulo grande tem seu próprio canal/estado**, para uma falha não derrubar o resto (o chat usa canal separado do canal da mesa).

---

## 3. Camada de identidade — `nuvem-hxh.js` (`window.Nuvem`)

Interface que o `mesa.html` consome. **Mantenha esta interface e troque a implementação** ao portar:

```js
window.Nuvem = {
  sb,                      // cliente Supabase
  ready,                   // Promise resolvida quando a sessão foi lida
  user,                    // { id, nome, email, avatar } ou null
  perfil(),                // idem
  papel,                   // { isAdmin, isMestre }
  podeNarrar,              // getter: isAdmin || isMestre
  onAuth(fn),              // callback quando a sessão some (logout em outra aba)
  perfis(ids),             // -> [{ id, nome, avatar_url }]  (para avatares/menções)
  listar(), obter(id),     // fichas do usuário (específico do sistema de RPG)
  resumo(ficha),           // ficha -> { attrs, iniciativa, hp, aura, classe… } (específico)
  enviarToken(file), enviarImagem(file, max), tokenDaFicha(ficha), montarMenu(el),
  APP_URL                  // para onde mandar quem não está logado
};
```

Como funciona hoje:

- Lê `localStorage['hxh_hunter_session']` → `{ id, username, avatar, email }`.
- Cliente Supabase com `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }` (só a chave **anon** pública).
- Consulta `bloqueados`, `admins`, `mestres` para decidir `papel`. **Falha de leitura não bloqueia ninguém.**
- `window.addEventListener('storage', …)` derruba a mesa se o usuário sair do app principal em outra aba.
- Avatar: se já é URL usa direto; se é hash do Discord monta `https://cdn.discordapp.com/avatars/{id}/{hash}.png`.

### Upload de imagem (Storage, bucket público `mesa`)

Tudo é convertido no navegador para **WebP** via `<canvas>` antes de subir:

| Função | Processamento | Pasta |
|---|---|---|
| `enviarToken` | recorte quadrado central, 256 px, q=0.88 | `tokens/<user>/<ts>-<rand>.webp` |
| `enviarImagem(file, max)` | reduz mantendo proporção (2400 px cenas / 4096 px mapas), q=0.86 | `cenas/…` |
| `tokenDaFicha` | idem token, mas **com cache** em `localStorage` (`hxh-mesa-tok-<id>`, chave = tamanho da string da foto) para não reenviar a cada "Usar" | `tokens/…` |

Detalhe importante do bucket do Bestiário: a política só permite **inserir e ler** (sem sobrescrever/apagar). Solução: cada envio vira `bestiario/<slug>--<timestamp>.webp` e **vale o mais recente** (a lista da pasta funciona como "tabela" de imagens, sem criar tabela).

---

## 4. Modelo de dados (reconstruído do código)

```sql
-- Rascunho. Ajuste tipos (uuid/text) ao que seu projeto usa.
create table mesas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  owner      text not null,                 -- user_id do narrador
  codigo     text unique,                   -- 6 caracteres, gerado no insert (default/trigger)
  exibindo   text not null default 'nada',  -- 'nada' | 'cena' | 'mapa'  ← o que os jogadores veem
  cena_id    uuid,                          -- cena exibida quando exibindo='cena'
  turno      jsonb default '{}',            -- { rodada, vez: <token_id> }
  trilha     jsonb default '{}',            -- { lista:[{id,t}], atual:{id,tocando,pos,em,loop} }
  created_at timestamptz default now()
);

create table mesa_membros (
  mesa_id uuid references mesas(id) on delete cascade,
  user_id text not null,
  personagem_id text,
  primary key (mesa_id, user_id)
);

create table cenas (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid references mesas(id) on delete cascade,
  titulo text, notas text,                  -- notas: só o narrador mostra
  imagem_url text, created_at timestamptz default now()
);

create table mapas (                        -- UM mapa por mesa (upsert por mesa_id)
  mesa_id uuid primary key references mesas(id) on delete cascade,
  cols int, rows int,
  fundo_url text,                           -- imagem própria OU null quando é gerado
  config jsonb default '{}'                 -- { gen:{receita}, grid:{on,forca,dx,dy,escala,cor} }
);

create table tokens (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid references mesas(id) on delete cascade,
  tipo text,                                -- 'pj' | 'npc'
  owner text,                               -- quem pode mover (além do GM)
  personagem_id text,                       -- ficha; criaturas usam "bestiario:<nome>"
  nome text, img_url text, cor text,
  tamanho int default 1, tam_y int,         -- largura / altura em quadrados (tam_y null = quadrado)
  hp int, hp_max int, aura int, aura_max int,   -- troque pelos seus recursos
  barras_publicas boolean default false,
  x numeric, y numeric,                     -- em QUADRADOS, não pixels
  iniciativa int,                           -- null = fora do combate
  reacoes int, principios jsonb             -- extras do HxH (opcionais)
);

create table rolagens (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid references mesas(id) on delete cascade,
  user_id text, nome text, rotulo text,
  formula text, total int, detalhe jsonb,   -- detalhe = [{d,s,r:[..],x:[..]} | {k}]
  secreta boolean default false, created_at timestamptz default now()
);

create table mensagens (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid references mesas(id) on delete cascade,
  user_id text, nome text, texto text,      -- texto limitado a 500 no cliente
  created_at timestamptz default now()
);
```

Requisitos de Realtime:

```sql
alter publication supabase_realtime add table mesas, mesa_membros, cenas, mapas, tokens, rolagens, mensagens;
```

> ⚠️ **Verifique:** no Supabase Realtime, eventos `DELETE` **não respeitam filtro** de coluna. O código assina `event:'*'` com `filter: mesa_id=eq.…` e depois usa `old.id` no DELETE. Confirme que a remoção de token/cena chega nos outros clientes; se não chegar, assine DELETE sem filtro e filtre no cliente.

### RPC `entrar_mesa(cod, uid)`

Chamada em `mesa.html` (`sb.rpc('entrar_mesa', { cod, uid })`); **o SQL não está no repo**. Pelo uso: busca a mesa pelo `codigo` (case-insensitive), insere `(mesa_id, uid)` em `mesa_membros` se ainda não existir, e retorna o `id` da mesa. Erro com texto contendo "encontrada" quando o código não existe (o cliente testa `/encontrada/.test(error.message)`). Deve ser `SECURITY DEFINER`, pois quem entra ainda não é membro.

---

## 5. Estado do cliente e ciclo de vida

Um objeto global `S` dentro da IIFE:

```js
const S = { mesa, gm, membros[], perfis{}, cenas[], mapa, tokens{id→token}, view, sel, painel,
            tab, rolagens[], tool:'mover', rulers{}, chat[], chatOk, naoLidas };
let cam = { x: 40, y: 40, z: 1 };   // câmera do mapa
```

Fluxo de entrada:

1. `NV.ready` → sem usuário: mostra lobby/gate. `?entrar=CODIGO` → chama `entrar_mesa` e redireciona para `?m=<id>`. `?m=<id>` → `abrirMesa(id)`.
2. `abrirMesa` carrega **7 queries em paralelo** (`Promise.all`): mesa, membros, cenas, mapa, tokens, últimas 50 rolagens, últimas 150 mensagens.
3. `carregarPerfis()` (avatares/nomes dos participantes), `montarMesa()` (esqueleto), `assinar(id)` (canal da mesa) e `assinarChat(id)` (canal do chat).
4. Cada mudança chama funções de render **pontuais** (`atualizarToken`, `renderOrdem`, `paneDados`…) em vez de re-renderizar tudo.

Lobby: "minhas mesas" = `owner = eu` **OU** `id in (mesas onde sou membro)`, feito com `.or()` no cliente (não há RLS por usuário).

Layout: `grid` com 3 áreas — barra superior, **palco** (`#stage`) e **lateral** (`#side`, abas). Palco mostra `cena`, `mapa` ou tela de espera conforme `mesas.exibindo`. O GM pode ter uma **prévia local** (`S.view`, `S.mapaPreview`) diferente do que os jogadores veem — marcada com "PRÉVIA · SÓ VOCÊ VÊ". Só ao clicar "Exibir para os jogadores" se grava `exibindo`.

---

## 6. Sincronização em tempo real (o coração)

Um canal `mesa-<id>` com `broadcast: { self: false }`:

```js
channel = sb.channel('mesa-' + id, { config: { broadcast: { self: false } } })
  .on('postgres_changes', { event:'*', schema:'public', table:'tokens', filter:`mesa_id=eq.${id}` }, handler)
  // idem: mesas (filter id=eq.), cenas, mapas, mesa_membros, rolagens
  .on('broadcast', { event:'tok'  }, …)   // patch parcial de um token (sem esperar o banco)
  .on('broadcast', { event:'move' }, …)   // posição ao vivo durante o arraste
  .on('broadcast', { event:'ping' }, …)   // ping do narrador
  .on('broadcast', { event:'ruler'}, …)   // régua de alguém
  .subscribe(status => { if (status === 'CHANNEL_ERROR') toast('Conexão instável…'); });
```

Regras que valem ouro:

- **Merge defensivo no UPDATE de token.** Se uma coluna nova ainda não existe, a linha volta sem ela; o handler copia do token antigo as chaves ausentes (`['reacoes','principios','tam_y']`) para não "perder" valor local.
- **Anti-eco.** `drag && drag.id === id` ignora `move` do próprio token; `S.rolagens.some(x => x.id === n.id)` evita duplicar o que o próprio cliente já inseriu (insert local + evento do Realtime).
- **Mudança de mesa** compara campos (`exibindo`, `cena_id`, `turno.vez`, `JSON.stringify(trilha)`) e só dispara o que mudou (re-render do palco, aviso de vez, reaplicar trilha).
- **Throttle dos broadcasts de arraste:** `move` a cada ≥ 70 ms, `ruler` a cada ≥ 90 ms, ping ≥ 300 ms.
- **Se a mesa é apagada** (`DELETE` em `mesas`) todos são redirecionados ao lobby; **se o membro é removido** o próprio cliente sai.
- Logout no app principal → `NV.onAuth(u => !u && location.href = APP_URL)`.

---

## 7. Battlemap

### Modelo de coordenadas

- `CELL = 64` px por quadrado; **no banco x/y são em quadrados**, na tela são `x * CELL`.
- Estrutura: `#vp` (viewport, recebe eventos) → `#world` (recebe `transform: translate(cam.x,cam.y) scale(cam.z)`) → `#area` (imagem/SVG de fundo + `.gl` grid) + `<svg id="ovl">` (régua/rotas) + `#tokLayer`.
- Conversão tela→mundo: `(clientX - rect.left - cam.x) / cam.z`.
- Zoom no ponto do cursor:

```js
function zoomEm(px, py, f) {
  const z = clamp(cam.z * f, 0.2, 8), k = z / cam.z;
  cam.x = px - (px - cam.x) * k;  cam.y = py - (py - cam.y) * k;  cam.z = z;
}
```

- A câmera é salva por mesa em `localStorage['hxh-mesa-cam-<id>']` (debounce de 400 ms). Sem câmera salva → `centralizar()` ajusta o zoom para caber o mapa.

### Controles

Roda/trackpad: scroll = pan; **Ctrl/Cmd + scroll** = zoom; **pinça** com 2 ponteiros; botão do meio ou **Espaço** segurado = pan; `+ − 0 1` zoom/ajuste/1:1; `R` régua; `M` mover; duplo clique = ping. Tudo com **Pointer Events** + `setPointerCapture` (funciona igual em mouse e toque).

### Grid em duas camadas (truque que resolveu "grid some em mapa escuro")

Config em `mapas.config.grid = { on, forca, dx, dy, escala, cor }`:

- Grid **no viewport** (coordenadas de tela, multiplicado pelo zoom) via variáveis CSS `--g --gx --gy`.
- Grid **sobre o mapa** (`.gl` dentro de `#area`, coordenadas de mundo, sem zoom) via `--gl-s --gl-x --gl-y`.
- `dx/dy/escala` permitem **alinhar o grid do app ao grid já desenhado numa imagem** enviada, em vez de recortar a imagem.
- `cor: 'auto' | 'claro' | 'escuro'`; "auto" deixa o CSS decidir (preto sobre imagem, branco em mapa branco).
- Ao arrastar o slider de escala só a tela muda; **grava no banco apenas no `onchange`**.
- ⚠️ `salvarMapa` faz **upsert da linha inteira**: ao mudar só o grid ou só as colunas/linhas, reenvie `fundo_url` e `config` junto, senão apaga o fundo.

### Tokens

- Largura = `tamanho`, altura = `tam_y` (se nulo, = largura). Retrocompatível: tokens antigos continuam quadrados.
- **Permissão:** `podeMover(t) = gm || t.owner === user.id`. Jogador que arrasta token alheio vê "Esse token não é seu" e nada é gravado.
- **Arraste:** guarda o deslocamento do clique dentro do token (`ox,oy`), move com `left/top` direto no elemento (sem re-render), manda `broadcast move` throttled; no `pointerup` faz **snap** (`Math.round(x/CELL)`), renderiza, manda `move` final e grava `update tokens set x,y`. Falhou? Volta para `x0,y0`.
- Limiar de 4 px para diferenciar clique de arraste; clicar só **seleciona** e mostra "Abrir ficha" (evita o painel cobrir o mapa no celular).
- **Barras de PV/recurso:** visíveis se `barras_publicas || gm || dono`. NPC criado com barras ocultas → jogadores veem só o nome.
- `centroLivre(tam)` varre o mapa a partir do centro para achar um espaço vazio para novos tokens.
- Ordem de desenho: NPCs primeiro (ficam **embaixo** dos jogadores).

### Régua e rotas

- Ferramenta Régua, ou arrastando token (mostra o caminho percorrido). Botão direito (ou `chorded`) **quebra a rota** em curvas.
- **Distância com diagonais alternadas** (1ª = 1 quadrado, 2ª = 2, 3ª = 1…), contagem contínua entre trechos:

```js
function distQ(pts) {
  let q = 0, diag = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = Math.round(Math.abs(pts[i].x - pts[i-1].x)), dy = Math.round(Math.abs(pts[i].y - pts[i-1].y));
    const d = Math.min(dx, dy), reto = Math.max(dx, dy) - d;
    q += reto + d + (Math.floor((diag + d) / 2) - Math.floor(diag / 2));
    diag += d;
  }
  return q;       // 1 quadrado = 1,5 m
}
```

- A régua de cada usuário é transmitida via `broadcast ruler` com `{ u, nome, pts }` e **expira em 4 s** sem atualização (`S.rulers[u].t`). `pts: null` = apagar.
- Espessuras do SVG dividem por `cam.z` para ficarem constantes na tela em qualquer zoom.

### Ping

Duplo clique desenha "gota na água". O do jogador só ele vê; o do **narrador** é transmitido por `broadcast` — apenas se ele estiver olhando o mapa ao vivo (não em prévia).

---

## 8. Iniciativa e turnos

- Valor rolado em `tokens.iniciativa` (uma linha por token → rolagens simultâneas não se atropelam).
- Vez atual em `mesas.turno = { rodada, vez }`.
- `ordem()`: filtra `iniciativa != null`, ordena por valor desc, desempate NPC depois de PJ, depois nome.
- `passarTurno(dir)` anda na lista; ao passar do fim, `rodada++` e volta ao topo; se a vez era de alguém removido da ordem, recomeça do topo.
- Salvar turno é otimista com **rollback** em erro. `avisoVez()` dá toast ("É a sua vez!" para o dono do token).
- Narrador: "NPCs" rola todos de uma vez, Começar/Próximo/Anterior/Encerrar. Jogador: só rola os próprios e "Terminar meu turno" quando é a vez dele.
- Bônus de iniciativa vem da ficha (`resumo(ficha).iniciativa`), de criatura do bestiário (DES) ou 0.

---

## 9. Dados

- **RNG:** `crypto.getRandomValues` (não `Math.random`) para o resultado real.
- **Parser** (`parseRolagem`): aceita `1d20+4`, `2d6`, `3d6-1`, termos com sinal; limites: 2–1000 lados, **máx. 60 dados** por rolagem; erros com mensagem amigável. Retorna `{ total, det, formula }`, onde `det = [{ d, s, r:[…] } | { k }]`.
- **Modos de d20:** Normal, Vantagem (maior), Desvantagem (menor), **Ênfase** (o mais distante de 10,5). O dado descartado vai em `x:[]` e aparece **riscado** no histórico.
- **Rolagem secreta:** `secreta=true`; `podeVerRolagem(r) = !r.secreta || gm || r.user_id === eu`. ⚠️ É filtro **só de tela** — com chave anon o banco não esconde nada. Se precisar de sigilo real, use RLS.
- `gravarRolagem` insere em `rolagens`; o evento Realtime traz para todos. O histórico é paginado (50 + "ver mais antigas" via `created_at < última`).
- **Animação no palco:** dado SVG por tipo (d4…d100), cai girando com "fumaça", números trocam a cada 80 ms e param no valor ao pousar (1,25 s + 0,12 s por dado). Mostra no máx. 6 dados + "+N". **Fila** (`DADO_MIN = 2800 ms` por rolagem, máx. 6 na fila) para ataque+dano não se sobreporem. Respeita `prefers-reduced-motion`.
- Crítico/falha natural: só quando há exatamente um d20 → destaque "20 natural!" / "1 natural".
- Som de dado só para rolagem **dos outros**.

---

## 10. Chat

- Mensagens + rolagens aparecem **intercaladas por horário** (últimos 200 itens), como no Roll20. Mensagens seguidas da mesma pessoa em < 3 min são agrupadas.
- `/r 1d20+3` (ou `/roll`) no campo rola dado em vez de enviar texto.
- **Menções `@nome`:** comparação sem acento e sem maiúscula, aceita primeiro nome ou nome completo; autocomplete abre ao digitar `@` (↑ ↓ Enter/Tab/Esc), só lista quem está na mesa e exclui você mesmo. Menção a você = som mais alto + toast **mesmo com o chat aberto**; mensagem comum só avisa se você está em outra aba (contador de não lidas na aba).
- **Canal separado** (`mesa-chat-<id>`), assinado só se `S.chatOk`.
- Narrador pode limpar o chat (não apaga rolagens).

### Sons de aviso

Sintetizados com **WebAudio** (osciladores + `GainNode` com rampa exponencial) — nenhum arquivo, nenhuma requisição. O `AudioContext` só nasce depois do primeiro clique (política dos navegadores). Preferência em `localStorage['nv_mesa_som']`. Sem API de Notificação (não pede permissão).

---

## 11. Trilha sonora sincronizada (YouTube)

Estado em `mesas.trilha = { lista:[{id,t}], atual:{ id, tocando, pos, em, loop } }`. A sincronização **não transmite posição a cada segundo**: grava só **quando mudou** (play/pause/troca/loop), junto com `em = Date.now()` e `pos`:

```js
posAgora(a) = a.pos + (a.tocando ? (Date.now() - a.em) / 1000 : 0)   // com loop: módulo da duração
```

Cada cliente calcula onde a faixa deve estar e faz `seekTo` se a diferença passar de **3 s** (tolerância entre aparelhos). Pontos de atenção:

- Player via **YouTube IFrame API** carregada sob demanda.
- Navegador pode barrar autoplay: se não começou a tocar em 2 s, aparece botão "Tocar" (1 toque libera).
- Códigos de erro 100/101/150 viram mensagens legíveis ("dono não deixa tocar fora do YouTube").
- **Só o narrador avança a playlist** ao fim da faixa (evita N clientes pulando juntos).
- Volume/mudo/minimizar são **locais** (`localStorage['hxh-mesa-som']`).
- Título via `youtube.com/oembed`; miniatura via `i.ytimg.com/vi/<id>/mqdefault.jpg`. `ytId()` aceita `watch?v=`, `youtu.be/`, `shorts/`, `embed/`, `live/` e id puro.
- Relógios dos aparelhos diferentes afetam `Date.now()`; a tolerância de 3 s absorve isso.

---

## 12. Cenas

Imagem + título + notas do narrador (privadas — só o GM renderiza o textarea). `exibir('cena', id)` grava `mesas.exibindo='cena'` + `cena_id`; todos os clientes trocam o palco via Realtime. Prévia local antes de publicar.

---

## 13. Gerador de mapas (`mapgen.js` + `blocos.js`)

Princípio: **mapa = receita pequena → SVG determinístico.**

```js
receita = { tipo, seed, mix:{casas:60, arvores:40, …}, layout }   // vai em mapas.config.gen
MapGen.svg(gen, cols, rows)     // devolve o SVG do mapa
MapGen.fundo(tipo)              // cor/gradiente do chão
MapGen.legenda(tipo)            // [{ nome, cor }] para a legenda
MapGen.normaliza(receita)       // completa com padrões
MapGen.novaSemente()
```

- PRNG com **semente** (mulberry32) → o mesmo `seed` gera o **mesmo mapa em qualquer navegador**; por isso só a receita é salva (poucos bytes), não a imagem.
- `mix` = quantidade 0–100% (de 20 em 20) de cada elemento (casas, árvores, pedras, relevo, água, pontes, objetos, penhascos, móveis, salas, espaço aberto…).
- 11 tipos em 2 grupos: **Urbano** (vila, residencial, comercial, campo de treino, dungeon) e **Natureza** (floresta, aquático, deserto, neve, montanha, caverna). Residencial/comercial usam **plantas prontas** (`Blocos.PLANTAS`).
- As peças (`blocos.js`) são funções `(seed) → SVG` só em traço preto; o gerador **recolore por função** (cobertura, elevação, água, árvore, pedra). 1 célula = 64 px = 1,5 m.
- O criador abre num pop-up com **prévia com debounce de 110 ms**.
- Para outro sistema: dá para trocar os tipos/peças sem tocar no resto — a mesa só precisa de `svg/fundo/legenda`.

---

## 14. Bestiário e fichas (específico do HxH — adapte)

- **Ficha → token:** "Usar" copia nome, cor da classe, PV/Aura e foto para o token. O que muda no token **não altera a ficha** (e vice-versa). "Atualizar" puxa de novo.
- **Criatura → token NPC:** `personagem_id = "bestiario:<nome>"` liga o token ao registro sem criar coluna nova; `bestDe(t)` resolve. Segunda criatura igual vira "Nome 2", "Nome 3"… Tamanho do token deduzido do texto do tipo ("Enorme" → 3×3). PV lido de `m.pv`. Ações são parseadas do texto ("+11 para atingir", dado entre parênteses, "TR DES CD 22") para virar botões de rolagem. **Só o narrador vê dados da criatura.**
- Atributos/modificadores usam o **valor base**; bônus de Hatsu/Princípios entram só em Reações via `window.calcBonusReacao` (carregado de `js/data/*`).
- Aura de Nen no token é um filtro SVG `feTurbulence` + `feDisplacementMap` animado (TEN calmo, REN "fervendo").

Para **outro sistema**, substitua: `resumo()`, `BESTIARY_DATA`, a lista `REACOES`, `auraHTML`, `nenHTML`, as colunas `aura*`, `reacoes`, `principios`, e o tema CSS.

---

## 15. UI/CSS

- Variáveis em `:root` (`--bg`, `--surface`, `--blue-*` = cor de interação, `--orange-*` = cor do narrador). Os nomes vêm de um projeto anterior (Sistema Shinobi) e foram **mantidos** para não reescrever o HTML — ao portar, renomeie com calma ou só troque os valores.
- Lateral **redimensionável** (alça de 9 px, `--side-w` no `#app`, largura salva em `localStorage`, duplo clique volta ao padrão, botão "expandir" para metade da tela). Em ≤ 860 px vira gaveta inferior (`side-open`).
- Ícones: Phosphor (CDN). Fontes: Google Fonts.
- Toasts: `toast(msg, iconeOuEmoji)` — se o 2º argumento casa `/^[a-z-]+$/` vira ícone Phosphor.
- `esc()` em **todo** dado de usuário que entra em template string (nome, texto, URLs) — a mesa é toda `innerHTML`.

---

## 16. Segurança — leia antes de reaproveitar

Hoje a mesa tem um modelo **"confiança na interface"**:

- Chave **anon** no cliente, **sem RLS por usuário**, e `user_id` vem do `localStorage`. Qualquer pessoa que abra o console pode agir como outro usuário, ler rolagens "secretas" e mover tokens alheios.
- Filtros como `podeVerRolagem`, `podeMover`, "notas só do narrador" e "barras ocultas" são **apenas visuais**.
- Para um projeto novo com mais exposição: use **Supabase Auth**, RLS por `mesa_membros`/`owner`, e funções `SECURITY DEFINER` para operações privilegiadas (`entrar_mesa`, rolagem secreta, expulsar jogador).
- Não commite chaves de serviço. (A chave anon é pública por design, mas **não é segredo de acesso** quando o RLS está aberto.)

---

## 17. Checklist para portar para outro projeto

1. **Banco:** crie as 7 tabelas da seção 4, adicione-as à publicação `supabase_realtime`, crie o bucket público `mesa` e a RPC `entrar_mesa`. Ative RLS decentemente (seção 16).
2. **Identidade:** reescreva `nuvem-hxh.js` mantendo a interface `window.Nuvem` (seção 3). Defina de onde vêm `user.id`, `papel` e `perfis()`.
3. **Copie** `mesa.html`, `assets/mapgen.js`, `assets/blocos.js`, `assets/hxh-mesa.css` (genéricos). Remova os `<script>` de `../js/data/*` se não tiver bestiário/ficha do HxH.
4. **Remova ou substitua** o que é HxH: `aura`, `reacoes`, `principios`, `REACOES`, `BESTIARY_DATA`, `resumo`, `auraHTML`, `nenHTML`, classes de Nen, filtros SVG de aura.
5. **Ajuste regras:** `distQ` (diagonais e metros por quadrado), bônus de iniciativa, tamanho de criaturas, `CELL`.
6. **Teste com 2 navegadores** (um GM, um jogador): mover token (broadcast + persistência), trocar o que é exibido, rolar dado secreto, `@menção`, trilha sincronizada, apagar token/cena (ver aviso do DELETE na seção 4).
7. Escolha o que cortar para uma 1ª versão enxuta: **mapa + tokens + dados + Realtime** já formam o núcleo; chat, iniciativa, trilha, bestiário e gerador de mapas são módulos independentes.

---

## 18. Armadilhas já encontradas (histórico do código)

- Token **virava quadrado sozinho** após aparecer certo: a linha do Realtime chegava sem `tam_y` (coluna ainda inexistente) → merge defensivo (seção 6).
- Navegador **selecionava tokens ao arrastar** o mapa → `dragstart.preventDefault()` + limpar `getSelection()`.
- Mudar proporção do mapa **apagava a imagem** → upsert exige reenviar `fundo_url` e `config`.
- **Grid preto invisível** em battlemap escuro → opção de cor do grid + grid em duas camadas.
- Painel do token **cobria o mapa no celular** → clicar só seleciona; abrir ficha é ação explícita.
- Dois ataques seguidos **sobrepunham a animação de dado** → fila com tempo mínimo por rolagem.
- Autoplay de áudio **bloqueado** → detecção em 2 s + botão "Tocar".
- Ouvir o próprio dado a cada clique **cansava** → som só para rolagens de outros.
- Slider do grid **gravando a cada pixel** → atualiza a tela no `input` e grava no `change`.

---

## 19. Onde olhar no código (referência rápida, `mesa/mesa.html`)

| Assunto | Função / trecho |
|---|---|
| Lobby, criar/entrar | `lobby`, RPC `entrar_mesa` |
| Abrir mesa | `abrirMesa`, `carregarPerfis`, `montarMesa` |
| Realtime | `assinar`, `assinarChat` |
| Câmera/zoom/grid | `aplicarCam`, `zoomEm`, `gridCfg`, `aplicarGridArea`, `centralizar`, `toWorld` |
| Tokens | `tokenHTML`, `renderTokens`, `atualizarToken`, `onDown/onMove/onUp`, `centroLivre` |
| Régua/ping | `distQ`, `rotaSVG`, `desenharOverlay`, `enviarRegua`, `onPing` |
| Iniciativa | `ordem`, `salvarIni`, `salvarTurno`, `passarTurno`, `renderOrdem` |
| Dados | `parseRolagem`, `d20Modo`, `gravarRolagem`, `rolar`, `rolarD20`, `renderDiceToast`, `dadoSVG` |
| Chat | `paneChat`, `enviarMsg`, `renderChatList`, `ligarMencao`, `Avisos` |
| Trilha | `aplicarTrilha`, `sincronizar`, `posAgora`, `salvarTrilha`, `paneTrilha` |
| Cenas/Mapa | `paneCenas`, `exibir`, `paneMapa`, `salvarMapa`, `abrirCriador` |
| Bestiário | `paneBest`, `colocarBest`, `bestAcoes`, `bestDe` |
