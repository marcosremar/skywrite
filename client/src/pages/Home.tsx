import { Link } from "react-router-dom";
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">Skywrite</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button>Comece Gratis</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          Escreva sua tese em <span className="text-primary">Markdown</span>
          <br />
          Exporte em <span className="text-primary">PDF profissional</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Editor intuitivo com preview em tempo real. Suporte a citacoes,
          cross-references, e formatacao academica automatica. Sem precisar saber
          LaTeX.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="h-12 px-8">
              Comecar Agora
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="h-12 px-8">
              Ver Recursos
            </Button>
          </a>
        </div>
      </section>

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
                Titulos, listas, negrito, italico, blocos de codigo e muito mais.
                Tudo com a sintaxe simples do Markdown.
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
              <CardDescription>Veja o PDF enquanto escreve.</CardDescription>
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
                USP, UNICAMP, UFRJ, Sorbonne, e muitas outras. Formatacao correta
                garantida.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🤖</span> Orientador Virtual
              </CardTitle>
              <CardDescription>Feedback com IA fundamentado em fontes reais.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Analise por secao, checklist de qualidade e um chat que busca
                fontes academicas e verifica se suas afirmacoes tem suporte.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="mb-4 text-3xl font-bold text-foreground">
          Comece a escrever hoje
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
          Crie sua conta gratuita e exporte sua primeira tese em PDF.
        </p>
        <Link to="/register">
          <Button size="lg" className="h-12 px-8">
            Criar conta gratis
          </Button>
        </Link>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              Skywrite. Feito para academicos.
            </p>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-primary">Termos</Link>
              <Link to="/privacy" className="hover:text-primary">Privacidade</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
