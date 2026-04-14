package com.example.medicalrecordservice.service;

import com.example.medicalrecordservice.dto.AssessmentCreateRequest;
import com.example.medicalrecordservice.dto.AssessmentDoctorNoteRequest;
import com.example.medicalrecordservice.dto.AssessmentReportResponse;
import com.example.medicalrecordservice.dto.AutoCreateMedicalRecordRequest;
import com.example.medicalrecordservice.entity.AlzheimerStage;
import com.example.medicalrecordservice.entity.AssessmentReport;
import com.example.medicalrecordservice.entity.MedicalRecord;
import com.example.medicalrecordservice.repository.AssessmentReportRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private static final String DISCLAIMER = "Ce rapport est une évaluation préliminaire et ne remplace pas un diagnostic médical.";
    private static final int ALERT_SCORE_THRESHOLD = 15;
    private static final int RAPID_WORSENING_DELTA = 4;
    private static final int RAPID_WORSENING_WINDOW_DAYS = 30;
    private static final int FOLLOW_UP_WINDOW_DAYS = 45;
    private static final int MIN_ASSESSMENT_INTERVAL_MINUTES = 30;

    private final AssessmentReportRepository assessmentReportRepository;
    private final MedicalRecordService medicalRecordService;
    private final ClinicalAlertService clinicalAlertService;
    private final ObjectMapper objectMapper;

    public AssessmentReportResponse createAssessment(AssessmentCreateRequest request) {
        String patientId = normalizePatientId(request.getPatientId());
        validateAnswers(request.getAnswers());

        AssessmentReport latestPreviousReport = assessmentReportRepository
                .findTopByPatientIdAndActiveTrueOrderByCreatedAtDesc(patientId)
                .orElse(null);
        enforceAssessmentSubmissionCooldown(latestPreviousReport);

        int score = request.getAnswers().values().stream().mapToInt(Integer::intValue).sum();
        AlzheimerStage computedStage = computeStage(score);
        AlertEvaluation alertEvaluation = evaluateAlertRules(score, computedStage, latestPreviousReport);
        boolean needsAttention = alertEvaluation.needsAttention();

        MedicalRecord record = ensureMedicalRecordExists(patientId);
        medicalRecordService.updateStageFromAssessment(record, computedStage);

        AssessmentReport report = AssessmentReport.builder()
                .patientId(patientId)
                .patientName(trimToNull(request.getPatientName()))
                .caregiverName(trimToNull(request.getCaregiverName()))
                .answersJson(writeAnswers(request.getAnswers()))
                .score(score)
                .computedStage(computedStage)
                .recommendation(buildRecommendation(computedStage))
                .needsAttention(needsAttention)
                .active(true)
                .build();

        AssessmentReport savedReport = assessmentReportRepository.save(report);
        if (needsAttention) {
            clinicalAlertService.createOpenAlert(savedReport, alertEvaluation.reason());
        }

        return toResponse(savedReport);
    }

    public List<AssessmentReportResponse> listByPatient(String patientId) {
        return assessmentReportRepository
                .findByPatientIdAndActiveTrueOrderByCreatedAtDesc(normalizePatientId(patientId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public Page<AssessmentReportResponse> list(
            int page,
            int size,
            Boolean active,
            AlzheimerStage stage,
            LocalDate fromDate,
            LocalDate toDate,
            String query
    ) {
        if (fromDate != null && toDate != null && toDate.isBefore(fromDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "toDate must be greater than or equal to fromDate");
        }

        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<AssessmentReport> specification = Specification.where(null);

        if (active != null) {
            specification = specification.and((root, ignoredQuery, cb) -> cb.equal(root.get("active"), active));
        }

        if (stage != null) {
            specification = specification.and((root, ignoredQuery, cb) -> cb.equal(root.get("computedStage"), stage));
        }
        if (fromDate != null) {
            LocalDateTime fromDateTime = fromDate.atStartOfDay();
            specification = specification.and((root, ignoredQuery, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), fromDateTime));
        }
        if (toDate != null) {
            LocalDateTime toDateTime = toDate.plusDays(1).atStartOfDay().minusNanos(1);
            specification = specification.and((root, ignoredQuery, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), toDateTime));
        }
        if (query != null && !query.isBlank()) {
            String normalizedQuery = "%" + query.trim().toLowerCase() + "%";
            specification = specification.and((root, ignoredQuery, cb) -> cb.like(cb.lower(root.get("patientName")), normalizedQuery));
        }

        return assessmentReportRepository.findAll(specification, pageable).map(this::toResponse);
    }

    public AssessmentReportResponse getById(UUID id) {
        return toResponse(findActiveById(id));
    }

    public AssessmentReportResponse patchDoctorNote(UUID id, AssessmentDoctorNoteRequest request) {
        AssessmentReport report = findActiveById(id);
        report.setDoctorNote(request.getNote().trim());
        return toResponse(assessmentReportRepository.save(report));
    }

    public Page<AssessmentReportResponse> getAlerts(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        return assessmentReportRepository.findByNeedsAttentionTrueAndActiveTrue(pageable).map(this::toResponse);
    }

    public byte[] downloadPdfPlaceholder(UUID id) {
        AssessmentReport report = findActiveById(id);
        List<String> lines = List.of(
                "Report ID: " + report.getId(),
                "Patient ID: " + safeText(report.getPatientId()),
                "Patient Name: " + safeText(report.getPatientName()),
                "Caregiver Name: " + safeText(report.getCaregiverName()),
                "Score: " + report.getScore(),
                "Computed Stage: " + report.getComputedStage(),
                "Recommendation: " + safeText(report.getRecommendation()),
                "Created At: " + report.getCreatedAt(),
                DISCLAIMER
        );

        return buildPdf(lines);
    }

    private byte[] buildPdf(List<String> lines) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.LETTER);
            document.addPage(page);

            float margin = 50f;
            float y = page.getMediaBox().getHeight() - 60f;
            float bodyLeading = 16f;

            PDPageContentStream content = new PDPageContentStream(document, page);
            content.beginText();
            content.setFont(PDType1Font.HELVETICA_BOLD, 16);
            content.newLineAtOffset(margin, y);
            content.showText(sanitizePdfText("EverCare - Assessment Report"));
            content.endText();
            y -= 28f;

            content.setFont(PDType1Font.HELVETICA, 11);
            for (String line : lines) {
                List<String> wrapped = wrapLine(line, PDType1Font.HELVETICA, 11, page.getMediaBox().getWidth() - (margin * 2));
                for (String wrappedLine : wrapped) {
                    if (y < 60f) {
                        content.close();
                        page = new PDPage(PDRectangle.LETTER);
                        document.addPage(page);
                        content = new PDPageContentStream(document, page);
                        y = page.getMediaBox().getHeight() - 60f;
                        content.setFont(PDType1Font.HELVETICA, 11);
                    }

                    content.beginText();
                    content.newLineAtOffset(margin, y);
                    content.showText(sanitizePdfText(wrappedLine));
                    content.endText();
                    y -= bodyLeading;
                }
                y -= 2f;
            }

            content.close();
            document.save(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate PDF");
        }
    }

    private List<String> wrapLine(String text, PDType1Font font, float fontSize, float maxWidth) throws IOException {
        String normalized = sanitizePdfText(text);
        String[] words = normalized.split("\\s+");
        List<String> wrapped = new ArrayList<>();
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            String candidate = currentLine.isEmpty() ? word : currentLine + " " + word;
            float width = font.getStringWidth(candidate) / 1000f * fontSize;
            if (width <= maxWidth) {
                currentLine.setLength(0);
                currentLine.append(candidate);
            } else {
                if (!currentLine.isEmpty()) {
                    wrapped.add(currentLine.toString());
                }
                currentLine.setLength(0);
                currentLine.append(word);
            }
        }

        if (!currentLine.isEmpty()) {
            wrapped.add(currentLine.toString());
        }

        if (wrapped.isEmpty()) {
            wrapped.add("-");
        }

        return wrapped;
    }

    private String sanitizePdfText(String value) {
        String normalized = Normalizer.normalize(safeText(value), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return normalized.replaceAll("[^\\x20-\\x7E]", "?");
    }

    public void archive(UUID id) {
        AssessmentReport report = findByIdOrThrow(id);
        if (!report.isActive()) {
            return;
        }
        report.setActive(false);
        assessmentReportRepository.save(report);
    }

    public AssessmentReportResponse restore(UUID id) {
        AssessmentReport report = findByIdOrThrow(id);
        if (report.isActive()) {
            return toResponse(report);
        }
        report.setActive(true);
        return toResponse(assessmentReportRepository.save(report));
    }

    private MedicalRecord ensureMedicalRecordExists(String patientId) {
        AutoCreateMedicalRecordRequest autoCreateRequest = new AutoCreateMedicalRecordRequest();
        autoCreateRequest.setPatientId(patientId);
        return medicalRecordService.autoCreate(autoCreateRequest).record();
    }

    private String writeAnswers(Map<String, Integer> answers) {
        try {
            return objectMapper.writeValueAsString(answers);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize answers");
        }
    }

    private Map<String, Integer> readAnswers(String answersJson) {
        try {
            return objectMapper.readValue(answersJson, new TypeReference<>() {});
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to deserialize answers");
        }
    }

    private AssessmentReportResponse toResponse(AssessmentReport report) {
        return AssessmentReportResponse.builder()
                .id(report.getId())
                .patientId(report.getPatientId())
                .patientName(report.getPatientName())
                .caregiverName(report.getCaregiverName())
                .answers(readAnswers(report.getAnswersJson()))
                .score(report.getScore())
                .computedStage(report.getComputedStage())
                .recommendation(report.getRecommendation())
                .doctorNote(report.getDoctorNote())
                .needsAttention(report.isNeedsAttention())
                .active(report.isActive())
                .createdAt(report.getCreatedAt())
                .build();
    }

    private AlzheimerStage computeStage(int score) {
        if (score <= 7) {
            return AlzheimerStage.EARLY;
        }
        if (score <= 14) {
            return AlzheimerStage.MIDDLE;
        }
        return AlzheimerStage.LATE;
    }

    private String buildRecommendation(AlzheimerStage stage) {
        return switch (stage) {
            case EARLY -> "Score bas. Planifier un suivi régulier avec le médecin traitant.";
            case MIDDLE -> "Score intermédiaire. Une consultation spécialisée est recommandée rapidement.";
            case LATE -> "Score élevé. Une prise en charge médicale prioritaire est recommandée.";
        };
    }

    private void validateAnswers(Map<String, Integer> answers) {
        for (Map.Entry<String, Integer> entry : answers.entrySet()) {
            if (entry.getKey() == null || entry.getKey().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Answer key cannot be blank");
            }
            if (entry.getValue() == null || entry.getValue() < 0 || entry.getValue() > 3) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each answer must be between 0 and 3");
            }
        }
    }

    private AlertEvaluation evaluateAlertRules(int score, AlzheimerStage computedStage, AssessmentReport latestPreviousReport) {
        List<String> reasons = new ArrayList<>();

        if (score >= ALERT_SCORE_THRESHOLD) {
            reasons.add("Score élevé (>= " + ALERT_SCORE_THRESHOLD + ").");
        }
        if (computedStage == AlzheimerStage.LATE) {
            reasons.add("Stade LATE détecté.");
        }

        if (latestPreviousReport != null && latestPreviousReport.getCreatedAt() != null) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime previousDate = latestPreviousReport.getCreatedAt();
            int scoreDelta = score - latestPreviousReport.getScore();

            if (!previousDate.isBefore(now.minusDays(RAPID_WORSENING_WINDOW_DAYS)) && scoreDelta >= RAPID_WORSENING_DELTA) {
                reasons.add("Aggravation rapide: +" + scoreDelta + " points sur " + RAPID_WORSENING_WINDOW_DAYS + " jours.");
            }

            if (previousDate.isBefore(now.minusDays(FOLLOW_UP_WINDOW_DAYS))) {
                reasons.add("Absence de suivi depuis plus de " + FOLLOW_UP_WINDOW_DAYS + " jours.");
            }
        }

        if (reasons.isEmpty()) {
            return new AlertEvaluation(false, null);
        }
        return new AlertEvaluation(true, String.join(" ", reasons));
    }

    private void enforceAssessmentSubmissionCooldown(AssessmentReport latestPreviousReport) {
        if (latestPreviousReport == null || latestPreviousReport.getCreatedAt() == null) {
            return;
        }

        LocalDateTime nextAllowedAt = latestPreviousReport.getCreatedAt().plusMinutes(MIN_ASSESSMENT_INTERVAL_MINUTES);
        if (LocalDateTime.now().isBefore(nextAllowedAt)) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait before submitting another assessment for this patient"
            );
        }
    }

    private AssessmentReport findActiveById(UUID id) {
        AssessmentReport report = findByIdOrThrow(id);
        if (!report.isActive()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "AssessmentReport not found");
        }
        return report;
    }

    private AssessmentReport findByIdOrThrow(UUID id) {
        return assessmentReportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AssessmentReport not found"));
    }

    private String normalizePatientId(String patientId) {
        if (patientId == null || patientId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "patientId is required");
        }
        return patientId.trim();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String safeText(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private record AlertEvaluation(boolean needsAttention, String reason) {
    }
}
