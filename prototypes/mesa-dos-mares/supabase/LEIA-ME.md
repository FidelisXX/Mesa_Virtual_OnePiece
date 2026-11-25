# Ligar a Mesa dos Mares ao Supabase

## 1. Criar o projeto e o banco
1. Em supabase.com, crie um projeto (região mais perto de quem joga).
2. **Authentication → Providers → Anonymous Sign-Ins → habilite.** (Quem entra na mesa usa uma sessão anônima; o acesso é dado pela mesa.)
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

## Como os dados ficam
| Tabela | O que guarda |
|---|---|
| `mesas` | cada mesa: id, código do convite, nome, dono, JSON da mesa |
| `mesa_membros` | quem pode ver cada mesa |
| `linhas` | tudo que é da mesa: `chars`, `tokens`, `msgs`, `ships`, `combat`, `naval`, `islandCfg`, `missions`, `world`, `cargos` (conteúdo em JSON) |

Segurança (RLS): só membros leem e gravam nas linhas da mesa. Nenhum `insert` direto em `mesas` ou `mesa_membros`; só as funções `salvar_mesa`, `entrar_mesa` e `sair_mesa`. A chave `service_role` nunca vai no jogo.

## O que ainda NÃO está ligado (próximos passos)
- **Contas e senhas ainda são locais** (neste navegador). Passo seguinte: Supabase Auth (e-mail/senha) no lugar do `Acc`, com uma tabela `perfis`. Até lá, em outro aparelho a pessoa cria a conta de novo e entra pelo convite.
- **Segredos de rolagem do Mestre** e o sigilo de sussurros ainda não são protegidos no banco (qualquer membro lê todas as linhas da mesa).
- **Narrador de IA hospedado**: mover `server/narrador.js` para uma Edge Function (a chave fica em *Secrets*).
- Ao voltar de uma queda de rede, o jogo não busca de novo o que perdeu (o servidor local faz isso).
- **LGPD**: contas, nomes de usuário e (depois) e-mails são dados pessoais. Antes de usar com pessoas reais, avise o time de Segurança da Informação (seginfo@gcb.com.br).

## Testado
O adaptador (`js/supabase.js`) foi testado contra um cliente Supabase simulado: gravar, apagar, limpar chat, remontar o estado, receber mudanças dos outros sem o próprio eco, movimento ao vivo e convite. **Não foi testado contra um projeto Supabase de verdade** (nenhum foi informado aqui). Na primeira vez, rode o SQL, abra duas abas e confira se o chat e o token aparecem nas duas.
