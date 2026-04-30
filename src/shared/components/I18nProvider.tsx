"use client";

import React from "react";
// Bootstrap i18n on the client side — must be imported before any component that uses useTranslation
import "@/i18n";

export function I18nProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
