# ADR-002: Sandbox de AST para Tools Customizadas de Agente

## Status
Aceito (Retroativo)

## Contexto
O sistema permitiu o upload de Agentes via arquivo `.zip`, contendo as definições de prompt e uma pasta `tools/` com scripts em Python puro (custom skills). A execução arbitrária de código Python (`eval`/`exec`) num worker containerizado apresenta extremo risco (RCE - Remote Code Execution), possibilitando roubo de chaves do GCP ou invasão da rede interna. Histórico (`4a9e63b`, `cd0f38b`, `67f00c7`).

## Decisão
Foi decidido não usar soluções pesadas como VMs ou MicroVMs (Firecracker) por agente, e não barrar totalmente a feature. A execução é isolada através de um Parser AST (`sandboxed_script_tool`), que lê a árvore sintática abstrata do código enviado no ZIP, aplicando uma *allowlist* rigorosa de funções (bloqueando imports, os, sys, subprocess, eval, etc).
Qualquer violação faz o script ser abortado antes da execução do LLM.

## Alternativas consideradas
- Utilizar WebAssembly (Wasm) ou pyodide para rodar as tools. Descartado pelo overhead de desenvolvimento naquele estágio do projeto.
- Rodar docker-in-docker isolado para cada requisição. Descartado pelo impacto latente em tempo de inicialização (cold starts inaceitáveis num pipeline assíncrono interativo).
- Bloquear envio de código totalmente. Rejeitado devido aos requisitos de automação e transformações complexas exigidos pela feature "Skills customizadas".

## Consequências
- **Positivo:** Risco RCE severamente mitigado com altíssima performance (parsing AST é milissegundos).
- **Negativo:** Funcionalidades avançadas de `tools` ficam limitadas aos métodos expostos na allowlist, podendo gerar atritos de desenvolvedor para terceiros elaborando agentes complexos.
