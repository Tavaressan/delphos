# ADR 0004 - document-processing como serviço órfão: parsing/OCR simulados e remoção temporária do CD

## Status
🟡 ACEITO (decisão de escopo confirmada pelo usuário na issue #270, 2026-07-20)

## Contexto
`rust-services/document-processing` expõe parsers para PDF, DOCX, HTML, Markdown e TXT, mas dois
deles são simulações que não fazem parsing real:

1. `DocxParser::parse` (`src/main.rs:408-420`) executa `String::from_utf8_lossy(bytes)` diretamente
   sobre o binário ZIP/XML de um `.docx`, produzindo texto ilegível. O padrão correto já existe no
   monorepo em `rust-services/ingestion-worker/src/main.rs:619-630`, que usa a crate `docx_rs` para
   extrair texto real — mas essa dependência não foi adicionada a `document-processing`.
2. O fallback de "OCR" em `PdfParser` (`src/main.rs:326-341`) também faz `from_utf8_lossy` sobre
   bytes brutos de PDF, apesar de existirem variáveis de configuração `OCR_ENABLED`/`OCR_LANG`. Não
   há nenhuma crate de OCR (ex.: binding para Tesseract) em `Cargo.toml`.

Além disso, investigação empírica confirmou que o serviço está órfão do stack em execução:
- Não aparece em `docker-compose.yml`.
- Não aparece em `infrastructure/kubernetes`.
- Nenhum outro serviço do monorepo (java-core, ingestion-worker, rag-worker, etc.) o referencia ou
  faz chamada HTTP para ele — confirmado por busca textual em todo o repositório.
- Apesar disso, o serviço é buildado e deployado no Cloud Run via
  `.github/workflows/cd.yml` (job `deploy-rust`, matrix `service`), i.e., o CD publica uma imagem
  Docker e faz deploy de um serviço sem nenhum consumidor real.

## Decisão
Não implementar parsing DOCX real nem OCR real nesta issue. Em vez disso:
1. Documentar formalmente, via este ADR, que `document-processing` não está em uso pretendido no
   momento (nenhum consumidor real, ausente de docker-compose/k8s).
2. Remover `document-processing` da matrix de deploy em `.github/workflows/cd.yml` (job
   `deploy-rust`), para que o CD pare de publicar/deployar uma imagem de um serviço órfão.
3. O código do serviço permanece no monorepo (não foi apagado) para permitir reintegração futura.

## Justificativa
- **Custo vs. valor**: implementar parsing DOCX real (`docx_rs`) e OCR real (ex.: binding
  Tesseract) exigiria nova dependência de sistema e esforço de engenharia não trivial, para um
  serviço que hoje não é chamado por nenhum componente do stack — o esforço não teria efeito
  observável em produção até que o serviço seja de fato integrado.
- **Risco de "deploys fantasma"**: manter o serviço na matrix do CD gera builds e deploys
  contínuos no Cloud Run de uma imagem sem consumidor, consumindo cota/tempo de CI e possivelmente
  gerando custo de infraestrutura sem benefício.
- **Reversibilidade**: a remoção do CD é uma mudança de baixo risco e trivialmente reversível
  (basta readicionar a linha na matrix) quando o serviço for de fato integrado ao stack
  (docker-compose/k8s) com um consumidor real e parsing/OCR reais implementados.

## Próximos passos (fora do escopo desta issue)
Ao decidir integrar `document-processing` ao stack:
1. Adicionar `docx_rs` (ou equivalente) e reescrever `DocxParser::parse` seguindo o padrão de
   `ingestion-worker/src/main.rs:619-630`.
2. Adicionar uma crate/binding real de OCR para substituir o fallback simulado em `PdfParser`.
3. Adicionar testes com fixtures reais (`.docx`, PDF escaneado) confirmando texto legível extraído.
4. Integrar o serviço a `docker-compose.yml` e/ou `infrastructure/kubernetes` com um consumidor
   real (ex.: chamado por `ingestion-worker` ou `rag-worker`).
5. Readicionar `document-processing` à matrix de deploy em `.github/workflows/cd.yml`.

## Referências
- Issue #270
- `rust-services/document-processing/src/main.rs:326-341,408-420`
- `rust-services/ingestion-worker/src/main.rs:619-630`
- `.github/workflows/cd.yml`
