package com.company.core.interfaces.rest;

import com.company.core.domain.entities.Document;
import com.company.core.domain.entities.FailedJob;
import com.company.core.domain.repositories.DocumentRepository;
import com.company.core.domain.repositories.FailedJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class FailedJobController {

    private static final Logger log = LoggerFactory.getLogger(FailedJobController.class);

    private final FailedJobRepository failedJobRepository;
    private final DocumentRepository documentRepository;
    private final RabbitTemplate rabbitTemplate;

    public FailedJobController(FailedJobRepository failedJobRepository,
                               DocumentRepository documentRepository,
                               RabbitTemplate rabbitTemplate) {
        this.failedJobRepository = failedJobRepository;
        this.documentRepository = documentRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @GetMapping("/api/admin/failed-jobs")
    public ResponseEntity<?> listFailedJobs(
            @RequestParam("tenantId") String tenantIdStr,
            Pageable pageable) {
        try {
            UUID tenantId = UUID.fromString(tenantIdStr);
            Page<FailedJob> page = failedJobRepository.findByTenantId(tenantId, pageable);
            return ResponseEntity.ok(page);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "tenantId inválido"));
        }
    }

    @PostMapping("/api/documents/{id}/retry")
    public ResponseEntity<?> retryDocument(@PathVariable("id") UUID documentId) {
        List<FailedJob> jobs = failedJobRepository.findByDocumentIdOrderByCreatedAtDesc(documentId);
        if (jobs.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        FailedJob job = jobs.get(0);

        Document document = documentRepository.findById(documentId).orElse(null);
        String previousStatus = document != null ? document.getStatus() : null;
        String previousProcessingError = document != null ? document.getProcessingError() : null;

        if (document != null) {
            document.setStatus("PROCESSING");
            document.setProcessingError(null);
            documentRepository.save(document);
        }

        try {
            rabbitTemplate.convertAndSend(
                    "agent.execution.exchange",
                    "document.ingestion.jobs",
                    job.getPayload());
        } catch (Exception e) {
            log.error("Failed to publish retry job to RabbitMQ for document {}: {}", documentId, e.getMessage(), e);
            if (document != null) {
                document.setStatus(previousStatus);
                document.setProcessingError(previousProcessingError);
                documentRepository.save(document);
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Falha ao publicar job de retry no RabbitMQ. O documento foi preservado no estado anterior.",
                    "documentId", documentId));
        }

        job.setRetryCount(job.getRetryCount() + 1);
        failedJobRepository.save(job);

        log.info("Retry triggered for document {} (attempt {})", documentId, job.getRetryCount());
        return ResponseEntity.ok(Map.of(
                "documentId", documentId,
                "retryCount", job.getRetryCount(),
                "status", "PROCESSING"));
    }
}