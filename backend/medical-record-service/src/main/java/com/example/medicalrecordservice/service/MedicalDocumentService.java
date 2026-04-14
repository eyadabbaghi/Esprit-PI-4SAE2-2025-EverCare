package com.example.medicalrecordservice.service;

import com.example.medicalrecordservice.entity.MedicalDocument;
import com.example.medicalrecordservice.entity.MedicalRecord;
import com.example.medicalrecordservice.repository.MedicalDocumentRepository;
import com.example.medicalrecordservice.repository.MedicalRecordRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class MedicalDocumentService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024L * 1024L;
    private static final Set<String> ALLOWED_TYPES = Set.of("pdf", "png", "jpg", "jpeg");
    private static final int MAX_DOCUMENTS_PER_RECORD = 20;

    private final MedicalDocumentRepository documentRepository;
    private final MedicalRecordRepository recordRepository;
    private final MedicalRecordService medicalRecordService;

    public MedicalDocumentService(
            MedicalDocumentRepository documentRepository,
            MedicalRecordRepository recordRepository,
            MedicalRecordService medicalRecordService
    ) {
        this.documentRepository = documentRepository;
        this.recordRepository = recordRepository;
        this.medicalRecordService = medicalRecordService;
    }

    @Value("${app.documents.storage-path:uploads/medical-documents}")
    private String storagePath;

    public MedicalDocument addToRecord(UUID recordId, MultipartFile file) {
        MedicalRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalRecord not found"));
        medicalRecordService.ensureRecordIsActive(record);

        validateFile(file);
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "document" : file.getOriginalFilename()).trim();
        String extension = extractExtension(originalFileName);
        String storedFileName = UUID.randomUUID() + "-" + originalFileName;

        if (documentRepository.countByMedicalRecordId(recordId) >= MAX_DOCUMENTS_PER_RECORD) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Maximum number of documents reached for this medical record (" + MAX_DOCUMENTS_PER_RECORD + ")");
        }
        if (documentRepository.existsByMedicalRecordIdAndFileNameIgnoreCase(recordId, originalFileName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A document with the same name already exists for this medical record");
        }

        Path basePath = Paths.get(storagePath).toAbsolutePath().normalize();
        Path targetPath = basePath.resolve(storedFileName).normalize();
        if (!targetPath.startsWith(basePath)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path");
        }

        try {
            Files.createDirectories(basePath);
            file.transferTo(targetPath);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
        }

        MedicalDocument document = new MedicalDocument();
        document.setFileName(originalFileName);
        document.setFileType(extension);
        document.setFilePath(targetPath.toString());
        document.setMedicalRecord(record);

        return documentRepository.save(document);
    }

    public List<MedicalDocument> listByRecord(UUID recordId) {
        if (!recordRepository.existsById(recordId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalRecord not found");
        }
        return documentRepository.findByMedicalRecordId(recordId);
    }

    public DocumentFile getFile(UUID recordId, UUID documentId) {
        if (!recordRepository.existsById(recordId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalRecord not found");
        }

        MedicalDocument document = documentRepository.findByIdAndMedicalRecordId(documentId, recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalDocument not found"));

        Path file = Paths.get(document.getFilePath()).toAbsolutePath().normalize();
        if (!Files.exists(file) || !Files.isReadable(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Stored file not found");
        }

        Resource resource = new FileSystemResource(file);
        return new DocumentFile(document, resource);
    }

    public void delete(UUID recordId, UUID documentId) {
        MedicalRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalRecord not found"));
        medicalRecordService.ensureRecordIsActive(record);

        MedicalDocument existing = documentRepository.findByIdAndMedicalRecordId(documentId, recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalDocument not found"));

        try {
            Files.deleteIfExists(Paths.get(existing.getFilePath()));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete stored file");
        }

        documentRepository.delete(existing);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size must be <= 5MB");
        }

        String extension = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_TYPES.contains(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file type. Allowed: pdf, png, jpg, jpeg");
        }
    }

    private String extractExtension(String fileName) {
        if (!StringUtils.hasText(fileName) || !fileName.contains(".")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
        }

        String extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        if (!StringUtils.hasText(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
        }
        return extension;
    }

    public record DocumentFile(MedicalDocument document, Resource resource) {
    }
}
