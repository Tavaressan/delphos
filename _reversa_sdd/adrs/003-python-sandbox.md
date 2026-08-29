# ADR 003: Sandboxing de Execução de Scripts Python

## Contexto e Problema
A plataforma permite que os pacotes ZIP dos Agentes carreguem `Custom Tools` na forma de scripts Python `.py` soltos (issue #110). Executar código arbitrário submetido pelos usuários no ambiente do worker principal abria vulnerabilidades críticas (RCE, vazamento de secrets de ambiente e crash do host).

## Decisão
Foi decidido arquitetar um módulo `executor_core.py` no `crew-worker` para prover sandboxing via subprocessos. 
O script customizado é executado com a flag `python3 -I` (modo isolado) dentro de um diretório temporário restrito, sem passagem das variáveis de ambiente do host, impondo cotas estritas de timeout e número máximo de caracteres impressos (`MAX_OUTPUT_CHARS`). Adicionalmente, uma validação AST é imposta no momento de upload/carga da tool para vetar imports proibidos (como `os`, `sys`, `subprocess`) e métodos mágicos indesejados.

## Alternativas consideradas
- **WASM (WebAssembly) / Pyodide:** Seguro, porém limita severamente o ecossistema de bibliotecas nativas que analistas de dados costumam querer (pandas, numpy, requests).
- **Docker in Docker (DinD) per Tool:** Subir um container efêmero a cada `ToolCall`. Alta latência e consumo agressivo de recursos para execuções pequenas.
- **MicroVMs (Firecracker):** Exigiria gestão de infraestrutura bare-metal, aumentando brutalmente a complexidade do SaaS no estágio atual.

## Consequências
- 🟢 **Positivo:** Ameaças imediatas contidas; a IA pode errar ou rodar lógicas pesadas sem derrubar o processo pai.
- 🟢 **Positivo:** Overhead computacional razoavelmente baixo.
- 🔴 **Negativo:** O uso de `subprocess` não é 100% à prova de balas em ataques avançados de contenção de kernel comparado a uma MicroVM.
