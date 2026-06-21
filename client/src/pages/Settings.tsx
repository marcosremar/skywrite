import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleDeleteAccount = async () => {
    const res = await apiFetch("/api/auth/me", { method: "DELETE" });
    if (res.ok) {
      await logout();
      navigate("/");
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
          <CardDescription>Seus dados de acesso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Nome:</span> {user?.name || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {user?.email}
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6 border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Excluir conta</CardTitle>
          <CardDescription>
            Remove permanentemente sua conta e todos os projetos, arquivos e builds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Excluir minha conta</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é permanente e remove todos os seus dados. Não dá para desfazer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount}>
                  Excluir conta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
