import { ClerkProvider } from "@clerk/nextjs";
import "../index.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="pt-BR" suppressHydrationWarning>
        <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
          <ThemeProvider defaultTheme="system" storageKey="lexa-theme">
            <TooltipProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
