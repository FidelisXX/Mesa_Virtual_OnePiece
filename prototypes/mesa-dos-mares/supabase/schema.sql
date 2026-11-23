-- PROTOTYPE - NOT FOR PRODUCTION
-- Mesa dos Mares: banco no Supabase.
-- Como usar: Supabase > SQL Editor > cole este arquivo inteiro > Run. Pode rodar de novo sem estragar nada.
-- Antes: Authentication > Providers > habilite "Allow anonymous sign-ins".
--
-- Ideia: a mesa é uma sala. Quem entra por convite vira membro (mesa_membros) e só os membros leem
-- e escrevem nas linhas daquela mesa (RLS). Cada tabela do jogo (chars, tokens, msgs, ships...) vira
-- linhas de uma tabela só, `linhas`, com o conteúdo em JSON: o jogo pode ganhar tabelas novas sem migração.

create extension if not exists pgcrypto;

-- ---------- Tabelas ----------
create table if not exists public.mesas (
  id        text primary key,                         -- o mesmo id que o jogo usa
  codigo    text not null unique check (codigo ~ '^[A-Z0-9]{6}$'),   -- o convite
  nome      text not null check (char_length(nome) between 1 and 40),
  dono      uuid not null default auth.uid(),
  dados     jsonb not null,                           -- a mesa como o jogo a vê (nome, codigo, owner, membros...)
  criada    timestamptz not null default now()
);

create table if not exists public.mesa_membros (
  mesa_id    text not null references public.mesas(id) on delete cascade,
  usuario_id uuid not null,
  entrou     timestamptz not null default now(),
  primary key (mesa_id, usuario_id)
);
create index if not exists mesa_membros_usuario on public.mesa_membros (usuario_id);

create table if not exists public.linhas (
  mesa_id    text not null references public.mesas(id) on delete cascade,
  tabela     text not null check (tabela in ('chars','tokens','msgs','combat','naval','ships','islandCfg','missions','world','cargos')),
  chave      text not null,                            -- id da linha; '_' quando a tabela inteira é uma linha só (world, cargos)
  dados      jsonb not null,
  origem     text,                                     -- o aparelho que gravou (para ele ignorar o próprio eco)
  atualizado timestamptz not null default now(),
  primary key (mesa_id, tabela, chave)
);
create index if not exists linhas_mesa_tabela on public.linhas (mesa_id, tabela);

-- ---------- Ajudantes (security definer: evitam recursão nas políticas) ----------
create or replace function public.eh_membro(p_mesa text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mesa_membros m where m.mesa_id = p_mesa and m.usuario_id = auth.uid());
$$;

-- Cria a mesa (ou, se já existe e você é membro, atualiza o JSON dela).
create or replace function public.salvar_mesa(p_id text, p_nome text, p_codigo text, p_dados jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'entre primeiro'; end if;
  if exists (select 1 from public.mesas where id = p_id) then
    if not public.eh_membro(p_id) then raise exception 'você não é membro dessa mesa'; end if;
    update public.mesas set nome = left(p_nome, 40), dados = p_dados where id = p_id;
  else
    insert into public.mesas (id, codigo, nome, dono, dados) values (p_id, upper(p_codigo), left(p_nome, 40), auth.uid(), p_dados);
    insert into public.mesa_membros (mesa_id, usuario_id) values (p_id, auth.uid());
  end if;
end $$;

-- Entra numa mesa pelo código do convite; devolve o JSON da mesa (ou nulo se o código não existe).
create or replace function public.entrar_mesa(p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.mesas;
begin
  if auth.uid() is null then raise exception 'entre primeiro'; end if;
  select * into m from public.mesas where codigo = upper(regexp_replace(p_codigo, '[^A-Za-z0-9]', '', 'g'));
  if not found then return null; end if;
  insert into public.mesa_membros (mesa_id, usuario_id) values (m.id, auth.uid()) on conflict do nothing;
  return m.dados;
end $$;

create or replace function public.sair_mesa(p_mesa text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.mesas where id = p_mesa and dono = auth.uid()) then raise exception 'o dono não sai: apague a mesa'; end if;
  delete from public.mesa_membros where mesa_id = p_mesa and usuario_id = auth.uid();
end $$;

-- ---------- Segurança por linha (RLS) ----------
alter table public.mesas         enable row level security;
alter table public.mesa_membros  enable row level security;
alter table public.linhas        enable row level security;

drop policy if exists mesas_ler      on public.mesas;
drop policy if exists mesas_apagar   on public.mesas;
drop policy if exists membros_ler    on public.mesa_membros;
drop policy if exists linhas_ler     on public.linhas;
drop policy if exists linhas_gravar  on public.linhas;
drop policy if exists linhas_mudar   on public.linhas;
drop policy if exists linhas_apagar  on public.linhas;

create policy mesas_ler     on public.mesas        for select using (public.eh_membro(id));
create policy mesas_apagar  on public.mesas        for delete using (dono = auth.uid());
create policy membros_ler   on public.mesa_membros for select using (public.eh_membro(mesa_id));
create policy linhas_ler    on public.linhas for select using (public.eh_membro(mesa_id));
create policy linhas_gravar on public.linhas for insert with check (public.eh_membro(mesa_id));
create policy linhas_mudar  on public.linhas for update using (public.eh_membro(mesa_id)) with check (public.eh_membro(mesa_id));
create policy linhas_apagar on public.linhas for delete using (public.eh_membro(mesa_id));
-- mesas e mesa_membros só mudam pelas funções acima: não há política de insert/update direto.

revoke all on function public.salvar_mesa(text, text, text, jsonb) from public, anon;
revoke all on function public.entrar_mesa(text) from public, anon;
revoke all on function public.sair_mesa(text) from public, anon;
grant execute on function public.salvar_mesa(text, text, text, jsonb) to authenticated;
grant execute on function public.entrar_mesa(text) to authenticated;
grant execute on function public.sair_mesa(text) to authenticated;
-- Quem entra de forma anônima no Supabase tem o papel "authenticated"; "anon" é quem nem entrou.

-- ---------- Tempo real ----------
do $$ begin
  begin alter publication supabase_realtime add table public.linhas; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.mesas;  exception when duplicate_object then null; end;
end $$;

-- ---------- Limpeza opcional: guarda só as mensagens mais novas de cada mesa ----------
create or replace function public.podar_mensagens(p_mesa text, p_max int default 800) returns void
language sql security definer set search_path = public as $$
  delete from public.linhas l where l.mesa_id = p_mesa and l.tabela = 'msgs' and l.chave in (
    select chave from public.linhas where mesa_id = p_mesa and tabela = 'msgs'
    order by (dados->>'ts')::bigint desc offset p_max);
$$;
revoke all on function public.podar_mensagens(text, int) from public, anon, authenticated;
