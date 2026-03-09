# SPECS.md - Especificações Técnicas do Projeto LEXA (v3.3 - Skill-Driven com Qualidade Máxima, Desacoplamento e Escalabilidade)

## 1. Visão Geral da Arquitetura (Marcus - Arquiteto)
O LEXA opera sob uma arquitetura de Next.js (App Router) moderna suportada por um poderoso "Backend-as-a-Service" (BaaS) fornecido pelo **Supabase**. A autenticação e gestão de usuários são providas pelo **Clerk**, um serviço robusto de autenticação e identidade. O frontend e o backend (Edge Functions/Middleware) são implantados na **Vercel**. O **Supabase (PostgreSQL)** atua como o banco de dados principal, delegando regras de negócio granulares para o banco via RLS (Row Level Security), triggers e Functions. A arquitetura é projetada para suportar funcionalidades offline-first em módulos críticos, garantir alta performance globalmente e segurança em cenários de multitenancy, com foco central em **desacoplamento**, isolamento de dados e **escalabilidade horizontal**. A prioridade máxima é a estabilidade, promovida através de uma infraestrutura intrinsecamente **modular**, garantindo a ausência de bugs críticos e a aderência inquestionável às regras de negócio e requisitos de front-end.

## 2. Tecnologias Utilizadas
*   **Frontend:** Next.js 15 (App Router), React 18, TypeScript.
*   **Estilização & UI:** Tailwind CSS, shadcn-ui (Radix UI primitives), framer-motion (animações), lucide-react (ícones).
*   **Gerenciamento de Estado & Dados:** TanStack React Query (SWR patterns), react-hook-form + zod (validação tipada).
*   **Autenticação & Identidade:** **Clerk** (para autenticação, autorização e gestão de usuários/organizações).
*   **Backend & Banco de Dados:** **Supabase, PostgreSQL 15+**, **Vercel Edge Functions**.
*   **Outras:** Recharts para B.I, i18next (internacionalização), tiptap (WYSIWYG editor), jspdf / html2canvas.

## 3. Schema do Banco de Dados (Rafael - DBA)
O banco de dados utiliza **Supabase (PostgreSQL 15+)**, um banco de dados relacional robusto. O modelo de dados é altamente relacional, com mais de 45 migrations complexas rastreadas. 
Principais domínios modelados:
*   **Core:** `processos_juridicos`, `clientes`, `unidades`.
*   **HR & Timesheet:** `hr_core_schema`, `timesheet_entries`, `timesheet_timer_logs`, `employees`.
*   **Workflow:** `crm`, `automations`, `document_signatures`.
*   **Financeiro:** `orcamentos`, gateways, fluxos de despesa/receita.
O sistema provê multitenancy robusto, com isolamento de dados garantido por **RLS (Row Level Security) diretamente no PostgreSQL do Supabase**. As migrations são versionadas de forma estrita de acordo com data/hora, gerenciadas pela CLI do Supabase. **A integridade e consistência dos dados são prioridade máxima, com validações em nível de banco de dados e testes automatizados para cada migration.**

## 4. APIs e Integrações (Marcus - Arquiteto)
*   **API Interna:** Comunicação Client -> **Supabase** via `@supabase/supabase-js`, explorando chamadas REST auto-geradas pelo PostgREST, além de WebSockets para Realtime (útil em Chats e notificações). **Vercel Edge Functions** são utilizadas para lógica de backend serverless e orquestração de integrações externas que não se encaixam diretamente no Supabase. **Todas as APIs e integrações devem ser robustas, com tratamento de erros abrangente e testes de integração automatizados.**
*   **Gateways de Pagamento:** Integração com **Asaas** para emissão de faturamento/cobrança, orquestrada via **Vercel Edge Functions**. **Testes de ponta a ponta para garantir a precisão e confiabilidade das transações financeiras.**
*   **Comunicação:** Integração **WhatsApp** nativa para envios e triggers (`whatsapp_integration`), também via **Vercel Edge Functions**. **Monitoramento contínuo para garantir a entrega e o funcionamento correto das comunicações.**
*   **Calendários:** Sincronização via APIs externas do **Google Calendar**, **Microsoft Calendar** e **Apple Calendar** usando tokens dedicados, gerenciada por **Vercel Edge Functions**. **Validação rigorosa da sincronização para evitar perda de prazos.**
*   **Armazenamento:** **Supabase Storage** para lidar com o GED (Gestão Eletrônica de Documentos). **Garantia de integridade e disponibilidade dos documentos armazenados.**

