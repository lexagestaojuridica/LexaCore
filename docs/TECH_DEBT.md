# Relatório de Débitos Técnicos - LEXA Nova (v3.5)

Este documento mapeia os principais pontos de fricção, riscos e inconsistências identificados após uma auditoria completa do sistema.

## ⚠️ Alerta Crítico: Inconsistência de IDs de Projeto

Identificamos dois IDs de projeto Supabase diferentes no arquivo `.env`:

- `NEXT_PUBLIC_SUPABASE_PROJECT_ID="vctzraffikmkhvpbkhtb"`
- `VITE_SUPABASE_PROJECT_ID="ujpbksnlqzdivqjztubo"`

> [!CAUTION]
> Isso indica que diferentes partes do sistema (ou ferramentas de build) podem estar apontando para bancos de dados distintos, gerando fragmentação de dados e erros de autenticação silenciosos.

---

## 🏛️ Débitos de Arquitetura e Estrutura

### 1. Fragmentação de Chamadas de API

O sistema utiliza simultaneamente três padrões para IO:

- **tRPC**: Padrão recomendado para Type Safety de ponta a ponta.
- **Supabase JS SDK**: Usado diretamente em hooks como `useMeuDia` e `AppSidebar`.
- **Axios/Fetch**: Utilizados em integrações externas e Edge Functions.

### 2. Sidebar e Navegação "Hardcoded"

O `AppSidebar.tsx` contém toda a lógica de permissões e estrutura de menus em um único arquivo.

- **Melhoria:** Migrar a definição do menu para um arquivo de configuração centralizado.

### 3. AuthContext Redundante

O `AuthContext.tsx` é um wrapper manual sobre o Clerk. Embora ofereça uma abstração simples, ele adiciona uma camada extra que pode ser simplificada.

---

## 🔐 Segurança e RLS (Row Level Security)

- **Helper Functions de RLS**: O uso intensivo de funções em políticas RLS pode impactar a performance em escala.
- **Módulos Vazios**: Pastas como `unidades`, `bi` e `noticias` sugerem funcionalidades inacabadas.

---

## ⚡ Performance e Bundle Size

- **Bibliotecas Pesadas**: `xlsx`, `jspdf`, `recharts` e `framer-motion` no bundle principal.
- **Server Components**: Baixo uso de RSC (React Server Components) em favor de `use client`.

---

## 🚀 Plano de Ação Sugerido

1. **Unificação de Projeto**: Padronizar todos os `.env` para o ID de projeto correto.
2. **Consolidação de API**: Migrar gradualmente para tRPC.
3. **Refatoração do Sidebar**: Desacoplar a lógica de menu da UI.
4. **Harden RLS**: Criar índices performáticos para colunas usadas nas policies.
5. **Testes Críticos**: Implementar testes unitários para os cálculos financeiros.
