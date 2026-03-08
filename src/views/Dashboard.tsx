import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <h1 className="font-display text-3xl">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Bem-vindo, {user?.user_metadata?.full_name || user?.email}</p>
      <Button variant="outline" className="mt-6" onClick={signOut}>
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </div>
  );
};

export default Dashboard;
