# PRD.md - Documento de Requisitos do Produto LEXA (v3.5)

## 1. Visão Geral do Produto
O LEXA é um sistema de gestão jurídica (ERP/LegalTech) abrangente, moderno e escalável, projetado para digitalizar e automatizar a rotina de escritórios de advocacia. Construído para ser centrado no usuário, o sistema cobre toda a jornada operacional do escritório, desde a captação do cliente (CRM) até a execução do serviço (Processos, Documentos, IA), faturamento (Financeiro) e gestão interna (RH, Timesheet, BI). O grande valor de negócio reside na unificação de ferramentas num único ecossistema seguro, inteligente e **preditivo**.

**Prioridade Máxima: Excelência Operacional e Qualidade Inquestionável.**
- ✅ Zero bugs críticos
- ✅ Desacoplamento Total (Feature-Sliced Design - FSD)
- ✅ Escalabilidade (Clerk + Supabase + Vercel)
- ✅ Segurança (RLS, LGPD, Auditoria)
- ✅ Testes Automatizados (Unitários, Integração, E2E)

---

## 2. Funcionalidades Principais

- **Gestão de Processos (Core Jurídico):** Módulo central para acompanhamento de ações judiciais, controle de prazos e histórico de movimentações. Inclui análise preditiva de prazos.
- **CRM & Workflow:** Captação de leads, funil de vendas, esteira de aprovações e automação de fluxos.
- **Gestão Financeira e Faturamento:** Contas a pagar/receber, conciliação bancária, integração Asaas, gestão de planos.
- **GED & Documentos:** Gestão Eletrônica de Documentos com Supabase Storage, minutas e assinaturas digitais.
- **Timesheet & Produtividade:** Apontamento de horas, métricas de produtividade, integração com financeiro.
- **Agenda Inteligente:** Calendário corporativo com integrações bidirecionais (Google, Microsoft, Apple).
- **Módulo RH:** Gestão de colaboradores, avaliação de performance e recrutamento.
- **Portal do Cliente:** Área restrita (White-label) para acompanhamento de processos, documentos e faturas.
- **IA & BI Preditivo:** Dashboards avançados, relatórios gerenciais, robôs de captura e chat inteligente.
- **Omnichannel:** Integração WhatsApp para notificações e atendimento.

---

## 3. Usuários e Personas

- **Advogado / Sócio (Master):** Acesso completo a painéis de BI preditivo, relatórios financeiros e gestão de equipes.
- **Advogado Associado / Parceiro:** Foco na execução: Timesheet, agenda, documentos e prazos.
- **Equipe Administrativa / Financeiro:** Faturamento, contas a pagar/receber, relacionamento financeiro.
- **Cliente Final:** Acesso ao Portal do Cliente para transparência e documentos.

---

## 4. Fluxos de Usuário

- **Captação e Onboarding:** Lead > CRM > Minuta > Assinatura > Cliente ativo.
- **Operação e Faturamento:** Processo > Timesheet > Aprovação > Fatura (Asaas) > Cliente.
- **Gestão de Prazos Preditivo:** Robôs capturam andamentos > IA alerta prazos críticos > Notificações > Calendar.

---

## 5. Requisitos Não Funcionais

- **Conformidade Legal (LGPD):** Audit logs completos, controle de acesso compartimentado.
- **Viabilidade Financeira:** Monetização via Asaas, precificação por consumo, gestão via Clerk.
- **Usabilidade:** shadcn-ui, Dark/Light mode, acessibilidade (Radix UI), experiência fluida.
- **Qualidade e Escalabilidade:** FSD, Clean Architecture, TypeScript strict, zero acoplamento.

---

## 6. Fora do Escopo

Contabilidade pura (ECD/ECF), provedor de e-mail corporativo próprio.

---

## 7. Roadmap 2026

1. BI Preditivo Avançado com Machine Learning
2. Módulo de Acordos e Negociações
3. Monetização Flexível (consumo de IA/armazenamento)
4. Certificação de Auditoria LGPD exportável
5. Offline-First para Processos (Vercel-optimized)
6. Skills de IA por domínio (Minutas, Análise Preditiva)
