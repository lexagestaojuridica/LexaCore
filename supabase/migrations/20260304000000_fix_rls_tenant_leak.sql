-- Migration: 20260304000000_fix_rls_tenant_leak.sql
-- Descrição: Mitigação definitiva contra Tenant Leak via RLS.
-- Essa migration cria uma trigger function que bloqueia o UPDATE da coluna organization_id
-- e aplica essa trigger a todas as tabelas do schema public que possuam essa coluna.
-- Isso é mais seguro e resiliente a longo prazo do que reescrever manualmente cada policy WITH CHECK.

-- 1. Cria a função de trigger genérica
CREATE OR REPLACE FUNCTION public.prevent_organization_id_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se o registro antigo e o novo tiverem IDs diferentes, barra a operação
    IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
        RAISE EXCEPTION 'A alteração do organization_id não é permitida. Violação de limite de Tenant.' 
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    RETURN NEW;
END;
$$;

-- 2. Bloco DO para aplicar a trigger dinamicamente em todas as tabelas com 'organization_id'
DO $$
DECLARE
    target_record RECORD;
    trigger_stmt TEXT;
BEGIN
    FOR target_record IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = 'organization_id'
          AND table_name != 'organizations' -- ignora a tabela root de orgs, caso o ID dela possa mudar (improvável, mas pra grantir)
    LOOP
        -- Remove a trigger se já existir para idempotência
        EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_org_update ON %I', target_record.table_name);
        
        -- Cria a trigger
        trigger_stmt := format(
            'CREATE TRIGGER trg_prevent_org_update
             BEFORE UPDATE ON %I
             FOR EACH ROW
             WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
             EXECUTE FUNCTION public.prevent_organization_id_update()',
            target_record.table_name
        );
        
        EXECUTE trigger_stmt;
        
        RAISE NOTICE 'Trigger de proteção de Tenant aplicada com sucesso em: %', target_record.table_name;
    END LOOP;
END
$$;

-- Nota: Essa abordagem não conflita com RLS, na verdade atua como uma camada dupla.
-- O RLS USING() verifica se o usuário pode ver a linha original (OLD).
-- O PostgreSQL tenta atualizar a linha com o novo state (NEW).
-- Antes da atualização ser efetivada (e do PostgreSQL checar um possível WITH CHECK que poderia estar faltando),
-- essa trigger intercepta se o organization_id mudou e aborta a transação.
