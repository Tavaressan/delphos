# ADR 001: Adoção do Deno como runtime padrão do Next.js

## Contexto e Problema
O frontend estava rodando sob o Node.js tradicional, o que exigia gerenciamento de módulos via `node_modules`, `npm` ou `yarn`, e apresentava certas ineficiências em CI e boot time. A adoção de ferramentas mais modernas era um objetivo do projeto (Issue #187 e PR #190).

## Decisão
Foi decidido migrar o runtime padrão do frontend para **Deno**, aproveitando sua compatibilidade com o ecossistema web e o Next.js. O projeto também unificou testes E2E para rodar sob o ecossistema Deno (PR #234).

## Alternativas consideradas
- **Bun:** Descartado por incompatibilidade de certas bibliotecas internas ou instabilidade em sub-componentes.
- **Manter Node.js:** Descartado por não prover ganhos de performance de startup que a infraestrutura necessitava para edge rendering e workflows de CI rápidos.

## Consequências
- 🟢 **Positivo:** Processo de CI acelerado, menor sobrecarga de instalação de pacotes (abandono de `package-lock.json` redundante no frontend - PR #263).
- 🟢 **Positivo:** Ecossistema unificado para scriptings soltos.
- 🔴 **Negativo/Risco:** Curva de aprendizado pontual e dependência de suporte futuro do Deno aos plugins do ecossistema Next/React.
