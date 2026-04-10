# SPECS.md - Especificações Técnicas do Projeto LEXA (v3.5)

## 1. Visão Geral da Arquitetura

O LEXA opera sob arquitetura **Next.js 15 (App Router)** com backend-as-a-service provido pelo **Supabase**. Autenticação e gestão de usuários são providas pelo **Clerk**. Frontend e serverless functions são implantados na **Vercel** (Projeto: `lexacore`, Scope: `lexagestaojuridica-7277s-projects`). O **Supabase (PostgreSQL)** atua como banco de dados principal com RLS nativo para multitenancy.

**Princípio central: Feature-Sliced Design (FSD) + Clean Architecture + Zero Acoplamento.**

---

## 2. Tecnologias Utilizadas

| Camada | Tecnologia |
| :--- | :--- |
| Frontend | Next.js 15 (App Router), React 18, TypeScript 5 (strict) |
| Estilização | Tailwind CSS, shadcn-ui (Radix UI), framer-motion |
| Estado/Dados | TanStack React Query, react-hook-form + zod |
| Autenticação | **Clerk** (Auth, RBAC, Organizações) |
| Backend/DB | **Supabase** (PostgreSQL 15+), Vercel Edge Functions |
| Pagamentos | **Asaas** (via Vercel Edge Functions) |
| Testes | Vitest, React Testing Library, Cypress (E2E) |
| CI/CD | GitHub Actions → Vercel |
| Ícones | lucide-react |
| Charts | Recharts |
| i18n | i18next, react-i18next |
| Editor | TipTap (WYSIWYG) |
| PDF | jspdf, html2canvas |

---

## 3. Schema do Banco de Dados (Supabase / PostgreSQL 15+)

Domínios modelados (45+ migrations):

- **Core:** `processos_juridicos`, `clientes`, `unidades`
- **HR & Timesheet:** `hr_core_schema`, `timesheet_entries`, `timesheet_timer_logs`, `employees`
- **Workflow:** `crm`, `automations`, `document_signatures`
- **Financeiro:** `orcamentos`, gateways, fluxos de despesa/receita
- **Segurança:** `universal_audit_logs`, `legal_deadlines_security`

**Multitenancy:** RLS (Row Level Security) diretamente no PostgreSQL, com `user_id` do Clerk mapeado via JWT claims.

---

## 4. APIs e Integrações

- **Supabase Client:** `@supabase/supabase-js` com JWT do Clerk via template `supabase`
- **Asaas:** Gateway de pagamento via Hostinger Edge Functions
- **Clerk:** Auth, RBAC, Organizations, Webhooks
- **Calendários:** Google Calendar, Microsoft Calendar, Apple Calendar (via Vercel Edge Functions)
- **WhatsApp:** Integração nativa para notificações e triggers
- **Armazenamento:** Supabase Storage (GED)

---

## 5. Segurança

- **Auth:** Clerk JWT, SSO, Social Logins, MFA
- **RBAC:** Clerk Organizations com roles e permissões
- **RLS:** PostgreSQL Row Level Security validando `tenant_id` e `user_id`
- **Auditoria:** Triggers de `universal_audit_logs` em todas as mutações
- **LGPD:** Logs exportáveis, direito ao esquecimento, consentimento
- **Validação:** Zod schemas em todas as entradas (front + edge functions)
- **XSS/CSRF:** DOMPurify, headers CSP, CSRF tokens

---

## 6. Infraestrutura e DevOps

- **CI/CD:** GitHub Actions → testes → build → deploy Vercel
- **Ambientes:** Development, Staging, Production
- **Migrations:** Supabase CLI, versionadas por data/hora
- **Monitoramento:** Logs na Vercel, alertas de performance
- **Performance:** Code-splitting Next.js, Vercel Edge Functions, Global Edge Network

---

## 7. Estrutura de Pastas (Feature-Sliced Design)

```text
src/
├── app/                     # Next.js App Router (pages, layouts, API routes)
│   ├── api/                 # API routes (tRPC, webhooks)
│   ├── auth/                # Páginas de autenticação
│   ├── dashboard/           # Páginas do dashboard por feature
│   └── portal/              # Portal do cliente
├── features/                # Lógica de negócio desacoplada por domínio
│   ├── admin/               # Feature: Admin HQ
│   ├── agenda/              # Feature: Agenda
│   ├── auth/                # Feature: Autenticação (Clerk)
│   ├── bi/                  # Feature: Business Intelligence
│   ├── chat/                # Feature: Chat
│   ├── clientes/            # Feature: Clientes
│   ├── configuracoes/       # Feature: Configurações
│   ├── crm/                 # Feature: CRM
│   ├── financeiro/          # Feature: Financeiro
│   ├── minutas/             # Feature: Minutas/Documentos
│   ├── noticias/            # Feature: Notícias
│   ├── processos/           # Feature: Processos Jurídicos
│   ├── rh/                  # Feature: Recursos Humanos
│   ├── timesheet/           # Feature: Timesheet
│   └── workflow/            # Feature: Workflow
├── integrations/            # Clientes externos e hooks React Query
│   ├── supabase/            # Cliente Supabase + RLS + tipos
│   ├── clerk/               # Cliente Clerk + contexto
│   └── asaas/               # Gateway Asaas
├── shared/                  # Utilitários compartilhados
│   ├── components/          # Componentes reutilizáveis (sem lógica de negócio)
│   ├── constants/           # Constantes de negócio
│   ├── hooks/               # Custom hooks genéricos
│   ├── lib/                 # Bibliotecas e helpers
│   ├── types/               # TypeScript types centralizados
│   ├── ui/                  # shadcn-ui components
│   └── validators/          # Zod schemas de validação
├── server/                  # tRPC routers e contexto
├── test/                    # Setup de testes (Vitest, RTL)
└── widgets/                 # Componentes de layout (Sidebar, TopBar)
```

---

## 8. Padrões de Código

- **TypeScript:** `strict: true` em todo o projeto
- **Validação:** Zod em todas as entradas (forms, API, DB)
- **Acesso a dados:** React Query + Supabase Client (nunca queries diretas sem auth)
- **Formulários:** react-hook-form + @hookform/resolvers/zod
- **Componentes:** shadcn-ui base, sem lógica de negócio em UI atoms
- **Imports:** Path aliases `@/*` para `src/*`
- **Naming:** camelCase para vars/funcs, PascalCase para components/types, SCREAMING_SNAKE_CASE para constants
- **Testes:** Cobertura mínima de 80% em features críticas

---

## 9. Variáveis de Ambiente

Consultar `.env.example` para a lista completa. Principais:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...

# Asaas
ASAAS_API_KEY=...
ASAAS_ENVIRONMENT=sandbox|production
```