## 5. Segurança (Kai - Segurança)
*   **Autenticação:** Gerenciada pelo **Clerk**, utilizando JWTs e oferecendo diversas estratégias de autenticação (SSO, Social Logins, etc.). **Implementação de políticas de segurança rigorosas e auditorias regulares.**
*   **Autorização (RBAC e RLS):** O **Clerk** provê um RBAC (Role-Based Access Control) rigoroso para gestão de permissões de usuários e organizações. O **RLS (Row Level Security)** é implementado diretamente no **PostgreSQL do Supabase**, validando o tenant e a permissão do usuário de forma matemática e inquebrável por falha de front-end. A integração entre Clerk e Supabase garante que o `user_id` do Clerk seja mapeado para o RLS do Supabase. **Testes de segurança e pentests regulares para garantir a inviolabilidade dos dados.**
*   **Auditoria Avançada:** O sistema conta com rastreabilidade total de mutações via triggers do Supabase ([universal_audit_logs.sql](file:///c:/Users/Guilherme/.gemini/antigravity/playground/magnetic-pathfinder/lexanova-core/supabase/migrations/20260224100004_universal_audit_logs.sql)). **Implementação de webhooks de auditoria para disparar alertas em tempo real sobre ações críticas (ex: exclusão de processo, alteração de dados sensíveis), com foco na conformidade LGPD e na integridade dos logs.**

## 6. Infraestrutura e DevOps (Nina - DevOps)
*   **CI/CD & Deploy:** O frontend processado pelo Vite e as Edge Functions são implantados na **Vercel**, possibilitando deploys globais e instantâneos, resultando em estáticos e funções serverless altamente otimizados. **Pipeline de CI/CD robusta com testes automatizados (unitários, integração, E2E) e gates de qualidade para impedir a entrada de bugs em produção.**
*   **Banco de Dados Mutável via Migrations:** Os scripts localizados em `supabase/migrations/` permitem que ambientes de Staging, Dev e Prod sejam nivelados por uma pipeline CI com a CLI do **Supabase**. **Todas as migrations devem ser revisadas e testadas para garantir a compatibilidade e a integridade dos dados.**
*   **Performance:** Code-splitting out-of-the-box pelo Vite. **Monitoramento contínuo de performance das Edge Functions, queries do Supabase e APIs críticas, com alertas proativos para identificar e resolver gargalos antes que afetem os usuários.**

## 7. Estrutura de Pastas e Módulos
O monorepo do front-end está modelado sob os princípios de Feature-Sliced Design (FSD), com foco extremo em **modularidade** e separação de responsabilidades:
*   `src/components/`: Componentes agnósticos e atômicos (UI Kit liderado por Theo), sem acoplamento de regras de negócios.
*   `src/features/`: Lógica de negócio altamente compartimentada e **desacoplada** por domínio (ex: `/agenda`, `/processos`, `/financeiro`, `/timesheet`). Cada feature deve funcionar de forma independente e testável.
*   `src/pages/`: Camada de roteamento e views (Containers de página).
*   `src/integrations/`: Hooks pré-configurados do React Query para interação com entidades externas e cache.
*   `supabase/migrations/`: Fonte da verdade do Schema relacional, segurança e auditoria, promovendo independência dos módulos de dados (domínio liderado por Rafael e Kai).
*   `api/edge-functions/`: Lógica de backend serverless para **Vercel Edge Functions**, garantindo pipelines isolados e suporte nativo à escalabilidade horizontal do sistema.

## 8. Padrões de Código e Boas Práticas (Leo - Tech Lead)
*   **Validação de Dados:** Sempre utilizar `zod` para validação de esquemas e `react-hook-form` para validação de formulários. **Garantia de tipagem forte e validação em todas as camadas da aplicação (frontend e backend).**
*   **Acesso a Dados:** Todas as interações com o backend **Supabase** devem ser realizadas através de hooks de integração pré-configurados (ex: `TanStack React Query`) para garantir cache, revalidação e tratamento de erros consistentes. Para operações que exigem lógica serverless ou orquestração de integrações externas, utilizar **Vercel Edge Functions**. **Todas as operações de dados devem ser seguras, eficientes e testadas.**
*   **Segurança:** Nunca realizar queries diretas ao banco de dados ou manipular dados sensíveis sem a devida validação de autenticação/autorização via **Clerk** e **RLS do Supabase**. **Revisões de código focadas em segurança são obrigatórias.**
*   **Testes:** **Prioridade máxima em testes unitários para lógica de negócio, testes de integração para fluxos críticos e testes de ponta a ponta (E2E) para garantir a funcionalidade completa do sistema. Nenhuma feature é considerada pronta sem cobertura de testes adequada.**
*   **Documentação:** Manter a documentação inline (JSDoc) e os arquivos `PRD.md` e `SPECS.md` atualizados com as implementações. **A documentação deve ser clara, concisa e refletir o estado atual do código e das regras de negócio.**
*   **Revisão de Código:** Todas as alterações de código devem passar por revisão de pares rigorosa, com foco em qualidade, segurança, performance e aderência aos padrões estabelecidos. **Nenhum código é mergeado sem aprovação de pelo menos dois membros da equipe.**
