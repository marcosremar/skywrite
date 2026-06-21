import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-foreground">Termos de Uso</h1>
        <div className="mt-8 space-y-4 text-sm text-muted-foreground">
          <p>
            O Skywrite é uma ferramenta para escrever, editar e exportar documentos
            acadêmicos em Markdown. Ao criar uma conta você concorda em usar o serviço
            de forma lícita e por sua conta e risco.
          </p>
          <p>
            Você é responsável pelo conteúdo que cria e armazena. O serviço é fornecido
            "como está", sem garantias de disponibilidade ininterrupta ou ausência de erros.
          </p>
          <p>
            Você pode excluir sua conta e todos os dados associados a qualquer momento em
            Configurações. O uso de funcionalidades de IA pode enviar trechos do seu texto
            a serviços de terceiros apenas para gerar o feedback solicitado.
          </p>
        </div>
      </div>
    </div>
  );
}
