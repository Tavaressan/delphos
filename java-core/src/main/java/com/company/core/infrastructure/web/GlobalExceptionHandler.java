package com.company.core.infrastructure.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.HashMap;
import java.util.Map;

/**
 * Trata exceções lançadas antes de chegar aos controllers (ex.: durante a resolução do multipart
 * request), garantindo mensagens de erro claras em vez do 500 genérico do container.
 *
 * Ver issue #110: upload de pacote ZIP de agente falhava com MaxUploadSizeExceededException não
 * tratada quando o arquivo excedia o limite padrão do Spring Boot (1MB), mesmo dentro do limite de
 * 20MB descompactado aceito pela regra de negócio em AgentService.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Mensagem genérica devolvida ao cliente para qualquer exceção interna não mapeada, evitando
     * vazar detalhes sensíveis (stack trace, mensagens de driver JDBC, hosts internos, etc.) —
     * ver issue #247.
     */
    public static final String GENERIC_ERROR_MESSAGE = "Ocorreu um erro interno. Tente novamente mais tarde.";

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", "O arquivo enviado excede o tamanho máximo permitido para upload.");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(error);
    }

    /**
     * Rede de segurança para qualquer exceção não tratada explicitamente pelos controllers: loga
     * a causa raiz internamente e devolve uma mensagem genérica ao cliente, sem expor detalhes de
     * implementação (ver issue #247).
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("Erro não tratado ao processar requisição", ex);
        Map<String, Object> error = new HashMap<>();
        error.put("error", GENERIC_ERROR_MESSAGE);
        return ResponseEntity.internalServerError().body(error);
    }
}
