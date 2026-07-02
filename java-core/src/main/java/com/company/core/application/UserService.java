package com.company.core.application;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final MinioClient minioClient;

    @Value("${minio.bucket:agents-data}")
    private String minioBucket = "agents-data";

    @Value("${minio.url:http://localhost:9000}")
    private String minioUrl;

    public UserService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    public String uploadAvatar(UUID userId, MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo de avatar vazio.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Arquivo de avatar deve ser uma imagem.");
        }

        String extension = getFileExtension(file.getOriginalFilename());
        String objectPath = "avatars/" + userId + "." + extension;

        try (InputStream is = file.getInputStream()) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(minioBucket)
                    .object(objectPath)
                    .stream(is, file.getSize(), -1L)
                    .contentType(contentType)
                    .build());
        }

        String avatarUrl = minioUrl.replaceAll("/$", "") + "/" + minioBucket + "/" + objectPath;
        log.info("Avatar uploaded for user {}: {}", userId, avatarUrl);
        return avatarUrl;
    }

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "png";
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    }
}
