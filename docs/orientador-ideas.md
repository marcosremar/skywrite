# Orientador Virtual — Ideias de features (pesquisa de concorrentes)

Pesquisa multi-fonte (22 fontes, verificação adversarial). Posicionamento: **nenhum produto combina exatamente o diferencial do Skywrite** — verificação de afirmações contra o **texto completo** dos papers baixados, com citação do trecho, dentro de um editor de tese com feedback por seção. O mercado se divide em 3 categorias e o Skywrite vive na interseção delas.

## Cenário (onde cada um vive)

| Categoria | Ferramentas | O que validam pro Skywrite |
|---|---|---|
| Copilotos de escrita c/ feedback por seção + score | **Thesify**, **Paperpal**, **Yomu**, RubiSCoT (paper) | O conceito de checklist + score por rubrica por seção |
| Pesquisa / índices de citação c/ snippet em contexto | **Scite** (Smart Citations), **Elicit**, Consensus | Mostrar o trecho de evidência em contexto e classificar suporte/contraste |
| Verificadores de claim/citação | **SemanticCite** (paper, nov/2025), **CiteAudit** (paper), **Manusights Verify** | O core do Skywrite — mas todos com limitações que viram nosso diferencial |

**Diferencial defensável:** Manusights verifica **só o abstract**; Scite mostra a intenção de citação de *terceiros* (não checa a SUA frase). SemanticCite é o que mais espelha o Skywrite (full-text + 4 classes), mas é pesquisa, sem produto/editor.

## Ideias priorizadas

### Alto valor, baixo esforço (fazer já)
1. **Classificação em 4 classes + snippet de evidência** — adotar o esquema do SemanticCite no verificador: cada afirmação vira `Suportada / Parcialmente suportada / Não suportada / Incerta` + o trecho exato que sustenta/refuta. Hoje o Orientador dá veredito em texto livre; formalizar em 4 classes melhora confiança e UX. (prompt + UI)
2. **Relatório de feedback baixável (PDF)** — gerar um PDF com os scores por dimensão + sugestões (como o "Theo's Review" da Thesify). Já temos a infra pandoc→tectonic. (reaproveita o build)
3. **Trecho em contexto** — exibir o snippet de evidência com as frases antes/depois e a seção do paper de onde veio (padrão Scite), não só o link. (UI)

### Alto valor, médio esforço (próximo ciclo)
4. **Checagem "a referência existe mesmo?" (anti-alucinação)** — antes de verificar o claim, confirmar que a fonte citada corresponde a uma publicação real (DOI/metadados via Crossref/OpenAlex/Semantic Scholar). Referências fabricadas por IA são um problema quente (CiteAudit; Paperpal já tem "Reference Checker" sobre 250M+ artigos). (nova etapa no pipeline)
5. **Rubrica multidimensional por seção** — evoluir o checklist atual para uma rubrica com ratings discretos (`Atende / Parcial / Não atende`) por dimensão (tese, uso de evidência, estrutura, cobertura, legibilidade) — padrão RubiSCoT/Thesify. (estende a análise local)
6. **Sugerir fontes para afirmações sem suporte** — quando uma frase faz uma alegação sem citação, o Orientador busca e sugere papers reais para citar (Paperpal "Reference Finder"). Reaproveita a busca SearXNG + ingestão que já temos.

### Adjacente / menor prioridade
7. **Triagem leve de "afirmação sem citação"** — um passe barato que sinaliza frases que afirmam algo sem referência, antes da verificação cara de full-text. (já temos `uncitedAssertions` na análise — só faltava destacar)
8. **Ferramentas de reescrita** (`Parafrasear`, `Tornar acadêmico`) — comuns em Paperpal/Yomu; úteis mas commodity (só reformulam frases).

## Riscos / perguntas em aberto (do próprio relatório)
- **Acurácia é o risco-chave:** sem um benchmark próprio (precision/recall), "verifica de verdade" é marketing. O classificador do Scite teve acurácia baixa em alguns casos. → Vale montar um conjunto de avaliação.
- **Acesso a full-text com paywall:** baixar o texto completo em escala levanta legalidade/custo/cobertura. Concorrentes fogem disso usando abstract/metadados. É o ponto mais delicado do nosso diferencial.
- **Demanda paga:** ninguém cobra premium *só* por verificação de claim (Manusights dá 3/dia grátis). O valor aparece **embutido no editor** — que é exatamente a aposta do Skywrite.

## Fontes principais
- SemanticCite — https://arxiv.org/abs/2511.16198 · https://github.com/sebhaan/semanticcite
- CiteAudit — https://arxiv.org/abs/2602.23452
- RubiSCoT — https://arxiv.org/abs/2510.17309
- Thesify (Pre-Submission Review / Theo's Review) — https://www.thesify.ai/features/pre-submission-review
- Paperpal (Reference Checker / Chat with PDF) — https://paperpal.com/tools/reference-checker · https://paperpal.com/tools/chat-pdf
- Scite (Smart Citations) — https://scite.ai/features
- Manusights (Citation Claim Checker, abstract-only) — https://manusights.com/tools/citation-claim-checker
