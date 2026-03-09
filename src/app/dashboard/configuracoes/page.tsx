"use client";
import ConfiguracoesPage from "@/features/configuracoes/pages/ConfiguracoesPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando configurações...</div>}>
      <ConfiguracoesPage />
    </Suspense>
  );
}
