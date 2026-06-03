# language: pt
Funcionalidade: Segurança e Governança Corporativa

  Como administrador da plataforma de agentes corporativos,
  Eu quero que regras estritas de segurança, MFA, sanitização e isolamento de runtime sejam aplicadas
  Para mitigar riscos de vazamento de dados e execuções maliciosas.

  Cenário: Tentativa de login ou cadastro de email já existente (Anti-Enumeração)
    Dado que existe um usuário cadastrado com o e-mail "auditor@empresa.com"
    Quando um novo usuário tenta se registrar usando o e-mail "auditor@empresa.com"
    Então o sistema deve demorar exatamente 1 segundo para responder
    E deve retornar uma mensagem genérica de sucesso para proteção de identidade

  Cenário: Bloqueio de senhas migradas sob hash inválido MD5
    Dado que a tabela de migração de usuários de banco de dados foi processada
    Quando um usuário com hash de senha antigo MD5 tenta efetuar login
    Então o sistema deve negar o login
    E deve redirecionar o usuário para o fluxo de redefinição obrigatória "force_password_reset"

  Cenário: Tentativa de execução de script não-homologado no Sandbox Groovy
    Dado que o agente executa uma ferramenta baseada em script customizado do usuário
    Quando o script tenta acessar as propriedades reflexivas ".class" ou importar dependências externas via "@Grab"
    Então o Sandbox do "workflow-worker" deve interromper a compilação
    E deve retornar uma "SecurityException" detalhando a violação de segurança AST
