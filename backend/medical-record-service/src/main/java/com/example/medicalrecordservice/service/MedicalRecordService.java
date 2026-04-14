package com.example.medicalrecordservice.service;

import com.example.medicalrecordservice.dto.AutoCreateMedicalRecordRequest;
import com.example.medicalrecordservice.dto.MedicalRecordCreateRequest;
import com.example.medicalrecordservice.dto.MedicalRecordUpdateRequest;
import com.example.medicalrecordservice.entity.AlzheimerStage;
import com.example.medicalrecordservice.entity.MedicalRecord;
import com.example.medicalrecordservice.repository.AssessmentReportRepository;
import com.example.medicalrecordservice.repository.MedicalRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final AssessmentReportRepository assessmentReportRepository;

    public MedicalRecord create(MedicalRecordCreateRequest request) {
        String patientId = normalizePatientId(request.getPatientId());
        if (medicalRecordRepository.existsByPatientId(patientId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "MedicalRecord already exists for this patientId");
        }

        AlzheimerStage stage = request.getAlzheimerStage() == null ? AlzheimerStage.EARLY : request.getAlzheimerStage();
        String bloodGroup = trimToNull(request.getBloodGroup());
        String allergies = trimToNull(request.getAllergies());
        String chronicDiseases = trimToNull(request.getChronicDiseases());
        String emergencyContactName = trimToNull(request.getEmergencyContactName());
        String emergencyContactPhone = trimToNull(request.getEmergencyContactPhone());
        validateEmergencyContactConsistency(stage, emergencyContactName, emergencyContactPhone);

        MedicalRecord record = MedicalRecord.builder()
                .patientId(patientId)
                .bloodGroup(bloodGroup)
                .alzheimerStage(stage)
                .allergies(allergies)
                .chronicDiseases(chronicDiseases)
                .emergencyContactName(emergencyContactName)
                .emergencyContactPhone(emergencyContactPhone)
                .active(true)
                .build();

        try {
            return medicalRecordRepository.save(record);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "MedicalRecord already exists for this patientId");
        }
    }

    public AutoCreateResult autoCreate(AutoCreateMedicalRecordRequest request) {
        String patientId = normalizePatientId(request.getPatientId());
        return medicalRecordRepository.findByPatientId(patientId)
                .map(record -> new AutoCreateResult(record, false))
                .orElseGet(() -> {
                    MedicalRecordCreateRequest createRequest = new MedicalRecordCreateRequest();
                    createRequest.setPatientId(patientId);
                    createRequest.setBloodGroup(request.getBloodGroup());
                    createRequest.setAlzheimerStage(request.getAlzheimerStage());
                    createRequest.setAllergies(request.getAllergies());
                    createRequest.setChronicDiseases(request.getChronicDiseases());
                    createRequest.setEmergencyContactName(request.getEmergencyContactName());
                    createRequest.setEmergencyContactPhone(request.getEmergencyContactPhone());
                    try {
                        return new AutoCreateResult(create(createRequest), true);
                    } catch (ResponseStatusException ex) {
                        if (ex.getStatusCode() == HttpStatus.CONFLICT) {
                            MedicalRecord existing = medicalRecordRepository.findByPatientId(patientId)
                                    .orElseThrow(() -> ex);
                            return new AutoCreateResult(existing, false);
                        }
                        throw ex;
                    }
                });
    }

    public Page<MedicalRecord> findAll(int page, int size, Boolean active) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        if (active == null) {
            return medicalRecordRepository.findAll(pageable);
        }
        return medicalRecordRepository.findByActive(active, pageable);
    }

    public MedicalRecord findById(UUID id) {
        return medicalRecordRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalRecord not found"));
    }

    public MedicalRecord findByPatientId(String patientId) {
        return medicalRecordRepository.findByPatientId(normalizePatientId(patientId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MedicalRecord not found"));
    }

    public MedicalRecord update(UUID id, MedicalRecordUpdateRequest request) {
        MedicalRecord existing = findById(id);
        ensureRecordIsActive(existing);

        String bloodGroup = trimToNull(request.getBloodGroup());
        String allergies = trimToNull(request.getAllergies());
        String chronicDiseases = trimToNull(request.getChronicDiseases());
        String emergencyContactName = trimToNull(request.getEmergencyContactName());
        String emergencyContactPhone = trimToNull(request.getEmergencyContactPhone());

        if (request.getAlzheimerStage() != null) {
            validateStageTransition(existing.getAlzheimerStage(), request.getAlzheimerStage());
            existing.setAlzheimerStage(request.getAlzheimerStage());
        }

        validateEmergencyContactConsistency(existing.getAlzheimerStage(), emergencyContactName, emergencyContactPhone);

        existing.setBloodGroup(bloodGroup);
        existing.setAllergies(allergies);
        existing.setChronicDiseases(chronicDiseases);
        existing.setEmergencyContactName(emergencyContactName);
        existing.setEmergencyContactPhone(emergencyContactPhone);

        return medicalRecordRepository.save(existing);
    }

    public void archive(UUID id) {
        MedicalRecord record = findById(id);
        if (!record.isActive()) {
            return;
        }
        if (assessmentReportRepository.existsByPatientIdAndNeedsAttentionTrueAndActiveTrue(record.getPatientId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot archive medical record with active attention alerts");
        }
        record.setActive(false);
        medicalRecordRepository.save(record);
    }

    public MedicalRecord restore(UUID id) {
        MedicalRecord record = findById(id);
        if (record.isActive()) {
            return record;
        }
        record.setActive(true);
        return medicalRecordRepository.save(record);
    }

    public void ensureRecordIsActive(MedicalRecord record) {
        if (!record.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Archived medical record cannot be modified");
        }
    }

    public StageUpdateResult updateStageFromAssessment(MedicalRecord record, AlzheimerStage suggestedStage) {
        if (record == null || suggestedStage == null) {
            return new StageUpdateResult(record == null ? null : record.getAlzheimerStage(), false);
        }

        if (!record.isActive()) {
            return new StageUpdateResult(record.getAlzheimerStage(), false);
        }

        AlzheimerStage current = record.getAlzheimerStage();
        if (current == null || suggestedStage.ordinal() > current.ordinal()) {
            record.setAlzheimerStage(suggestedStage);
            medicalRecordRepository.save(record);
            return new StageUpdateResult(suggestedStage, true);
        }

        return new StageUpdateResult(current, false);
    }

    private void validateStageTransition(AlzheimerStage current, AlzheimerStage next) {
        if (current == null || next == null) {
            return;
        }
        if (next.ordinal() < current.ordinal()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Alzheimer stage regression is forbidden");
        }
    }

    private String normalizePatientId(String patientId) {
        if (patientId == null || patientId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "patientId is required");
        }
        return patientId.trim();
    }

    private void validateEmergencyContactConsistency(AlzheimerStage stage, String contactName, String contactPhone) {
        boolean hasName = contactName != null && !contactName.isBlank();
        boolean hasPhone = contactPhone != null && !contactPhone.isBlank();

        if (hasName != hasPhone) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Emergency contact name and phone must be provided together");
        }

        if (stage == AlzheimerStage.MIDDLE || stage == AlzheimerStage.LATE) {
            if (!hasName || !hasPhone) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Emergency contact name and phone are required for MIDDLE/LATE stages");
            }
        }
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    public record AutoCreateResult(MedicalRecord record, boolean created) {
    }

    public record StageUpdateResult(AlzheimerStage stage, boolean updated) {
    }
}
