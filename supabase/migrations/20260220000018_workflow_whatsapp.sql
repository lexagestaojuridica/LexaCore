-- Ativar extensão pg_net para webhooks
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger para executar Automações do Workflow quando um processo é criado
CREATE OR REPLACE FUNCTION public.trigger_workflow_process_created()
RETURNS TRIGGER AS $$
DECLARE
  auto record;
  org_record record;
  webhook_url text := 'https://vctzraffikmkhvpbkhtb.supabase.co/functions/v1/whatsapp-sender';
  client_phone text;
  req_body jsonb;
BEGIN
  -- Checar se a org ativou o zap antes de tentar rodar
  SELECT whatsapp_enabled INTO org_record FROM public.organizations WHERE id = NEW.organization_id;
  
  IF org_record.whatsapp_enabled = true THEN
    -- Buscar automações ativas deste Gatilho para a Organização
    FOR auto IN 
      SELECT * FROM public.workflow_automations 
      WHERE organization_id = NEW.organization_id 
        AND is_active = true 
        AND trigger_type = 'process_created'
    LOOP
      -- Checar se a automação inclui a Ação de enviar WhatsApp
      IF auto.nodes @> '[{"type": "action", "data": {"label": "send_whatsapp"}}]'::jsonb THEN
        
        -- Descobrir telefone do cliente associado ao processo
        IF NEW.client_id IS NOT NULL THEN
          SELECT phone INTO client_phone FROM public.clients WHERE id = NEW.client_id;
          
          IF client_phone IS NOT NULL AND client_phone != '' THEN
            req_body := jsonb_build_object(
              'organization_id', NEW.organization_id,
              'phone', client_phone,
              'message', format('Olá! A Lexa Nova informa que o processo %s (%s) foi cadastrado e já está sendo acompanhado por nossa equipe.', COALESCE(NEW.number, 'S/N'), NEW.title)
            );

            -- Disparar webhook
            PERFORM extensions.http_post(
              url := webhook_url,
              headers := '{"Content-Type": "application/json"}'::jsonb,
              body := req_body
            );
          END IF;
        END IF;

      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_workflow_process_created ON public.processos_juridicos;
CREATE TRIGGER trg_workflow_process_created
  AFTER INSERT ON public.processos_juridicos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_workflow_process_created();
