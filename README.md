# Vouga OS

Fundação técnica da primeira versão fechada do sistema operativo interno da Vouga.

## Requisitos

- Bun 1.3.14
- um projeto Supabase com registo público desativado
- founders provisionados manualmente em Supabase Auth

## Configuração local

```bash
bun install
cp .env.example .env.local
bun run dev
```

Preenche em `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

A publishable key é própria para uso no cliente. Não coloques uma `service_role` key na aplicação web.

A aplicação fica disponível em [http://localhost:3000](http://localhost:3000). Sem as variáveis de ambiente, o login apresenta um estado de configuração seguro e permanece desativado.

## Base de dados

As migrations oficiais vivem em `supabase/migrations/` e devem ser aplicadas por ordem ao projeto configurado antes de executar fluxos funcionais.

O primeiro schema funcional é `20260715190000_create_companies.sql`. Cria:

- suporte mínimo de Members sincronizado com Supabase Auth;
- Companies e constraints do domínio;
- validação de owner ativo;
- RLS para utilizadores autenticados;
- ausência de acesso anónimo e de eliminação física pela aplicação.

`20260715230000_create_meetings.sql` acrescenta:

- Meetings, participantes subordinados e relações tipadas com Companies;
- constraints temporais, de identificação exclusiva e de fecho;
- escrita transacional do agregado Meeting;
- RLS para utilizadores autenticados e rejeição de acesso anónimo.

`20260715233000_fix_meeting_member_triggers.sql` separa a validação de closer e participantes internos por tabela.

`20260716003000_create_tasks.sql` acrescenta:

- Tasks com owner, origem primária imutável e cinco estados;
- relações tipadas com Companies e Meetings, sem cópias;
- constraints condicionais de bloqueio e conclusão;
- escrita transacional do agregado e RLS autenticada.

`20260716030000_create_decisions.sql` acrescenta:

- Decisions imutáveis com escolha, motivo, impacto, autoridade e origem opcional numa Meeting;
- cadeia histórica explícita para substituir, limitar ou revogar uma escolha anterior;
- relações tipadas com Companies, Meetings e Tasks;
- origem Decision em Tasks através de referência concreta e constraint exclusiva;
- escrita transacional autenticada, RLS e ausência de edição retroativa.

## Qualidade

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## Fronteiras atuais

- `src/app`: apresentação, layouts e rotas Next.js;
- `src/application`: coordenação de casos de uso;
- `src/domain`: entidades, invariantes e estados aprovados;
- `src/persistence`: adaptadores concretos de persistência e autenticação;
- `src/projections`: contratos de leitura derivados sem escrita própria;
- `src/foundation`: configuração, navegação e elementos transversais mínimos.

O incremento atual inclui Companies, Meetings, Tasks e Decisions. Não inclui Contacts, pipeline, Sprints, Roadmap, Products, Dashboard, Context Engine, calendário externo, IA ou APIs de domínio.
