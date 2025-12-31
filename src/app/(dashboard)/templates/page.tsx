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

const templates = [
  {
    id: "thesis-abnt",
    name: "Tese ABNT",
    description: "Template para teses e dissertacoes seguindo normas ABNT",
    category: "Academico",
    language: "pt-BR",
    features: ["Capa automatica", "Sumario", "Referencias ABNT"],
  },
  {
    id: "thesis-ieee",
    name: "Tese IEEE",
    description: "Template para documentos academicos no padrao IEEE",
    category: "Academico",
    language: "en-US",
    features: ["IEEE format", "Bibliography", "Abstract"],
  },
  {
    id: "article-scientific",
    name: "Artigo Cientifico",
    description: "Template para artigos cientificos com formatacao padrao",
    category: "Artigo",
    language: "pt-BR",
    features: ["Duas colunas", "Abstract", "Referencias"],
  },
  {
    id: "monograph",
    name: "Monografia",
    description: "Template para trabalhos de conclusao de curso (TCC)",
    category: "Academico",
    language: "pt-BR",
    features: ["Capa", "Dedicatoria", "Agradecimentos"],
  },
];

export default function TemplatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-zinc-500">
            Escolha um template para iniciar seu projeto
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant="secondary">{template.category}</Badge>
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
                <p className="text-xs text-zinc-400">
                  Idioma: {template.language}
                </p>
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

      <Card className="mt-8 text-center py-8">
        <CardContent>
          <div className="text-4xl mb-3">🚀</div>
          <h3 className="text-lg font-semibold mb-2">Mais templates em breve</h3>
          <p className="text-zinc-500 text-sm">
            Estamos trabalhando em novos templates para diferentes necessidades academicas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
