# Mesa dos Mares no Vercel (opmesa.vercel.app)

O Vercel serve o jogo (arquivos estáticos) e roda o narrador de IA como função de servidor. O Supabase guarda as mesas e repassa o tempo real (veja `supabase/LEIA-ME.md`).

```
celular / computador ──► opmesa.vercel.app ──► /api/narrar ──► Gemini   (a chave fica no Vercel)
          └──────────────► Supabase (mesas, chat, fichas, tokens em tempo real)
```

## 1. Ligar o projeto
1. No Vercel: o projeto `opmesa` → **Settings → Git** → conecte o repositório (`Mesa_Virtual_OnePiece`).
2. **Settings → General → Root Directory:** `prototypes/mesa-dos-mares` (é onde está o `vercel.json`).
3. Deixe *Framework Preset* em **Other**. Os comandos de build já vêm do `vercel.json` (`node scripts/vercel-build.js`, saída em `dist/`).

## 2. Variáveis de ambiente (Settings → Environment Variables, em Production e Preview)
| Variável | Valor | Para quê |
|---|---|---|
| `SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` | o jogo achar o banco |
| `SUPABASE_ANON_KEY` | a chave **pública** (anon / publishable) | idem. **Nunca a `service_role`**: o build recusa |
| `GEMINI_API_KEY` | a chave do Google AI Studio | o narrador de IA (só a função lê; não vai ao navegador) |
| `GEMINI_MODEL` | opcional (padrão `gemini-flash-lite-latest`) | trocar o modelo |
| `SITE_URL` | opcional (padrão `https://opmesa.vercel.app`) | o endereço no link do convite |
| `NARRADOR_POR_MINUTO` | opcional (padrão 8) | limite de chamadas à IA por mesa por minuto |

Mudou uma variável? Faça um novo deploy (Deployments → ⋯ → Redeploy).

## 3. Como o narrador é protegido
`/narrar` custa tokens da sua chave, então ele só atende:
- chamadas vindas da própria página do site (confere a origem);
- com o Supabase ligado, **só quem é membro da mesa**: a função manda o token do jogador ao Supabase e só segue se a mesa for visível para ele (a RLS decide);
- no máximo `NARRADOR_POR_MINUTO` chamadas por mesa a cada minuto.

O formulário "Chave da IA" do jogo não funciona hospedado (responde que a chave fica no painel do Vercel).

## 4. Testar
1. Abra `https://opmesa.vercel.app/saude`: deve mostrar `{"ok":true,...,"vercel":true}`.
2. Entre no jogo, crie uma mesa, **Convidar**: o link vira `https://opmesa.vercel.app/?convite=CÓDIGO`. Abra no celular.
3. Escreva algo e toque em **Chamar o narrador**.

## Limites desta etapa
- O Vercel **não** roda `server/narrador.js` (servidor local); a mesa em rede do computador (`--lan`) e o Vercel são alternativas. Com `supabase-config.js` válido o jogo usa o Supabase onde estiver.
- Preview deployments (branches) usam as mesmas variáveis; mesas de teste e de verdade ficam no mesmo banco.
- A função e o build foram testados aqui só localmente (função com pedidos simulados, build gerando `dist/`). **Nenhum deploy foi feito.**
