# PRD.md - Documento de Requisitos do Produto LEXA (v2.0)

## 1. Visão Geral do Produto
O LEXA é um sistema de gestão jurídica (ERP/LegalTech) abrangente, moderno e escalável, projetado para digitalizar e automatizar a rotina de escritórios de advocacia. Construído para ser centrado no usuário, o sistema cobre toda a jornada operacional do escritório, desde a captação do cliente (CRM) até a execução do serviço (Processos, Documentos, IA), faturamento (Financeiro) e gestão interna (RH, Timesheet, BI). O grande valor de negócio reside na unificação de ferramentas num único ecossistema seguro, inteligente e **preditivo**, eliminando a necessidade de ferramentas externas e consolidando o LEXA como a única plataforma necessária para a gestão jurídica.

## 2. Funcionalidades Principais (O QUE construir/está construído)
*   **Gestão de Processos (Core Jurídico):** Módulo central para acompanhamento de ações judiciais, controle de prazos (`legal_deadlines_security`) e histórico de movimentações. **Inclui análise preditiva de prazos e eventos futuros.**
*   **CRM & Workflow:** Captação de leads, funil de vendas, esteira de aprovações (`crm_workflow_minutas`) e automação de fluxos de trabalho (`workflow_automations`). **Expansão para Módulo de Acordos e Negociações.**
*   **Gestão Financeira e Faturamento:** Controle de contas a pagar/receber, conciliação bancária, emissão de cobranças com gateway Asaas ([financial_gateway_asaas.sql](file:///c:/Users/Guilherme/.gemini/antigravity/playground/magnetic-pathfinder/lexanova-core/supabase/migrations/20260224164100_financial_gateway_asaas.sql)) e gestão de planos de assinatura (`subscription_plans`). **Monetização por consumo de IA e armazenamento.**
*   **GED & Documentos:** Gestão Eletrônica de Documentos com armazenamento na nuvem (`ged_storage`), criação de minutas padronizadas e assinaturas digitais integradas (`document_signatures`). **Suporte a diferentes níveis de armazenamento com precificação por consumo.**
*   **Timesheet & Produtividade:** Apontamento de horas trabalhadas (`timesheet_timer_logs`), métricas de produtividade e integração profunda com módulo financeiro para faturamento por hora. **BI Preditivo para alocação de recursos e previsão de carga de trabalho.**
*   **Agenda Inteligente:** Calendário corporativo com regras de recorrência (`agenda_recurrence`) e integrações bidirecionais com Microsoft Calendar e Apple Calendar. **Log de ciência de prazos críticos.**
*   **Módulo RH:** Gestão de colaboradores (`hr_core_schema`), avaliação de performance e recrutamento (`hr_recruitment_performance`).
*   **Portal do Cliente:** Área restrita (White-label) para clientes finais acompanharem processos, documentos e faturas (`portal_cliente`).
*   **Inteligência Artificial (IA) & BI Preditivo:** Dashboards avançados com Recharts (`BIPage`), relatórios gerenciais, robôs de captura (`capture_robots`) e chat inteligente. **Foco em análise preditiva para prazos, carga de trabalho e resultados de processos.**
*   **Omnichannel:** Integração com o WhatsApp para notificações e atendimento (`whatsapp_integration`, `whatsapp_triggers`).

## 3. Usuários e Personas (PARA QUEM)
*   **Advogado / Sócio (Master):** Acesso completo a painéis de B.I preditivo, relatórios financeiros e poder de decisão sobre aprovações e configuração de unidades (`admin_hq_features`).
*   **Advogado Associado / Parceiro:** Foco na execução: apontamento de Timesheet, gestão de agenda, elaboração de documentos/minutas e acompanhamento de prazos. **Recebe alertas preditivos de prazos e gargalos.**
*   **Equipe Administrativa / Financeiro:** Operadores do faturamento, contas a pagar/receber e relacionamento financeiro com os clientes. **Gerencia precificação por consumo e relatórios de rentabilidade.**
*   **Cliente Final:** Acesso ao "Portal do Cliente" restrito para transparência e obtenção de documentos e boletos. **Visualiza o status de acordos e negociações.**

## 4. Fluxos de Usuário (Aprimorados)
*   **Fluxo de Captação e Onboarding:** O lead entra via Chat/WhatsApp, é cadastrado no CRM, avança no funil, gera uma minuta de contrato aprovada sistemicamente e, com a assinatura (`document_signatures`), converte-se em Cliente ativo. **Inclui esteira de negociação de acordos.**
*   **Fluxo de Operação e Faturamento:** Criação de um Processo > Realização de tarefas com apontamento no Timesheet > Aprovação das horas > Geração de fatura no Financeiro (via Asaas) > Envio para o Cliente. **Faturamento flexível por hora, por serviço ou por consumo de recursos (IA/armazenamento).**
*   **Fluxo de Gestão de Prazos Preditivo:** Robôs capturam andamentos (`capture_robots`) > IA preditiva alerta sobre prazos críticos e possíveis gargalos > Notificações automáticas alertam o advogado (`notifications`) com **prova de ciência** > Prazo é sincronizado com Google/MS Calendar.

## 5. Requisitos Não Funcionais (Aprimorados)
*   **Conformidade Legal (Dr. Andressa):** O sistema possui um rigoroso controle de gestão de prazos processuais e acesso compartimentado e log de auditoria completo para conformidade com a LGPD (`universal_audit_logs`, `legal_deadlines_security`). **Geração de relatórios de Compliance LGPD exportáveis.**
*   **Viabilidade Financeira (Sabrine):** Forte viés em monetização e cobrança eficiente por meio das automações de gateway (`recebimentos_gateway`, `financial_gateway_asaas`), **precificação por consumo (IA/armazenamento)**, garantindo a saúde do fluxo de caixa e aumentando o LTV.
*   **Usabilidade (Sofia):** Padrões modernos de UI criados com `shadcn-ui`, garantindo temas adaptativos (Dark/Light mode via `next-themes`), acessibilidade (Radix UI) e experiência fluida com reatividade imediata no frontend. **Foco em experiência "offline-first" para módulos críticos.**

## 6. Fora do Escopo (Inferido)
Embora muito completo, o Lexa não parece atuar como sistema de contabilidade pura (ex: emissão direta de balancetes complexos e ECD/ECF), mantendo o foco do ERP nas operações gerenciais e financeiras do escritório. Além disso, não parece prover provedoria de e-mail corporativo próprio.

## 7. Roadmap 2026 (Sugestões de Melhoria)
*   **BI Preditivo Avançado:** Implementar algoritmos de Machine Learning para prever resultados de processos, otimizar alocação de recursos e identificar tendências jurídicas.
*   **Módulo de Acordos e Negociações:** Ferramentas dedicadas para gerenciar propostas, contrapropostas e aprovações de acordos, integradas ao CRM.
*   **Monetização Flexível:** Expandir as opções de precificação para incluir consumo de IA, armazenamento e funcionalidades premium.
*   **Certificação de Auditoria:** Desenvolver funcionalidade para gerar relatórios de compliance LGPD diretamente do sistema.
*   **Offline-First para Processos:** Permitir acesso e edição básica de informações de processos mesmo sem conexão à internet.
