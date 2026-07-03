/**
 * Valida o nome do arquivo selecionado para upload de pacote de agente.
 *
 * Upload de `.md` avulso nunca foi suportado por design: o formato exigido é sempre um `.zip`
 * contendo pelo menos um `.md` na raiz com as diretrizes de comportamento do agente (ver
 * AgentService#parseZip no backend). Retorna uma mensagem explicando isso em vez de uma
 * rejeição vaga (issue #110).
 */
export function validateAgentZipFileName(fileName: string): string | null {
  if (!fileName.toLowerCase().endsWith('.zip')) {
    return 'Formato inválido: envie um arquivo .zip contendo pelo menos um arquivo .md na raiz com as diretrizes do agente (upload de .md avulso não é suportado).';
  }
  return null;
}
