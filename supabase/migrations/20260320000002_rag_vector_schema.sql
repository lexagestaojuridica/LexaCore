-- Migration: Base de Conhecimento Vetorial RAG
-- Objetivo: Preparar a arquitetura RAG (Retrieval-Augmented Generation) para a IA Aruna.
-- Autor: Marcus (Arquiteto) / Antigravity

-- 1. Habilitamos a extensão vetorial do PostgreSQL (fundamental para RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela para armazenar os trechos de documentos vetorizados (Embeddings)
-- Note: organization_id and document_id use TEXT after clerk ID standardization
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536), -- Dimensão padrão do modelo text-embedding-ada-002 ou text-embedding-3-small da OpenAI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Índice HNSW para busca vetorial performática
CREATE INDEX IF NOT EXISTS idx_document_embeddings_hnsw ON document_embeddings USING hnsw (embedding vector_cosine_ops);

-- 4. RLS
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem vetores da sua própria organização" ON document_embeddings;
CREATE POLICY "Usuários veem vetores da sua própria organização" 
ON document_embeddings 
FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()::text
    )
);

-- 5. Função de Match para busca vetorial de similaridade
CREATE OR REPLACE FUNCTION match_document_embeddings (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  org_id TEXT
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    de.id,
    de.document_id,
    de.content,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM document_embeddings de
  WHERE de.organization_id = org_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
$$;
