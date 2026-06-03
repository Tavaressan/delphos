# Contrato de Execução de Ferramentas (Tool Execution Contract)

Este documento especifica os requisitos de conformidade, segurança, timeouts e controle de recursos aplicados na execução de ferramentas físicas ou lógicas pelos agentes cognitivos na **Enterprise Agent Operating Platform**.

---

## 1. Regras de Sandboxing e Isolamento de Execução

> [!CAUTION]
> **Isolamento de Segurança de Código Personalizado**
> Ferramentas que necessitam executar trechos de código dinâmico gerados por LLMs ou fornecidos pelos usuários (como scripts Groovy no legado MaxKB4j) não devem rodar diretamente no contexto ou privilégios do worker de origem, sob o risco de vazamentos de variáveis de ambiente do cluster Kubernetes ou execução de exploits.

### Camadas de Isolamento e Segurança Obrigatórias:
1. **Compilação AST Rígida (Scripts):** O analisador AST do compilador deve sanitizar a chamada de script interceptando e bloqueando acessos reflexivos (ex: `.class`, `metaClass`, `declaringClass`), primitivos inseguros e referências estáticas. A anotação `@Grab` de injeção de dependência runtime é proibida.
2. **Runtime Whitelisting & Classloader Isolation:**
   - Whitelist estrita de classes autorizadas da biblioteca padrão (JDK básico e coleções limitadas).
   - Utilização de **Classloader dedicado e isolado** para cada execução de script, prevenindo que um script polua o escopo global ou modifique classes estáticas compartilhadas em runtime.
3. **Bloqueio de Reflexão e Execuções de Processo:**
   - Bloqueio total a chamadas de reflexão do Java (`java.lang.reflect.*`).
   - Bloqueio estrito à instanciação de runtimes do sistema para execução de processos do sistema operacional (ex: `java.lang.Runtime`, `java.lang.ProcessBuilder` são proibidos).
4. **Restrições de I/O de Sistema de Arquivos:**
   - O worker executa o sandbox em um sistema de arquivos montado como somente leitura (*Read-Only File System*).
   - Bloqueio a qualquer leitura/escrita fora de um diretório temporário montado em memória RAM (`/tmp` em tmpfs).
5. **Limitação de Recursos (CPU e Memory Caps):**
   - Cota limite máxima de memória RAM configurada em **128MB** por processo de script.
   - Cota limite máxima de CPU definida a **0.5 vCPU** por thread do sandbox.
   - Limite físico de tamanho do código-fonte do script aceito para compilação (máximo 64KB).

---

## 2. Parâmetros de Timeout, Retry e Serialização

Toda ferramenta registrada na plataforma deve declarar seus limites operacionais em seu arquivo de configuração JSON (acoplado ao `AgentPackage`):

```json
{
  "toolName": "mcp-database-query",
  "timeoutMs": 15000,
  "retry": {
    "maxAttempts": 2,
    "backoffMs": 1000
  },
  "limits": {
    "maxPayloadSizeKb": 512,
    "maxResponseSizeKb": 2048
  },
  "serialization": "JSON"
}
```

### Regras Operacionais Rígidas:
- **Timeouts:** O tempo máximo para execução de qualquer ferramenta é limitado a **15 segundos** por padrão (ajustável até o limite máximo absoluto da plataforma de 45 segundos). Excedido o tempo, a thread do worker aborta a chamada e retorna um status de erro de timeout para o agente cognitivo.
- **Deduplicação de Chamadas em Retry:** A execução de ferramentas não-idempotentes (como envio de notificações, geração de transações financeiras) deve possuir controle de estado transacional. Ferramentas que envolvam chamadas com efeitos colaterais na infraestrutura de dados corporativa não devem executar retries automáticos.
- **Logs de Auditoria:** Cada chamada de ferramenta gera obrigatoriamente uma inserção atômica na tabela `tool_calls` contendo o payload serializado em JSON, o tempo de resposta medido em milissegundos e o status de execução para fins de faturamento e depuração.
