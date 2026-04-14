package com.example.medicalrecordservice.service;

import com.example.medicalrecordservice.dto.MedicalHistoryCreateRequest;
import com.example.medicalrecordservice.entity.MedicalHistory;
import com.example.medicalrecordservice.entity.MedicalHistoryType;
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

    private static final long MAX_ENTRIES_PER_DAY = 10;
    private static final long MAX_ENTRIES_PER_TYPE_PER_DAY = 4;

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
        enforceAdvancedHistoryRules(recordId, request.getType(), request.getDate(), normalizedDescription);

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

    private void enforceAdvancedHistoryRules(
            UUID recordId,
            MedicalHistoryType type,
            LocalDate date,
            String description
    ) {
        long entriesToday = historyRepository.countByMedicalRecordIdAndDate(recordId, date);
        if (entriesToday >= MAX_ENTRIES_PER_DAY) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Daily history limit reached (" + MAX_ENTRIES_PER_DAY + " entries/day)");
        }

        long entriesByTypeToday = historyRepository.countByMedicalRecordIdAndDateAndType(recordId, date, type);
        if (entriesByTypeToday >= MAX_ENTRIES_PER_TYPE_PER_DAY) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Daily history limit reached for type " + type + " (" + MAX_ENTRIES_PER_TYPE_PER_DAY + " entries/day)");
        }

        switch (type) {
            case INCIDENT -> {
                if (description.length() < 20) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "INCIDENT description must contain at least 20 characters");
                }
            }
            case MEDICATION -> {
                if (!containsNumericValue(description)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "MEDICATION description must include dosage/frequency (numeric value required)");
                }
            }
            case VITAL_SIGN -> {
                if (!containsNumericValue(description)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "VITAL_SIGN description must include a measured value (numeric value required)");
                }
            }
            case CONSULTATION -> {
                // No extra rule for now.
            }
        }
    }

    private boolean containsNumericValue(String value) {
        return value != null && value.matches(".*\\d+([.,]\\d+)?\\s*.*");
    }
}
