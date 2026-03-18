import { ClerkProvider } from "@clerk/nextjs";
// @ts-ignore
import "../index.css";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TRPCProvider } from "./TRPCProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="pt-BR" suppressHydrationWarning>
        <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
          <TRPCProvider>
            <ThemeProvider defaultTheme="system" storageKey="lexa-theme">
              <TooltipProvider>
                {children}
                <Toaster />
                <Sonner />
              </TooltipProvider>
            </ThemeProvider>
          </TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
