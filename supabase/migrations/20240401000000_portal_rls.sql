-- Migration: RLS do Portal do Cliente
-- Objetivo: Restringir que clientes autenticados só vejam seus próprios Processos, Faturas e Documentos.
-- Autor: Rafael (DBA) / Antigravity

-- 1. Políticas para Processos Jurídicos
-- Advogados e Admins provavelmente já têm políticas cobrindo a organização.
-- Adicionamos a permissão específica para o cliente (role 'cliente')

CREATE POLICY "Clientes podem visualizar seus próprios processos" 
ON processos_juridicos 
FOR SELECT 
USING (
    client_id IN (
        SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
);

-- 2. Políticas para Contas a Receber (Faturas)
CREATE POLICY "Clientes podem visualizar suas próprias faturas" 
ON contas_receber 
FOR SELECT 
USING (
    client_id IN (
        SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
);

-- 3. Políticas para Documentos (Visualizar)
CREATE POLICY "Clientes podem visualizar seus próprios documentos" 
ON documentos 
FOR SELECT 
USING (
    client_id IN (
        SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
);

-- 4. Políticas para Documentos (Inserir - Upload do Cliente)
CREATE POLICY "Clientes podem fazer upload de novos documentos" 
ON documentos 
FOR INSERT 
WITH CHECK (
    client_id IN (
        SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
);

-- Habilitando RLS forçadamente caso ainda não esteja
ALTER TABLE processos_juridicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
