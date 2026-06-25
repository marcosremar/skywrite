import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/apiFetch";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  publisher?: string;
  language: string;
  features: string[];
}

export default function NewProject() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template");

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState<Template | null>(null);

  useEffect(() => {
    async function fetchTemplate() {
      if (!templateId || templateId === "default") return;
      try {
        const response = await apiFetch(`/api/templates/${templateId}`);
        if (response.ok) {
          const data = await response.json();
          setTemplate(data.template);
          if (data.template?.language) {
            setLanguage(data.template.language);
          }
        }
      } catch (err) {
        console.error("Error fetching template:", err);
      }
    }
    fetchTemplate();
  }, [templateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!name.trim()) {
      setError("Nome do projeto é obrigatório");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim(),
          language,
          templateId: templateId !== "default" ? templateId : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Erro ao criar projeto");
        return;
      }

      const { project } = await response.json();
      navigate(`/projects/${project.id}/editor`);
    } catch {
      setError("Erro ao criar projeto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {template && (
        <Card className="mb-6 bg-accent/10 border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{template.name}</h3>
                  <Badge variant="secondary">{template.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                {template.features && template.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Link to="/templates">
                <Button variant="ghost" size="sm">
                  Trocar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Novo Projeto</CardTitle>
          <CardDescription>
            {template
              ? `Criando projeto com template ${template.name}`
              : "Crie um novo projeto de tese ou documento academico"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Projeto</Label>
              <Input
                id="name"
                placeholder={template ? "Meu Artigo" : "Minha Tese de Doutorado"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Nome interno para organizar seus projetos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                {template ? "Titulo do Artigo" : "Titulo da Tese"}
              </Label>
              <Input
                id="title"
                placeholder="Um Estudo Sobre..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Titulo que aparecera no documento
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Idioma Principal</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                  <SelectItem value="en-US">Inglês</SelectItem>
                  <SelectItem value="fr-FR">Francês</SelectItem>
                  <SelectItem value="es-ES">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => navigate("/projects")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Projeto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
