import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { useToast } from "@/shared/ui/use-toast";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function ResetPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { toast } = useToast();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast({ title: "Preencha o e-mail", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth`,
            });

            if (error) throw error;

            setSuccess(true);
            toast({
                title: "E-mail enviado!",
                description: "Verifique sua caixa de entrada para redefinir a senha.",
            });
        } catch (error: any) {
            toast({
                title: "Erro ao enviar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
                <Card className="border-border shadow-lg">
                    {success ? (
                        <div className="p-8 text-center space-y-4">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
                                <Mail className="h-6 w-6 text-green-600 dark:text-green-300" />
                            </div>
                            <h2 className="text-2xl font-bold">Confira seu e-mail</h2>
                            <p className="text-muted-foreground">
                                Enviamos um link de recuperação para <strong>{email}</strong>.
                            </p>
                            <div className="pt-4">
                                <Link href="/auth">
                                    <Button variant="outline" className="w-full">Voltar para o Login</Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleReset}>
                            <CardHeader className="space-y-1">
                                <CardTitle className="text-2xl font-bold">Esqueceu a senha?</CardTitle>
                                <CardDescription>
                                    Digite seu e-mail para receber um link de redefinição de senha.
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
                            </CardContent>
                            <CardFooter className="flex flex-col space-y-4">
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Enviar link de recuperação
                                </Button>
                                <div className="text-center">
                                    <Link href="/auth" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
                                        <ArrowLeft className="h-4 w-4" />
                                        Voltar para o login
                                    </Link>
                                </div>
                            </CardFooter>
                        </form>
                    )}
                </Card>
            </motion.div>
        </div>
    );
}
