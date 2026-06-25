import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState(import.meta.env.DEV ? "demo@thesis.writer" : "");
  const [password, setPassword] = useState(import.meta.env.DEV ? "demo123" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || "/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="font-[family-name:var(--font-code)] text-[10px] uppercase tracking-[0.3em] text-primary">
            Skywrite
          </p>
          <CardTitle className="font-[family-name:var(--font-display)] text-3xl font-light text-foreground">
            Bem-vindo de volta
          </CardTitle>
          <CardDescription>Entre na sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="•••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {import.meta.env.DEV && (
              <div className="bg-accent/20 p-3 rounded-lg mb-4">
                <p className="text-xs text-primary mb-2">
                  <strong>📝 Demo Credentials:</strong>
                </p>
                <p className="text-xs text-muted-foreground mb-1">
                  Email: <code className="bg-muted px-2 py-1 rounded">demo@thesis.writer</code>
                </p>
                <p className="text-xs text-muted-foreground">
                  Senha: <code className="bg-muted px-2 py-1 rounded">demo123</code>
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
