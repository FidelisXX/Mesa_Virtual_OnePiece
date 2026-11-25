# Ligar a Mesa dos Mares ao Supabase

## 1. Criar o projeto e o banco
1. Em supabase.com, crie um projeto (região mais perto de quem joga).
2. **Authentication → Sign In / Providers**:
   - **Email**: deixe habilitado e **desligue "Confirm email"**. O jogo cria o login só com usuário e senha (o usuário vira um e-mail interno, `usuario@mesadosmares.app`, que não recebe mensagem). Com "Confirm email" ligado, ninguém consegue criar conta.
   - **Anonymous Sign-Ins**: habilite. É o que o botão "Entrar como convidado" usa.
3. **SQL Editor** → cole todo o `schema.sql` → **Run**. Pode rodar de novo sem estragar nada.
4. **Project Settings → API**: copie a *Project URL* e a *anon public key*.

## 2. Ligar o jogo
1. Copie `supabase-config.example.js` para `supabase-config.js` (fica fora do git) e preencha `url`, `anonKey` e, se o jogo estiver hospedado, `siteUrl`.
2. Abra o jogo. Sem esse arquivo, ele continua no modo de antes (arquivo ou servidor local). Com ele, o jogo usa o Supabase no lugar de `server/narrador.js` para guardar e repassar as mesas.
3. Crie uma mesa → Convidar. O link vira `siteUrl/?convite=CÓDIGO`.

## 3. Para o celular entrar
O Supabase guarda os dados, mas **o jogo (HTML/JS) precisa estar numa página que o celular abra**. Opções: hospedar a pasta do jogo (Netlify, Vercel, GitHub Pages, Cloudflare Pages) e pôr o endereço em `siteUrl`. A chave da IA (Gemini) continua só no `server/narrador.js`; hospedado, o narrador de IA precisa de um servidor ou de uma Edge Function (próximo passo).

## Se aparecer "permission denied for table mesas"
O Supabase não libera sozinho, para a API, as tabelas criadas no SQL Editor. Rode de novo o `schema.sql` (a versão atual já traz os `GRANT`): pode rodar quantas vezes quiser. Só o bloco "Permissões das tabelas" já resolve.

## Contas
Com o Supabase ligado, o login é o **Supabase Auth**: usuário (3 a 24 letras, números, `.`, `-` ou `_`) e senha (6 ou mais). A conta vale em qualquer aparelho e a senha fica guardada pelo Supabase (não no navegador). O nome e a roleta de raças raras ficam no perfil da conta (`user_metadata`). O convidado entra de forma anônima e não guarda nada fora do aparelho.
- Mesas criadas antes (por sessão anônima) não aparecem para a conta nova: a conta tem outro identificador. Crie a mesa de novo com a conta.
- Esqueci a senha: ainda não há recuperação (não há e-mail de verdade). Para trocar, apague o usuário em Authentication → Users e crie de novo.
- Sem o Supabase (arquivo ou servidor local), as contas continuam locais, como antes.

## Como os dados ficam
| Tabela | O que guarda |
|---|---|
| `mesas` | cada mesa: id, código do convite, nome, dono, JSON da mesa |
| `mesa_membros` | quem pode ver cada mesa |
| `linhas` | tudo que é da mesa: `chars`, `tokens`, `msgs`, `ships`, `combat`, `naval`, `islandCfg`, `missions`, `world`, `cargos` (conteúdo em JSON) |

Segurança (RLS): só membros leem e gravam nas linhas da mesa. Nenhum `insert` direto em `mesas` ou `mesa_membros`; só as funções `salvar_mesa`, `entrar_mesa` e `sair_mesa`. A chave `service_role` nunca vai no jogo.

## O que ainda NÃO está ligado (próximos passos)
- **Segredos de rolagem do Mestre** e o sigilo de sussurros ainda não são protegidos no banco (qualquer membro lê todas as linhas da mesa).
- **Narrador de IA hospedado**: mover `server/narrador.js` para uma Edge Function (a chave fica em *Secrets*).
- Ao voltar de uma queda de rede, o jogo não busca de novo o que perdeu (o servidor local faz isso).
- **LGPD**: contas e nomes de usuário são dados pessoais (o jogo não pede e-mail). Antes de usar com pessoas reais, avise o time de Segurança da Informação (seginfo@gcb.com.br).

## Testado
O adaptador (`js/supabase.js`) foi testado contra um cliente Supabase simulado: gravar, apagar, limpar chat, remontar o estado, receber mudanças dos outros sem o próprio eco, movimento ao vivo e convite. **Não foi testado contra um projeto Supabase de verdade** (nenhum foi informado aqui). Na primeira vez, rode o SQL, abra duas abas e confira se o chat e o token aparecem nas duas.
