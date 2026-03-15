import { ClerkProvider } from "@clerk/nextjs";
import "../index.css"; // @ts-ignore
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { TRPCProvider } from "./TRPCProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="pt-BR" suppressHydrationWarning>
        <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
          <TRPCProvider>
            <ThemeProvider defaultTheme="system" storageKey="lexa-theme">
              <TooltipProvider>
                <AuthProvider>
                  {children}
                </AuthProvider>
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
