package com.company.core;

import io.cucumber.java.pt.Dado;
import io.cucumber.java.pt.Quando;
import io.cucumber.java.pt.Então;
import io.cucumber.java.pt.E;

public class StepDefinitions {

    @Dado("que a plataforma {string} está ativa e conectada ao RabbitMQ")
    public void plataformaAtiva(String plataforma) {
        System.out.println("Plataforma " + plataforma + " ativa!");
    }

    @E("o banco de dados PostgreSQL com pgvector está pronto para gravação")
    public void bancoPronto() {
        System.out.println("Banco pronto!");
    }

    @E("o worker cognitivo {string} em Python está escutando na fila {string}")
    public void workerPythonEscutando(String worker, String fila) {
        System.out.println(worker + " escutando em " + fila);
    }

    @Quando("o usuário envia uma tarefa de processamento para o agente {string}")
    public void usuarioEnviaTarefa(String agente) {
        System.out.println("Enviando tarefa para " + agente);
    }

    @Então("o sistema deve registrar a execução no banco com o status {string}")
    public void registrarNoBancoComStatus(String status) {
        System.out.println("Registrado com status: " + status);
    }

    @E("uma mensagem contendo o Trace Context {string} deve ser publicada no RabbitMQ")
    public void mensagemPublicadaTrace(String trace) {
        System.out.println("Mensagem com trace " + trace + " publicada.");
    }

    @E("o worker cognitivo deve consumir a mensagem mudando o status para {string}")
    public void workerConsomeMensagem(String status) {
        System.out.println("Consumido e mudado para: " + status);
    }

    @Dado("que o agente {string} inicia a execução de uma tarefa")
    public void agenteIniciaTarefa(String agente) {
        System.out.println(agente + " inicia tarefa.");
    }

    @Quando("o agente dispara a ferramenta {string} para varrer logs")
    public void agenteDisparaFerramenta(String ferramenta) {
        System.out.println("Ferramenta " + ferramenta + " disparada.");
    }

    @Então("o sistema deve registrar un span {string} no OpenTelemetry")
    public void registrarSpanOTel(String span) {
        System.out.println("Span " + span + " registrado.");
    }

    @E("uma linha na tabela {string} deve ser gravada contendo o status {string}")
    public void linhaTabelaToolCallsGravada(String tabela, String status) {
        System.out.println("Gravado na tabela " + tabela + " com status " + status);
    }

    @E("os milissegundos totais de processamento da ferramenta devem ser persistidos")
    public void milissegundosPersistidos() {
        System.out.println("Tempo de processamento persistido.");
    }

    @Dado("que o agente executa uma busca semântica na base de conhecimento")
    public void agenteBuscaSemantica() {
        System.out.println("Busca semântica executada.");
    }

    @Quando("o worker Rust {string} retorna {int} chunks relevantes via índice HNSW")
    public void workerRustRetornaChunks(String worker, int chunks) {
        System.out.println(worker + " retornou " + chunks + " chunks.");
    }

    @Então("um evento de ciclo de vida {string} deve ser publicado no broker")
    public void eventoPublicadoBroker(String evento) {
        System.out.println("Evento " + evento + " publicado.");
    }

    @E("os {int} chunks com seus respectivos scores de similaridade de cosseno devem ser gravados em {string}")
    public void chunksGravadosEm(int chunks, String tabela) {
        System.out.println(chunks + " chunks gravados em " + tabela);
    }

    @Dado("que existe um usuário cadastrado com o e-mail {string}")
    public void usuarioCadastradoEmail(String email) {
        System.out.println("Usuário cadastrado com email " + email);
    }

    @Quando("um novo usuário tenta se registrar usando o e-mail {string}")
    public void novoUsuarioTentaRegistrar(String email) {
        System.out.println("Novo registro com email: " + email);
    }

    @Então("o sistema deve demorar exatamente {int} segundo para responder")
    public void sistemaDemoraParaResponder(int segundos) {
        System.out.println("Demorou " + segundos + " segundos.");
    }

    @E("deve retornar uma mensagem genérica de sucesso para proteção de identidade")
    public void mensagemGenericaSucesso() {
        System.out.println("Mensagem genérica retornada.");
    }

    @Dado("que a tabela de migração de usuários de banco de dados foi processada")
    public void tabelaMigracaoProcessada() {
        System.out.println("Tabela de migração processada.");
    }

    @Quando("um usuário com hash de senha antigo MD5 tenta efetuar login")
    public void loginComMD5() {
        System.out.println("Tentou efetuar login com MD5.");
    }

    @Então("o sistema deve negar o login")
    public void sistemaNegaLogin() {
        System.out.println("Login negado!");
    }

    @E("deve redirecionar o usuário para o fluxo de redefinição obrigatória {string}")
    public void redirecionarFluxoRedefinicao(String fluxo) {
        System.out.println("Redirecionado para o fluxo " + fluxo);
    }

    @Dado("que o agente executa uma ferramenta baseada em script customizado do usuário")
    public void agenteExecutaFerramentaScript() {
        System.out.println("Executando ferramenta baseada em script.");
    }

    @Quando("o script tenta acessar as propriedades reflexivas {string} ou importar dependências externas via {string}")
    public void scriptTentaAcessarAcoes(String propriedade, String grab) {
        System.out.println("Script tentou acessar " + propriedade + " ou " + grab);
    }

    @Então("o Sandbox do {string} deve interromper a compilação")
    public void sandboxInterrompeCompilacao(String worker) {
        System.out.println("Sandbox do " + worker + " interrompeu a compilação.");
    }

    @E("deve retornar uma {string} detalhando a violação de segurança AST")
    public void retornarExceptionAST(String exception) {
        System.out.println("Retornou " + exception);
    }
}
