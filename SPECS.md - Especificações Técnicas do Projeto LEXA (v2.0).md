# SPECS.md - Especificações Técnicas do Projeto LEXA (v2.0)

## 1. Visão Geral da Arquitetura (Marcus - Arquiteto)
O LEXA opera sob uma arquitetura de SPA (Single Page Application) moderna (Client-side) suportada por um poderoso "Backend-as-a-Service" (BaaS) fornecido pelo Supabase. O backend utiliza intensamente os recursos do PostgreSQL, delegando regras de negócio granulares para o banco via RLS (Row Level Security), triggers e Functions. A lógica de interface, controle de estado, validações complexas e regras de exibição ficam a cargo do ecossistema React/Vite. Para gerenciar operações externas (como integrações Asaas/WhatsApp), utilizam-se Edge Functions serverless no Supabase. **A arquitetura é projetada para suportar funcionalidades offline-first em módulos críticos e garantir alta performance e segurança em cenários de multitenancy.**

## 2. Tecnologias Utilizadas
*   **Frontend:** React 18, TypeScript, Vite, React Router DOM v6. **Implementação de PWA (Progressive Web App) para capacidades offline.**
*   **Estilização & UI:** Tailwind CSS, shadcn-ui (Radix UI primitives), framer-motion (animações), lucide-react (ícones).
*   **Gerenciamento de Estado & Dados:** TanStack React Query (SWR patterns), react-hook-form + zod (validação tipada). **Estratégias de cache local para suporte offline.**
*   **Backend & Banco de Dados:** Supabase, PostgreSQL 15+.
*   **Outras:** Recharts para B.I, i18next (internacionalização), tiptap (WYSIWYG editor), jspdf / html2canvas (geração de documentos e relatórios).

## 3. Schema do Banco de Dados (Rafael - DBA)
O banco de dados segue um modelo altamente relacional com mais de 45 migrations complexas rastreadas.
Principais domínios modelados:
*   **Core:** `processos_juridicos`, `clientes`, `unidades`.
*   **HR & Timesheet:** `hr_core_schema`, `timesheet_entries`, `timesheet_timer_logs`, `employees`.
*   **Workflow:** `crm`, `automations`, `document_signatures`.
*   **Financeiro:** `orcamentos`, gateways, fluxos de despesa/receita.
O sistema provê multitenancy real ou lógico robusto mitigando "Tenant Leaks" ([fix_rls_tenant_leak.sql](file:///c:/Users/Guilherme/.gemini/antigravity/playground/magnetic-pathfinder/lexanova-core/supabase/migrations/20260304000000_fix_rls_tenant_leak.sql)) e utiliza exaustivamente RLS (Row Level Security) para compartimentação de dados. As migrations são versionadas de forma estrita de acordo com data/hora. **Para otimização de performance do RLS, são utilizados `security invoker` em views complexas e índices dedicados em todas as colunas de `tenant_id`.**

## 4. APIs e Integrações (Marcus - Arquiteto)
*   **API Interna:** Comunicação direta Client -> Supabase via `@supabase/supabase-js`, explorando chamadas REST auto-geradas pelo PostgREST, além de WebSockets para Realtime (útil em Chats e notificações).
*   **Gateways de Pagamento:** Integração com **Asaas** para emissão de faturamento/cobrança.
*   **Comunicação:** Integração **WhatsApp** nativa para envios e triggers (`whatsapp_integration`).
*   **Calendários:** Sincronização via APIs externas do **Google Calendar**, **Microsoft Calendar** e **Apple Calendar** usando tokens dedicados.
*   **Armazenamento:** Supabase Storage para lidar com o GED (Gestão Eletrônica de Documentos).

## 5. Segurança (Kai - Segurança)
*   **Autenticação:** Gerenciada pelo Supabase Auth utilizando JWTs. Utiliza RBAC (Role-Based Access Control) rigoroso modelado no banco ([rbac_roles.sql](file:///c:/Users/Guilherme/.gemini/antigravity/playground/magnetic-pathfinder/lexanova-core/supabase/migrations/20260220000016_rbac_roles.sql)) e provisionamento de perfis master.
*   **Autorização (RLS):** Toda query é interceptada no nível do PostgreSQL validando o tenant e a permissão do usuário de forma matemática e inquebrável por falha de front-end ([optimize_rls_performance.sql](file:///c:/Users/Guilherme/.gemini/antigravity/playground/magnetic-pathfinder/lexanova-core/supabase/migrations/20260224000000_optimize_rls_performance.sql), [rls_rh_agenda.sql](file:///c:/Users/Guilherme/.gemini/antigravity/playground/magnetic-pathfinder/lexanova-core/supabase/migrations/20260227000001_rls_rh_agenda.sql)).
*   **Auditoria Avançada:** O sistema conta com rastreabilidade total de mutações via triggers ([universal_audit_logs.sql](file:///c:/Users/Guilherme/.gemini/antigravity/playground/magnetic-pathfinder/lexanova-core/supabase/migrations/20260224100004_universal_audit_logs.sql)), garantindo compliance com o marco civil e a LGPD. **Implementação de webhooks de auditoria para disparar alertas em tempo real sobre ações críticas (ex: exclusão de processo, alteração de dados sensíveis).**

## 6. Infraestrutura e DevOps (Nina - DevOps)
*   **CI/CD & Deploy:** O frontend processado pelo Vite possibilita deploy em plataformas edge como Vercel, Netlify ou AWS Amplify/S3+CloudFront de maneira quase instantânea, resultando em estáticos altamente otimizados.
*   **Banco de Dados Mutável via Migrations:** Os scripts localizados em `supabase/migrations/` permitem que ambientes de Staging, Dev e Prod sejam nivelados por uma pipeline CI com a CLI do Supabase.
*   **Performance:** Code-splitting out-of-the-box pelo Vite. **Monitoramento contínuo de performance do RLS e queries críticas.**

## 7. Estrutura de Pastas e Módulos
O monorepo do front-end está modelado baseado em Features e responsabilidades:
*   `src/components/`: Componentes agnósticos e atômicos (UI Kit liderado por Theo).
*   `src/features/`: Lógica de negócio compartimentada por domínio (ex: `/agenda`, `/processos`, `/financeiro`, `/timesheet`).
*   `src/pages/`: Camada de roteamento e views (Containers de página).
*   `src/integrations/`: Hooks pré-configurados do React Query para interação com entidades externas e cache.
*   `supabase/migrations/`: Fonte da verdade do Schema relacional, segurança e auditoria (domínio liderado por Rafael e Kai).

## 8. Padrões de Código e Boas Práticas (Leo - Tech Lead)
*   **Validação de Dados:** Sempre utilizar `zod` para validação de esquemas e `react-hook-form` para validação de formulários.
*   **Acesso a Dados:** Todas as interações com o backend Supabase devem ser realizadas através de hooks de integração pré-configurados (ex: `TanStack React Query`) para garantir cache, revalidação e tratamento de erros consistentes.
*   **Segurança:** Nunca realizar queries diretas ao banco de dados ou manipular dados sensíveis sem a devida validação de RLS e permissões.
*   **Testes:** Priorizar testes unitários para lógica de negócio e testes de integração para fluxos críticos.
*   **Documentação:** Manter a documentação inline (JSDoc) e os arquivos `PRD.md` e `SPECS.md` atualizados com as implementações.
