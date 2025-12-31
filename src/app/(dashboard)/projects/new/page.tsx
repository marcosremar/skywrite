"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, title, language }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Erro ao criar projeto");
        return;
      }

      const { project } = await response.json();
      router.push(`/projects/${project.id}/editor`);
    } catch {
      setError("Erro ao criar projeto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Novo Projeto</CardTitle>
          <CardDescription>
            Crie um novo projeto de tese ou documento academico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Projeto</Label>
              <Input
                id="name"
                placeholder="Minha Tese de Doutorado"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-xs text-zinc-500">
                Nome interno para organizar seus projetos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titulo da Tese</Label>
              <Input
                id="title"
                placeholder="Um Estudo Sobre..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Titulo que aparecera na capa do documento
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Idioma Principal</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Portugues (Brasil)</SelectItem>
                  <SelectItem value="pt-PT">Portugues (Portugal)</SelectItem>
                  <SelectItem value="en-US">Ingles</SelectItem>
                  <SelectItem value="fr-FR">Frances</SelectItem>
                  <SelectItem value="es-ES">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
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
