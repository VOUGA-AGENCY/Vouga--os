# Vouga OS

Sistema operativo interno da Vouga Agency. Front-end limpo (React + TanStack Start + Tailwind + shadcn/ui), pronto para ligar a um Supabase próprio.

## Correr localmente

```bash
npm install
npm run dev
```

Abre o endereço que o terminal imprime (tipicamente http://localhost:3000).

## Login

Para já a autenticação é local (sem backend). Entra com:

- email: `admin@vouga.com`
- palavra-passe: `vouga123`

## Como funcionam os dados agora

Não há backend ligado. Os dados (tarefas, sprints, leads, custos, eventos, documentos, passos) são guardados em `localStorage` no teu browser, através de um cliente local em `src/integrations/supabase/client.ts` que imita a interface do Supabase. As páginas e a camada de dados (`src/lib/data`) não sabem a diferença.

## Ligar o Supabase mais tarde

A camada de dados está desacoplada. Para passar a um Supabase real:

1. Cria o projeto Supabase e define `.env` (ver `.env.example`).
2. Substitui `src/integrations/supabase/client.ts` pelo `createClient` real do `@supabase/supabase-js`.
3. As tabelas seguem os domínios de `src/lib/data/*` (tasks, sprints, steps, docs, resources, crm/commercial, costs, calendar_events). Nada nas páginas precisa de mudar.
