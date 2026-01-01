import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo size="md" />
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="sm:size-default">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="sm:size-default">Comece Gratis</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 sm:py-24 text-center">
        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Sua tese nas{" "}
          <span className="text-primary">nuvens</span>
          <br />
          <span className="text-muted-foreground text-2xl sm:text-3xl lg:text-4xl font-normal mt-2 block">
            Escreva em Markdown, exporte em PDF
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground px-4">
          Editor intuitivo com preview em tempo real. Suporte a citacoes,
          cross-references, e formatacao academica automatica. Sem precisar
          saber LaTeX.
        </p>
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
          <Link href="/register">
            <Button size="lg" className="h-12 px-8 w-full sm:w-auto">
              Comecar Agora
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="h-12 px-8 w-full sm:w-auto">
              Ver Recursos
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
          Tudo que voce precisa para sua tese
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📝</span> Editor Markdown
              </CardTitle>
              <CardDescription>
                Escreva em Markdown simples. Formatacao academica automatica.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Titulos, listas, negrito, italico, blocos de codigo e muito
                mais. Tudo com a sintaxe simples do Markdown.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📚</span> Citacoes Automaticas
              </CardTitle>
              <CardDescription>
                Importe do Zotero ou adicione citacoes manualmente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use [@autor2023] e a referencia aparece automaticamente na
                bibliografia. Suporte a APA, ABNT e outros estilos.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🔗</span> Cross-References
              </CardTitle>
              <CardDescription>
                Referencie figuras, tabelas e secoes facilmente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use [@fig:minha-figura] e o numero da figura e atualizado
                automaticamente. Mesmo com [@sec:secao] e [@tbl:tabela].
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">👁️</span> Preview em Tempo Real
              </CardTitle>
              <CardDescription>
                Veja o PDF enquanto escreve.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Atualizacao automatica do preview conforme voce edita. Sem
                precisar compilar manualmente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🎨</span> Templates Prontos
              </CardTitle>
              <CardDescription>
                Modelos de universidades brasileiras e internacionais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                USP, UNICAMP, UFRJ, Sorbonne, e muitas outras. Formatacao
                correta garantida.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🌍</span> Multi-idioma
              </CardTitle>
              <CardDescription>
                Traducao automatica com IA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Escreva em portugues, exporte em frances ou ingles. Citacoes e
                referencias preservadas.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
          Precos Simples
        </h2>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Gratis</CardTitle>
              <CardDescription>Para comecar</CardDescription>
              <p className="text-4xl font-bold text-primary">R$0</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>1 projeto</li>
                <li>10 builds/mes</li>
                <li>100MB de armazenamento</li>
                <li>Templates basicos</li>
              </ul>
              <Link href="/register" className="mt-6 block">
                <Button className="w-full" variant="outline">
                  Comecar Gratis
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <CardDescription>Para quem leva a serio</CardDescription>
              <p className="text-4xl font-bold text-primary">R$29/mes</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Projetos ilimitados</li>
                <li>Builds ilimitados</li>
                <li>10GB de armazenamento</li>
                <li>Todos os templates</li>
                <li>Traducao com IA</li>
                <li>Suporte prioritario</li>
              </ul>
              <Link href="/register" className="mt-6 block">
                <Button className="w-full">Assinar Pro</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="text-sm text-muted-foreground">
                Feito para academicos.
              </span>
            </div>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-primary transition-colors">
                Termos
              </Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacidade
              </Link>
              <Link href="/docs" className="hover:text-primary transition-colors">
                Documentacao
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
