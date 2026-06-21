import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-foreground">Política de Privacidade</h1>
        <div className="mt-8 space-y-4 text-sm text-muted-foreground">
          <p>
            Coletamos apenas o necessário para o serviço funcionar: nome, e-mail e o
            conteúdo dos seus projetos. A senha é armazenada com hash (bcrypt) e nunca em
            texto puro.
          </p>
          <p>
            Conforme a LGPD, você pode acessar, corrigir e excluir seus dados. A exclusão
            da conta em Configurações remove permanentemente seu usuário e todos os
            projetos, arquivos e builds associados.
          </p>
          <p>
            Funcionalidades de IA (Orientador Virtual) podem enviar trechos do texto e da
            sua pergunta a um serviço de busca e a um modelo de linguagem apenas para
            produzir o feedback. Não vendemos seus dados a terceiros.
          </p>
        </div>
      </div>
    </div>
  );
}
