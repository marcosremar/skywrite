"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  publisher?: string;
  language: string;
  features: string[];
  citationStyle?: string;
}

// Default template for projects without a specific template
const defaultTemplate: Template = {
  id: "default",
  name: "Tese/Dissertacao Padrao",
  description: "Template padrao para teses e dissertacoes com formatacao academica",
  category: "thesis",
  language: "pt-BR",
  features: ["Capa automatica", "Sumario", "Referencias", "Estrutura academica"],
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([defaultTemplate]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const response = await fetch("/api/templates");
        if (response.ok) {
          const data = await response.json();
          // Combine default template with API templates
          setTemplates([defaultTemplate, ...(data.templates || [])]);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, []);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      journal: "Periodico",
      thesis: "Tese/Dissertacao",
      article: "Artigo",
      conference: "Conferencia",
    };
    return labels[category] || category;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground">
            Escolha um template para iniciar seu projeto
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge variant="secondary">
                    {getCategoryLabel(template.category)}
                  </Badge>
                </div>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {template.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground/70">
                    {template.publisher && (
                      <span>Editora: {template.publisher}</span>
                    )}
                    <span>Idioma: {template.language}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/projects/new?template=${template.id}`}>
                    <Button className="w-full">Usar Template</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8 text-center py-8">
        <CardContent>
          <div className="text-4xl mb-3 text-primary">+</div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Mais templates em breve</h3>
          <p className="text-muted-foreground text-sm">
            Estamos trabalhando em templates para IEEE, ACM, Springer, Elsevier e ABNT
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
