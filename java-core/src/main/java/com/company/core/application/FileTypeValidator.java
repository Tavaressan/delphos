package com.company.core.application;

import org.apache.tika.Tika;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Valida que o conteúdo real de um arquivo (magic bytes) corresponde à extensão
 * declarada, para impedir upload de conteúdo malicioso disfarçado de documento
 * confiável (issue #178).
 */
@Component
public class FileTypeValidator {

    private final Tika tika = new Tika();

    private static final Set<String> SUPPORTED_EXTENSIONS = Set.of("pdf", "docx", "txt", "md");

    public static class ValidationException extends IllegalArgumentException {
        public ValidationException(String message) {
            super(message);
        }
    }

    /**
     * Detecta o MIME real via magic bytes (sem usar o nome do arquivo como pista) e
     * valida contra a extensão declarada. Lança {@link ValidationException} se a
     * extensão não é suportada ou se o conteúdo não corresponde ao tipo esperado.
     */
    public void validate(byte[] content, String extension) {
        String ext = extension == null ? "" : extension.toLowerCase();
        if (!SUPPORTED_EXTENSIONS.contains(ext)) {
            throw new ValidationException("Extensão de arquivo não suportada: '" + ext + "'.");
        }

        String detectedMime = tika.detect(content);

        switch (ext) {
            case "pdf" -> {
                if (!"application/pdf".equals(detectedMime)) {
                    throw mismatch(ext, detectedMime);
                }
            }
            case "txt", "md" -> {
                if (!detectedMime.startsWith("text/")) {
                    throw mismatch(ext, detectedMime);
                }
            }
            case "docx" -> {
                // tika-core sozinho (sem tika-parsers) só reconhece a assinatura ZIP
                // genérica; a checagem das entradas internas do OOXML abaixo é o que
                // efetivamente distingue um .docx real de um ZIP qualquer renomeado.
                if (!detectedMime.equals("application/zip") && !detectedMime.startsWith("application/x-tika")) {
                    throw mismatch(ext, detectedMime);
                }
                if (!looksLikeOoxmlDocx(content)) {
                    throw new ValidationException(
                            "Conteúdo do arquivo não corresponde a um .docx válido (estrutura OOXML ausente).");
                }
            }
            default -> throw new ValidationException("Extensão de arquivo não suportada: '" + ext + "'.");
        }
    }

    private ValidationException mismatch(String ext, String detectedMime) {
        return new ValidationException(
                "Conteúdo do arquivo não corresponde à extensão declarada ('" + ext
                        + "'). Tipo detectado: " + detectedMime + ".");
    }

    private boolean looksLikeOoxmlDocx(byte[] content) {
        boolean hasContentTypes = false;
        boolean hasWordDocument = false;
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(content))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String name = entry.getName();
                if ("[Content_Types].xml".equals(name)) {
                    hasContentTypes = true;
                } else if ("word/document.xml".equals(name)) {
                    hasWordDocument = true;
                }
                zis.closeEntry();
            }
        } catch (IOException e) {
            return false;
        }
        return hasContentTypes && hasWordDocument;
    }
}
