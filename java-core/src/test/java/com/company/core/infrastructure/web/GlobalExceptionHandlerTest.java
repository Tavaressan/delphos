package com.company.core.infrastructure.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Reproduz o bug da issue #110: upload de um pacote ZIP de agente maior que o limite padrão do
 * Spring Boot (1MB) resultava em MaxUploadSizeExceededException não tratada, retornando 500 sem
 * mensagem clara para o usuário. O GlobalExceptionHandler deve converter isso em um erro 413 com
 * mensagem explícita.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleMaxUploadSizeExceeded_returnsPayloadTooLargeWithClearMessage() {
        MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(25L * 1024 * 1024);

        ResponseEntity<Map<String, Object>> response = handler.handleMaxUploadSizeExceeded(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("error").toString())
                .contains("excede o tamanho máximo permitido");
    }

    /**
     * Issue #247: exceções genéricas não mapeadas não podem vazar detalhes internos
     * (mensagens de driver JDBC, hosts internos, etc.) para o corpo da resposta HTTP.
     */
    @Test
    void handleGenericException_returnsInternalServerErrorWithoutLeakingOriginalMessage() {
        RuntimeException ex = new RuntimeException(
                "FATAL: password authentication failed for user \"core_admin\" at db-internal.company.local:5432");

        ResponseEntity<Map<String, Object>> response = handler.handleGenericException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("error").toString())
                .isEqualTo(GlobalExceptionHandler.GENERIC_ERROR_MESSAGE)
                .doesNotContain("db-internal.company.local")
                .doesNotContain("core_admin");
    }
}
