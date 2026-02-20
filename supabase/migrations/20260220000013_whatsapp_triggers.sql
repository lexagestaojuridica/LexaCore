-- Ativar extensão pg_net para fazer requisições HTTP a partir do banco (já nativo na cloud da Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criação da função de disparo para Assinaturas Pendentes
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_signature()
RETURNS TRIGGER AS $$
DECLARE
  org_record record;
  webhook_url text;
  req_body jsonb;
BEGIN
  -- Se o webhook url for fixo (sua edge function URL), defina-o aqui.
  webhook_url := current_setting('app.settings.whatsapp_edge_url', true);
  
  -- Para segurança local / fallback url mockada
  IF webhook_url IS NULL OR webhook_url = '' THEN
    webhook_url := 'https://[YOUR_SUPABASE_REF].functions.supabase.co/whatsapp-sender';
  END IF;

  -- Checar se a org ativou o zap
  SELECT whatsapp_enabled INTO org_record FROM public.organizations WHERE id = NEW.organization_id;

  IF org_record.whatsapp_enabled = true AND NEW.status = 'pendente' THEN
    req_body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'phone', '5511999999999', -- Idealmente pegar o fone da tabela clients, usando NEW.client_id
      'message', format('Olá %s! A Lexa Nova informa que há um novo documento solicitando sua Assinatura Eletrônica. Acesse seu portal ou e-mail para validar. Obrigado.', NEW.signer_name)
    );

    -- Dispara requisição HTTP POST assíncrona usando pg_net
    PERFORM extensions.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := req_body
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para tabela document_signatures
DROP TRIGGER IF EXISTS trg_whatsapp_doc_signatures ON public.document_signatures;
CREATE TRIGGER trg_whatsapp_doc_signatures
  AFTER INSERT ON public.document_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_whatsapp_signature();


-- Criação da função de disparo para Faturas (Contas a Receber)
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_invoice()
RETURNS TRIGGER AS $$
DECLARE
  org_record record;
  client_record record;
  webhook_url text;
  req_body jsonb;
BEGIN
  -- O mesmo fallback URL
  webhook_url := 'https://[YOUR_SUPABASE_REF].functions.supabase.co/whatsapp-sender';

  -- Checar se a org ativou o zap
  SELECT whatsapp_enabled INTO org_record FROM public.organizations WHERE id = NEW.organization_id;

  IF org_record.whatsapp_enabled = true AND NEW.status = 'pendente' AND NEW.client_id IS NOT NULL THEN
    -- Pegar telefone do cliente
    SELECT phone INTO client_record FROM public.clients WHERE id = NEW.client_id;
    
    IF client_record.phone IS NOT NULL THEN
      -- Constrói payload JSON
      req_body := jsonb_build_object(
        'organization_id', NEW.organization_id,
        'phone', client_record.phone,
        'message', format('Olá! A fatura "%s" no valor de R$ %s foi gerada e está pendente de pagamento.', NEW.description, NEW.amount::numeric)
      );

      PERFORM extensions.http_post(
        url := webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := req_body
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para tabela contas_receber
DROP TRIGGER IF EXISTS trg_whatsapp_invoice ON public.contas_receber;
CREATE TRIGGER trg_whatsapp_invoice
  AFTER INSERT ON public.contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_whatsapp_invoice();
