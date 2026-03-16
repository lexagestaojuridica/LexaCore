# DEVELOPMENT.md - Guia de Desenvolvimento Local

## Pré-requisitos

- Node.js 20+ (recomendado: via [nvm](https://github.com/nvm-sh/nvm))
- npm ou bun
- Conta no [Clerk](https://clerk.com) (auth)
- Projeto no [Supabase](https://supabase.com) (banco de dados)
- Supabase CLI: `npm install -g supabase`

---

## Configuração Inicial

### 1. Clonar o repositório

```bash
git clone https://github.com/Guiilhermerodriiguess/lexanova-core.git
cd lexanova-core
```

### 2. Instalar dependências

```bash
npm install
# ou
bun install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

```bash
# Clerk - https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase - https://app.supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Asaas (opcional para desenvolvimento)
ASAAS_API_KEY=...
ASAAS_ENVIRONMENT=sandbox
```

### 4. Configurar o Supabase

```bash
# Iniciar Supabase local (opcional)
supabase start

# Aplicar migrations no projeto remoto
supabase db push

# Ou aplicar migrations localmente
supabase db reset
```

### 5. Iniciar servidor de desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | Verificação de linting |
| `npm run test` | Executar testes unitários (Vitest) |
| `npm run test:watch` | Testes em modo watch |

---

## Estrutura de Feature

Para criar uma nova feature, siga o padrão FSD:

```bash
src/features/<nome-da-feature>/
├── components/          # UI components da feature
├── hooks/               # Custom hooks
├── pages/               # Page components (containers)
├── types/               # TypeScript types
├── utils/               # Funções utilitárias
└── __tests__/           # Testes unitários e de integração
```

**Exemplo:**

```typescript
// src/features/processos/hooks/useProcessos.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

## Testes

### Unitários e Integração (Vitest + RTL)

```bash
# Executar todos os testes
npm run test

# Executar em modo watch
npm run test:watch

# Executar um arquivo específico
npx vitest run src/features/processos/__tests__/useProcessos.test.ts
```

### E2E (Cypress)

```bash
# Instalar Cypress (apenas uma vez)
npx cypress install

# Abrir Cypress UI
npx cypress open

# Executar E2E em modo headless
npx cypress run
```

---

## Banco de Dados

### Criar nova migration

```bash
supabase migration new <nome-da-migration>
```

### Aplicar migrations

```bash
# Local
supabase db reset

# Remoto (Staging/Production)
supabase db push
```

### Gerar tipos TypeScript

```bash
supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
```

---

## CI/CD

O projeto usa **GitHub Actions** para CI/CD automático:

- `ci.yml`: Lint + Testes + Build em cada PR
- `quality-gate.yml`: Verificação de cobertura de testes
- `security-scan.yml`: Análise de segurança (dependências)

O deploy é feito automaticamente na **Hostinger** após merge na branch `main`.

---

## Solução de Problemas

### Erro: Missing Supabase environment variables
Verifique se `.env.local` existe e contém `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### Erro: Clerk not configured
Verifique `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` no `.env.local`.

### Erro: RLS violation
O usuário não tem permissão para acessar esse dado. Verifique as políticas RLS no Supabase Dashboard.
