import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch("/api/auth/me", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Não foi possível excluir a conta");
        return;
      }
      await logout();
      navigate("/");
    } catch {
      toast.error("Falha de conexão");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiFetch("/api/auth/me/export");
      if (!res.ok) {
        toast.error("Falha ao exportar dados");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "skywrite-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Falha de conexão ao exportar");
    } finally {
      setExporting(false);
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Exportar meus dados</CardTitle>
          <CardDescription>
            Baixe todos os seus dados (projetos, arquivos, builds) em JSON — portabilidade LGPD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exportando…" : "Exportar meus dados"}
          </Button>
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
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? "Excluindo…" : "Excluir conta"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
