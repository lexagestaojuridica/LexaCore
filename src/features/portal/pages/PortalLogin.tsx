import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Scale, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function PortalLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast({ title: "Preencha todos os campos", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                // Verificar se é relamente um cliente
                const { data: clientData, error: clientError } = await supabase
                    .from("clients")
                    .select("id")
                    .eq("auth_user_id", data.user.id)
                    .single();

                if (clientError || !clientData) {
                    await supabase.auth.signOut();
                    throw new Error("Usuário não possui acesso ao Portal do Cliente.");
                }

                navigate("/portal/dashboard");
            }
        } catch (error: any) {
            toast({
                title: "Erro ao acessar portal",
                description: error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%239C92AC\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md relative z-10">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm mb-4">
                        <Scale className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Portal do Cliente</h1>
                    <p className="text-sm text-muted-foreground mt-1">Acesse o andamento do seu caso de forma transparente.</p>
                </div>

                <Card className="border-border shadow-lg">
                    <form onSubmit={handleLogin}>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-xl">Acesso Exclusivo</CardTitle>
                            <CardDescription>
                                Insira as credenciais fornecidas pelo seu advogado.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Senha</Label>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Entrar no Portal
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="mt-8 text-center text-xs text-muted-foreground">
                    Gerenciado pela tecnologia Lexa Nova
                </p>
            </motion.div>
        </div>
    );
}
