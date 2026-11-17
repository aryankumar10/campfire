package com.campfire.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.Duration;

@Service
public class S3Service {

    private final S3Presigner s3Presigner;
    private final S3Client s3Client;

    @Value("${aws.s3.bucket:campfire-attachments}")
    private String bucketName;

    public S3Service(S3Presigner s3Presigner, S3Client s3Client) {
        this.s3Presigner = s3Presigner;
        this.s3Client = s3Client;
    }

    public String generateUploadUrl(String key) {
        return generateUploadUrl(key, null);
    }

    public String generateUploadUrl(String key, String contentType) {
        PutObjectRequest.Builder putRequestBuilder = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key);

        if (contentType != null && !contentType.trim().isEmpty()) {
            putRequestBuilder.contentType(contentType);
        }

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(5))
                .putObjectRequest(putRequestBuilder.build())
                .build();

        return s3Presigner.presignPutObject(presignRequest).url().toString();
    }

    public String generateDownloadUrl(String key) {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1))
                .getObjectRequest(getRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    public void deleteFile(String uploadKey) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(uploadKey)
                .build());

        try {
            String thumbnailKey = uploadKey.replace("uploads/", "thumbnails/");
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(thumbnailKey)
                    .build());
        } catch (Exception ignored) {
        }
    }

    public String getBucketName() {
        return bucketName;
    }
}
