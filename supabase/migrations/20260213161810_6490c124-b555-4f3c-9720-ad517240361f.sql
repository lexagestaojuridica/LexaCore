
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Members can read documents from their org
DROP POLICY IF EXISTS "Members can read org documents" ON storage.objects;
CREATE POLICY "Members can read org documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documentos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.organization_id::text = (storage.foldername(name))[1]
  )
);

-- RLS: Admin/Advogado can upload documents
DROP POLICY IF EXISTS "Admin/Advogado can upload documents" ON storage.objects;
CREATE POLICY "Admin/Advogado can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documentos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.organization_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advogado')
  )
);

-- RLS: Admin/Advogado can delete documents
DROP POLICY IF EXISTS "Admin/Advogado can delete documents" ON storage.objects;
CREATE POLICY "Admin/Advogado can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documentos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.organization_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advogado')
  )
);
