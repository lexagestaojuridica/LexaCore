# ARCHITECTURE.md - Guia de Arquitetura LEXA v3.5

## Visão Geral

O LEXA v3.5 adota **Feature-Sliced Design (FSD)** para o frontend, **tRPC** para comunicação type-safe, e **Supabase** (Postgres + RLS + Edge Functions) para a camada de persistência e lógica de borda. A autenticação e multitenancy são geridas pelo **Clerk**. O deploy é realizado via **Vercel**.

---

## Feature-Sliced Design (FSD)

Cada funcionalidade reside em `src/features/` e segue uma estrutura rígida:

```text
src/features/<feature>/
├── components/          # UI components locais
├── hooks/               # Custom hooks (usando useQuery/useMutation)
├── pages/               # Containers de página (exportados para /app)
├── types/               # Definições TypeScript específicas
├── utils/               # Lógica de negócio isolada
└── __tests__/           # Testes unitários (Vitest)
```

**Isolamento:**

- Dependências entre features são PROIBIDAS.
- Componentes reutilizáveis devem residir em `src/shared/ui/`.
- Lógica comum deve residir em `src/shared/lib/` ou `src/shared/api/`.

---

## Camadas da Arquitetura

1. **App Layer (Next.js 15)**: Gerencia rotas, layouts globais e provedores.
2. **Widgets Layer**: Componentes complexos que combinam múltiplas features (ex: `Sidebar`, `TopBar`).
3. **Features Layer**: Onde a lógica de negócio principal reside.
4. **Shared Layer**: Fundamentos do sistema (Design System, Utils, Tipos Globais).
5. **Data Layer**: tRPC (Internal API) + Supabase JS Client.

---

## Fluxo de Autenticação e Multitenancy

O LEXA é **Multi-tenant por design**:

1. **Clerk**: Única fonte de verdade para Auth.
2. **JWT Custom claims**: O JWT do Clerk contém `org_id`.
3. **Supabase RLS**: O banco de dados valida o `org_id` em cada query.
    - O frontend envia o token do Clerk no header `Authorization`.
    - Políticas RLS verificam `organization_id = auth.jwt() ->> 'org_id'`.

---

## Gestão de Débito Técnico

A partir da v3.5, adotamos uma postura rigorosa contra o débito técnico:

1. **100% Type Safety**: Proibido o uso de `any` ou `@ts-ignore` (salvo casos extremos documentados).
2. **Consolidação de API**: Migração progressiva de chamadas diretas do SDK para tRPC.
3. **Audit Logs**: Toda alteração crítica de esquema ou RLS deve ser acompanhada de uma migration documentada em `supabase/migrations/`.
4. **Relatório de Débito**: Veja `docs/TECH_DEBT.md` para o mapeamento atual e planos de remediação.

---

## ADRs Ativos (Architectural Decision Records)

### ADR-001: tRPC como API Principal

- **Status:** Implementado.
- **Contexto:** Necessidade de sincronia de tipos entre backend e frontend sem gerar código extra.

### ADR-002: Edge Functions para I/O Externo

- **Status:** Ativo.
- **Contexto:** Calendar Sync (Google/Apple), Webhooks (WhatsApp/Asaas) devem ser processados via Edge Functions para evitar sobrecarga no servidor principal.

### ADR-003: Shadcn UI + Tailwind v3

- **Status:** Ativo.
- **Contexto:** Baseado em Radix UI para acessibilidade e Tailwind para estilização rápida e coesa.
