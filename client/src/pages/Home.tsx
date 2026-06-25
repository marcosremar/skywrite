import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const reveal = (delay: number) => ({ animation: "slide-up 0.7s ease both", animationDelay: `${delay}ms` });

const features = [
  { n: "01", title: "Editor Markdown", body: "Escreva em Markdown limpo. Formatação acadêmica automática, sem tocar em LaTeX." },
  { n: "02", title: "Preview em tempo real", body: "O PDF se redesenha enquanto você escreve. Nada de compilar à mão." },
  { n: "03", title: "Citações & ABNT", body: "Use [@autor2023]; importe Zotero/RIS, complete por DOI no Crossref, valide a integridade das referências." },
  { n: "04", title: "Cross-references", body: "Figuras, tabelas e seções renumeram sozinhas — [@fig:x], [@tbl:y], [@sec:z]." },
  { n: "05", title: "Templates de banca", body: "Modelos de tese e de periódico, com a formatação correta garantida." },
  { n: "06", title: "Orientador Virtual", body: "Feedback com IA fundamentado em fontes reais — analisa por seção e verifica se suas afirmações têm suporte." },
];

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[6%] top-[6%] select-none font-[family-name:var(--font-display)] text-[24rem] leading-none italic text-foreground/[0.022] sm:text-[34rem]"
      >
        tese
      </div>

      <header className="relative z-10 border-b border-border/60">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <span className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
            Skywrite
          </span>
          <nav className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button>Comece grátis</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="container mx-auto px-6 pb-28 pt-24 sm:pt-32">
          <p
            style={reveal(0)}
            className="mb-8 font-[family-name:var(--font-code)] text-xs uppercase tracking-[0.32em] text-primary"
          >
            Plataforma de escrita de teses
          </p>
          <h1
            style={reveal(80)}
            className="max-w-5xl font-[family-name:var(--font-display)] text-6xl font-light leading-[0.98] tracking-tight text-foreground sm:text-8xl"
          >
            Escreva sua tese.
            <br />
            <span className="italic text-primary">Exporte</span> um PDF de banca.
          </h1>
          <p style={reveal(180)} className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Editor live-preview, citações ABNT que se conferem sozinhas e um Orientador com IA que busca
            fontes e checa suas afirmações. Tudo em Markdown, exportado em PDF acadêmico.
          </p>
          <div style={reveal(280)} className="mt-12 flex flex-wrap items-center gap-4">
            <Link to="/register">
              <Button size="lg" className="h-12 px-8 text-base">
                Começar agora
              </Button>
            </Link>
            <a href="#recursos">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Ver recursos
              </Button>
            </a>
          </div>
          <p
            style={reveal(380)}
            className="mt-14 font-[family-name:var(--font-code)] text-xs uppercase tracking-[0.2em] text-muted-foreground/70"
          >
            Markdown · Citeproc/ABNT · Orientador com IA · PDF via Tectonic
          </p>
        </section>

        <section id="recursos" className="border-t border-border/60">
          <div className="container mx-auto px-6 py-24">
            <div className="mb-16 flex items-end justify-between gap-6">
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-light tracking-tight text-foreground sm:text-5xl">
                O ofício, sem o atrito.
              </h2>
              <span className="hidden font-[family-name:var(--font-code)] text-xs uppercase tracking-[0.2em] text-muted-foreground/70 sm:block">
                06 recursos
              </span>
            </div>
            <div className="grid gap-x-12 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <article key={f.n} className="group border-t border-border pt-5">
                  <div className="font-[family-name:var(--font-code)] text-sm text-primary/80">{f.n}</div>
                  <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-normal text-foreground transition-colors group-hover:text-primary">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60">
          <div className="container mx-auto px-6 py-28 text-center">
            <h2 className="mx-auto max-w-3xl font-[family-name:var(--font-display)] text-5xl font-light leading-tight tracking-tight text-foreground sm:text-6xl">
              Sua primeira tese em PDF começa em um clique.
            </h2>
            <Link to="/register" className="mt-12 inline-block">
              <Button size="lg" className="h-12 px-10 text-base">
                Criar conta grátis
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <p className="font-[family-name:var(--font-code)] text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
            Skywrite — feito para acadêmicos
          </p>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/terms" className="transition-colors hover:text-primary">Termos</Link>
            <Link to="/privacy" className="transition-colors hover:text-primary">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
