-- Criar bucket para os documentos caso não exista
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage
DROP POLICY IF EXISTS "Acesso aos documentos restrito a usuários autenticados" ON storage.objects;
CREATE POLICY "Acesso aos documentos restrito a usuários autenticados"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'documentos' );

DROP POLICY IF EXISTS "Upload permitido a usuários autenticados" ON storage.objects;
CREATE POLICY "Upload permitido a usuários autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'documentos' );

DROP POLICY IF EXISTS "Deleção permitida ao próprio dono ou admin" ON storage.objects;
CREATE POLICY "Deleção permitida ao próprio dono ou admin"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'documentos' );

-- Adicionar colunas adicionais em documentos para o GED caso não existam
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS size INTEGER DEFAULT 0;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS folder_path TEXT DEFAULT '/';
