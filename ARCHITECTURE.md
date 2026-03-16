# ARCHITECTURE.md - Guia de Arquitetura LEXA v3.5

## Visão Geral

O LEXA adota **Feature-Sliced Design (FSD)** combinado com princípios de **Clean Architecture** para garantir desacoplamento total, testabilidade e escalabilidade horizontal.

---

## Feature-Sliced Design (FSD)

Cada feature é uma unidade autônoma e testável. A estrutura segue:

```
src/features/<feature>/
├── components/          # Componentes React da feature
├── hooks/               # Custom hooks (React Query, state)
├── pages/               # Componentes de página (containers)
├── types/               # Tipos TypeScript da feature
├── utils/               # Funções utilitárias da feature
└── __tests__/           # Testes da feature
```

**Regras de isolamento:**
- Features NÃO importam de outras features diretamente.
- Shared entre features vai para `src/shared/`.
- Integrações externas ficam em `src/integrations/`.

---

## Camadas da Arquitetura

```
┌─────────────────────────────────────────┐
│              App Layer (Next.js)         │  Pages, Layouts, API routes
├─────────────────────────────────────────┤
│             Features Layer               │  Business logic por domínio
├─────────────────────────────────────────┤
│             Shared Layer                 │  UI, utils, types, validators
├─────────────────────────────────────────┤
│          Integrations Layer              │  Supabase, Clerk, Asaas
├─────────────────────────────────────────┤
│           Infrastructure                 │  Supabase DB + RLS, Hostinger Edge
└─────────────────────────────────────────┘
```

---

## Fluxo de Dados

```
User Action
    ↓
React Component (feature/components/)
    ↓
Custom Hook (feature/hooks/) — React Query
    ↓
Integration Client (integrations/supabase/)
    ↓
Supabase (PostgreSQL + RLS)
```

Para operações que exigem lógica serverless:

```
Client Hook → tRPC Router → Supabase/Asaas/etc.
```

---

## Multitenancy e Segurança

O LEXA usa **RLS (Row Level Security)** no PostgreSQL para isolamento de dados por tenant:

1. Clerk emite JWT com `org_id` e `user_id`.
2. Next.js middleware valida sessão via `clerkMiddleware`.
3. Supabase client usa JWT do Clerk via template `supabase`.
4. Políticas RLS no PostgreSQL validam `tenant_id = auth.jwt()->'org_id'`.

---

## Padrões de Código

### TypeScript Strict
Todos os arquivos usam TypeScript com `strict: true`. Zero `any` implícito.

### Validação com Zod
```typescript
import { z } from 'zod';

export const ProcessoSchema = z.object({
  numero: z.string().min(1, 'Número obrigatório'),
  titulo: z.string().min(3).max(200),
  status: z.enum(['ativo', 'arquivado', 'suspenso']),
  clienteId: z.string().uuid(),
});

export type Processo = z.infer<typeof ProcessoSchema>;
```

### React Query Pattern
```typescript
export function useProcessos() {
  return useQuery({
    queryKey: ['processos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processos_juridicos')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
}
```

---

## Convenções de Nomeação

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Variáveis/funções | camelCase | `clienteId`, `getProcessos()` |
| Componentes/Types | PascalCase | `ProcessoCard`, `ProcessoType` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE`, `ROLES` |
| Arquivos de componente | PascalCase | `ProcessoCard.tsx` |
| Arquivos de hook | camelCase prefixo `use` | `useProcessos.ts` |
| Arquivos de type | camelCase | `index.ts` em `types/` |

---

## Decisões de Arquitetura (ADRs)

### ADR-001: Feature-Sliced Design
- **Decisão:** Adotar FSD para organização do código.
- **Motivo:** Cada feature é autônoma, facilitando manutenção, onboarding e testes isolados.

### ADR-002: tRPC para API interna
- **Decisão:** Usar tRPC para comunicação type-safe entre frontend e backend.
- **Motivo:** Zero geração de código, type safety end-to-end, integração natural com React Query.

### ADR-003: Clerk para autenticação
- **Decisão:** Usar Clerk em vez de NextAuth ou Supabase Auth.
- **Motivo:** Suporte nativo a organizações (multitenancy), RBAC avançado, UI components prontos.

### ADR-004: Supabase com RLS
- **Decisão:** Toda autorização de dados via RLS no PostgreSQL.
- **Motivo:** Impossível contornar por bug de frontend, performance nativa, auditoria via triggers.
