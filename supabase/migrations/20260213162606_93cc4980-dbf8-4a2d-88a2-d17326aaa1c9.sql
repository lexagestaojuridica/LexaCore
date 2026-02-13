CREATE POLICY "Users can delete own conversas"
ON public.conversas_ia
FOR DELETE
USING (user_id = auth.uid() AND is_member_of_org(auth.uid(), organization_id));