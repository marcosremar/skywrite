export interface VerdictCase {
  claim: string;
  source: string;
  expected: "supported" | "partial" | "unsupported" | "uncertain";
}

export const VERDICT_CASES: VerdictCase[] = [
  {
    claim: "A inteligência artificial melhora a retenção de vocabulário em aprendizes de língua estrangeira.",
    source: "Em um experimento controlado com 120 estudantes, o grupo que usou o aplicativo de IA reteve 31% mais vocabulário após quatro semanas do que o grupo controle (p < 0,01).",
    expected: "supported",
  },
  {
    claim: "Gamificação aumenta a motivação intrínseca dos alunos.",
    source: "O estudo encontrou que a gamificação aumentou o engajamento de curto prazo, mas não houve efeito significativo sobre a motivação intrínseca medida pela escala IMI.",
    expected: "unsupported",
  },
  {
    claim: "O feedback automatizado por IA é tão eficaz quanto o feedback de professores humanos.",
    source: "O feedback da IA foi eficaz para erros gramaticais de superfície, porém inferior ao feedback humano em aspectos de argumentação e estrutura.",
    expected: "partial",
  },
  {
    claim: "Aplicativos móveis de idiomas reduzem a ansiedade linguística.",
    source: "Este artigo discute o design de interfaces de aplicativos móveis e suas affordances pedagógicas, sem medir variáveis afetivas como ansiedade.",
    expected: "uncertain",
  },
  {
    claim: "A prática deliberada é o principal preditor de desempenho especialista.",
    source: "Ericsson e colegas argumentam que a quantidade de prática deliberada explica a maior parte da variância no desempenho de especialistas em diversos domínios.",
    expected: "supported",
  },
  {
    claim: "O uso de ChatGPT melhora a escrita acadêmica de estudantes de graduação.",
    source: "Os autores relatam que o uso de ChatGPT aumentou a fluência percebida, mas reduziu o engajamento crítico dos estudantes com as fontes.",
    expected: "partial",
  },
  {
    claim: "A teoria sociocultural de Vygotsky fundamenta a aprendizagem colaborativa.",
    source: "Vygotsky propõe que o desenvolvimento cognitivo ocorre primeiro no plano social e depois no individual, com a zona de desenvolvimento proximal mediando a aprendizagem com pares mais capazes.",
    expected: "supported",
  },
  {
    claim: "A imersão total é mais eficaz que a instrução formal para adultos.",
    source: "A meta-análise não encontrou diferença estatisticamente significativa entre imersão e instrução formal para aprendizes adultos em ganhos de proficiência geral.",
    expected: "unsupported",
  },
  {
    claim: "O ensino híbrido aumenta a aprovação em cursos de língua.",
    source: "O texto revisa políticas institucionais de ensino híbrido sem apresentar dados de aprovação ou desempenho dos alunos.",
    expected: "uncertain",
  },
  {
    claim: "Redes neurais profundas superam métodos clássicos em reconhecimento de imagem.",
    source: "A arquitetura proposta reduziu o erro top-5 no ImageNet de 26% para 15,3%, superando substancialmente as abordagens anteriores baseadas em características manuais.",
    expected: "supported",
  },
  {
    claim: "O dropout elimina completamente o overfitting em redes neurais.",
    source: "O dropout reduz o overfitting ao impedir a coadaptação de neurônios, melhorando a generalização, embora não o elimine totalmente.",
    expected: "partial",
  },
  {
    claim: "Estudantes que usam flashcards espaçados têm pior retenção.",
    source: "A repetição espaçada com flashcards produziu retenção significativamente maior do que a revisão massificada em todos os intervalos testados.",
    expected: "unsupported",
  },
  {
    claim: "A correção entre pares melhora a qualidade da escrita.",
    source: "Os trabalhos revisados por pares apresentaram melhorias na organização e coesão em comparação com a condição sem revisão.",
    expected: "supported",
  },
  {
    claim: "O uso de legendas em vídeos prejudica a compreensão oral.",
    source: "Os participantes que assistiram com legendas tiveram desempenho ligeiramente superior em compreensão, sem diferença significativa na produção oral.",
    expected: "unsupported",
  },
  {
    claim: "A motivação dos alunos depende do estilo de liderança do professor.",
    source: "Este estudo de caso descreve a implementação de um currículo de robótica e não examina estilos de liderança docente.",
    expected: "uncertain",
  },
  {
    claim: "A aprendizagem baseada em projetos desenvolve pensamento crítico.",
    source: "Alunos em turmas com aprendizagem baseada em projetos obtiveram escores mais altos em uma rubrica de pensamento crítico do que os de aulas expositivas.",
    expected: "supported",
  },
  {
    claim: "Tecnologias de IA garantem equidade no acesso à educação.",
    source: "Os autores alertam que ferramentas de IA podem ampliar desigualdades quando o acesso a dispositivos e internet é desigual.",
    expected: "unsupported",
  },
  {
    claim: "A ansiedade reduz o desempenho em tarefas de produção oral.",
    source: "Houve correlação negativa moderada entre os escores de ansiedade linguística e o desempenho em tarefas de fala espontânea (r = -0,42).",
    expected: "supported",
  },
  {
    claim: "Chatbots conversacionais aumentam a fluência escrita em uma semana.",
    source: "O estudo durou doze semanas e mediu fluência oral; não há dados sobre fluência escrita nem sobre intervalos de uma semana.",
    expected: "uncertain",
  },
  {
    claim: "O ensino explícito de gramática não tem efeito sobre a precisão.",
    source: "O grupo com instrução gramatical explícita apresentou maior precisão em estruturas-alvo do que o grupo apenas com input implícito.",
    expected: "unsupported",
  },
];
