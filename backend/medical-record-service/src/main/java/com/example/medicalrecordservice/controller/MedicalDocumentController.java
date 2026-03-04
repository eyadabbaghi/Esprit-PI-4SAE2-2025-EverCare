package com.example.medicalrecordservice.controller;

import com.example.medicalrecordservice.entity.MedicalDocument;
import com.example.medicalrecordservice.service.MedicalDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medical-records/{recordId}/documents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Validated
public class MedicalDocumentController {

    private final MedicalDocumentService documentService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MedicalDocument> add(@PathVariable UUID recordId, @RequestPart("file") MultipartFile file) {
        MedicalDocument created = documentService.addToRecord(recordId, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<MedicalDocument>> list(@PathVariable UUID recordId) {
        return ResponseEntity.ok(documentService.listByRecord(recordId));
    }

    @GetMapping("/{docId}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID recordId, @PathVariable UUID docId) {
        MedicalDocumentService.DocumentFile documentFile = documentService.getFile(recordId, docId);
        Resource resource = documentFile.resource();
        String fileName = documentFile.document().getFileName();

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .body(resource);
    }

    @DeleteMapping("/{docId}")
    public ResponseEntity<Void> delete(@PathVariable UUID recordId, @PathVariable UUID docId) {
        documentService.delete(recordId, docId);
        return ResponseEntity.noContent().build();
    }
}
