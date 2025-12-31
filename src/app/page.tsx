import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              Thesis Writer
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Comece Gratis</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
          Escreva sua tese em{" "}
          <span className="text-primary">Markdown</span>
          <br />
          Exporte em{" "}
          <span className="text-primary">PDF profissional</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Editor intuitivo com preview em tempo real. Suporte a citacoes,
          cross-references, e formatacao academica automatica. Sem precisar
          saber LaTeX.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="h-12 px-8">
              Comecar Agora
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="h-12 px-8">
              Ver Recursos
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
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
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Escreva em portugues, exporte em frances ou ingles. Citacoes e
                referencias preservadas.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
          Precos Simples
        </h2>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Gratis</CardTitle>
              <CardDescription>Para comecar</CardDescription>
              <p className="text-4xl font-bold">R$0</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
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
              <p className="text-4xl font-bold">R$29/mes</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
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
      <footer className="border-t bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              2025 Thesis Writer. Feito para academicos.
            </p>
            <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white">
                Termos
              </Link>
              <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white">
                Privacidade
              </Link>
              <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-white">
                Documentacao
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
