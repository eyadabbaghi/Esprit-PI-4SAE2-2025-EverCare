package com.example.medicalrecordservice.service;

import com.example.medicalrecordservice.dto.MedicalHistoryCreateRequest;
import com.example.medicalrecordservice.entity.MedicalHistory;
import com.example.medicalrecordservice.entity.MedicalRecord;
import com.example.medicalrecordservice.repository.MedicalHistoryRepository;
import com.example.medicalrecordservice.repository.MedicalRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicalHistoryService {

    private final MedicalHistoryRepository historyRepository;
    private final MedicalRecordRepository recordRepository;
    private final MedicalRecordService medicalRecordService;

    public MedicalHistory addToRecord(UUID recordId, MedicalHistoryCreateRequest request) {
        MedicalRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalRecord not found"));

        medicalRecordService.ensureRecordIsActive(record);

        if (request.getDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date cannot be in the future");
        }

        String normalizedDescription = normalizeDescription(request.getDescription());
        if (historyRepository.existsByMedicalRecordIdAndTypeAndDateAndDescription(
                recordId,
                request.getType(),
                request.getDate(),
                normalizedDescription
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Duplicate history entry (same type, date and description) is not allowed");
        }

        MedicalHistory history = MedicalHistory.builder()
                .type(request.getType())
                .date(request.getDate())
                .description(normalizedDescription)
                .medicalRecord(record)
                .build();

        return historyRepository.save(history);
    }

    public List<MedicalHistory> listByRecord(UUID recordId) {
        if (!recordRepository.existsById(recordId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalRecord not found");
        }
        return historyRepository.findByMedicalRecordIdOrderByDateDesc(recordId);
    }

    public void delete(UUID recordId, UUID historyId) {
        MedicalRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalRecord not found"));
        medicalRecordService.ensureRecordIsActive(record);

        MedicalHistory history = historyRepository.findByIdAndMedicalRecordId(historyId, recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalHistory not found"));

        historyRepository.delete(history);
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return "";
        }
        return description.trim().replaceAll("\\s+", " ");
    }
}
