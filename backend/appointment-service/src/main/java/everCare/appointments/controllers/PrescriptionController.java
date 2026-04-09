package everCare.appointments.controllers;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import everCare.appointments.dtos.PdfEmailRequest;
import everCare.appointments.dtos.PrescriptionAnalyticsSummaryDTO;
import everCare.appointments.dtos.PrescriptionRequestDTO;
import everCare.appointments.dtos.PrescriptionResponseDTO;
import everCare.appointments.dtos.StatusCountDTO;
import everCare.appointments.dtos.TopMedicamentDTO;
import everCare.appointments.dtos.PatientSimpleDTO;
import everCare.appointments.dtos.UserSimpleDTO;
import everCare.appointments.feign.NotificationFeignClient;
import everCare.appointments.feign.PatientFeignClient;
import everCare.appointments.mappers.PrescriptionMapper;
import everCare.appointments.services.PrescriptionPdfService;
import everCare.appointments.services.PrescriptionAccessControlService;
import everCare.appointments.services.PrescriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;
import java.io.ByteArrayOutputStream;

@RestController
@RequestMapping("/prescriptions")
@RequiredArgsConstructor
@Slf4j
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final PrescriptionAccessControlService accessControlService;
    private final PrescriptionMapper mapper;
    private final PrescriptionPdfService prescriptionPdfService;
    private final NotificationFeignClient notificationFeignClient;
    private final PatientFeignClient patientFeignClient;

    // ========== CREATE ==========

    /**
     * Creates a prescription from a request body DTO.
     * Replaces both the old createPrescription and createPrescriptionFromConsultation endpoints.
     * The client sends IDs (patientId, doctorId, medicamentId, appointmentId) — not full objects.
     */
    @PostMapping
    public ResponseEntity<PrescriptionResponseDTO> createPrescription(@RequestBody PrescriptionRequestDTO request) {
        accessControlService.assertCanManagePrescription(request.getDoctorId());

        PrescriptionResponseDTO response = mapper.toResponse(
                prescriptionService.createPrescriptionFromConsultation(
                        request.getPatientId(),
                        request.getDoctorId(),
                        request.getAppointmentId(),
                        request.getMedicamentId(),
                        request.getDateDebut(),
                        request.getDateFin(),
                        request.getPosologie(),
                        request.getInstructions(),
                        request.getRenouvelable(),
                        request.getNombreRenouvellements(),
                        request.getPriseMatin(),
                        request.getPriseMidi(),
                        request.getPriseSoir(),
                        request.getResumeSimple(),
                        request.getNotesMedecin()
                )
        );
        return ResponseEntity.ok(response);
    }

    // ========== READ ALL ==========

    @GetMapping
    public ResponseEntity<List<PrescriptionResponseDTO>> getAllPrescriptions() {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(
                prescriptionService.getAllPrescriptions()
                        .stream()
                        .map(prescription -> mapper.toResponse(prescription, accessControlService.shouldIncludeDoctorNotes()))
                        .collect(Collectors.toList())
        );
    }

    // ========== READ BY ID ==========

    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionResponseDTO> getPrescriptionById(@PathVariable String id) {
        everCare.appointments.entities.Prescription prescription = prescriptionService.getPrescriptionById(id);
        accessControlService.assertCanViewPrescription(prescription);
        return ResponseEntity.ok(mapper.toResponse(prescription, accessControlService.shouldIncludeDoctorNotes()));
    }

    // ========== READ BY PATIENT ==========

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByPatient(@PathVariable String patientId) {
        accessControlService.assertPatientScope(patientId);
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByPatient(patientId)
                        .stream()
                        .filter(this::isMappablePrescription)
                        .map(prescription -> mapper.toResponse(prescription, accessControlService.shouldIncludeDoctorNotes()))
                        .collect(Collectors.toList())
        );
    }

    // ========== READ ACTIVE BY PATIENT ==========

    @GetMapping("/patient/{patientId}/active")
    public ResponseEntity<List<PrescriptionResponseDTO>> getActivePrescriptionsByPatient(@PathVariable String patientId) {
        accessControlService.assertPatientScope(patientId);
        return ResponseEntity.ok(
                prescriptionService.getActivePrescriptionsByPatient(patientId)
                        .stream()
                        .filter(this::isMappablePrescription)
                        .map(prescription -> mapper.toResponse(prescription, accessControlService.shouldIncludeDoctorNotes()))
                        .collect(Collectors.toList())
        );
    }

    // ========== TODAY'S PRESCRIPTIONS BY PATIENT ==========

    @GetMapping("/patient/{patientId}/today")
    public ResponseEntity<List<PrescriptionResponseDTO>> getTodayPrescriptions(@PathVariable String patientId) {
        accessControlService.assertPatientScope(patientId);
        return ResponseEntity.ok(
                prescriptionService.getTodayPrescriptions(patientId)
                        .stream()
                        .filter(this::isMappablePrescription)
                        .map(prescription -> mapper.toResponse(prescription, accessControlService.shouldIncludeDoctorNotes()))
                        .collect(Collectors.toList())
        );
    }

    private boolean isMappablePrescription(everCare.appointments.entities.Prescription prescription) {
        return prescription.getPatient() != null
                && prescription.getDoctor() != null
                && prescription.getMedicament() != null;
    }

    // ========== READ BY DOCTOR ==========

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByDoctor(@PathVariable String doctorId) {
        accessControlService.assertDoctorScope(doctorId);
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByDoctor(doctorId)
                        .stream().map(prescription -> mapper.toResponse(prescription, true)).collect(Collectors.toList())
        );
    }

    // ========== READ BY MEDICAMENT ==========

    @GetMapping("/medicament/{medicamentId}")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByMedicament(@PathVariable String medicamentId) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByMedicament(medicamentId)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ BY STATUS ==========

    @GetMapping("/status/{statut}")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByStatus(@PathVariable String statut) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByStatus(statut)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ BY DATE RANGE ==========

    @GetMapping("/date-range")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByDateRange(start, end)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ EXPIRING SOON ==========

    @GetMapping("/expiring")
    public ResponseEntity<List<PrescriptionResponseDTO>> getExpiringPrescriptions(
            @RequestParam(defaultValue = "7") int days) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(
                prescriptionService.getExpiringPrescriptions(days)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ BY APPOINTMENT ==========

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByAppointment(@PathVariable String appointmentId) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByAppointment(appointmentId)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== UPDATE ==========

    @PutMapping("/{id}")
    public ResponseEntity<PrescriptionResponseDTO> updatePrescription(
            @PathVariable String id,
            @RequestBody PrescriptionRequestDTO request) {
        accessControlService.assertCanManagePrescription(request.getDoctorId());
        PrescriptionResponseDTO response = mapper.toResponse(
                prescriptionService.updatePrescriptionFromRequest(id, request)
        );
        return ResponseEntity.ok(response);
    }

    // ========== PATCH: RENEW ==========

    @PatchMapping("/{id}/renew")
    public ResponseEntity<PrescriptionResponseDTO> renewPrescription(
            @PathVariable String id,
            @RequestParam(required = false) Integer additionalDays,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newDateFin) {
        everCare.appointments.entities.Prescription prescription = prescriptionService.getPrescriptionById(id);
        accessControlService.assertCanManagePrescription(prescription);

        // Support both renewal modes to keep the frontend flexible.
        LocalDate resolvedDateFin = newDateFin;

        if (resolvedDateFin == null) {
            int daysToAdd = additionalDays != null ? additionalDays : 30;
            resolvedDateFin = LocalDate.now().plusDays(daysToAdd);
        }

        PrescriptionResponseDTO response = mapper.toResponse(
                prescriptionService.renewPrescription(id, resolvedDateFin)
        );
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/terminate")
    public ResponseEntity<PrescriptionResponseDTO> terminatePrescription(@PathVariable String id) {
        accessControlService.assertCanManagePrescription(prescriptionService.getPrescriptionById(id));
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.terminatePrescription(id)));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<PrescriptionResponseDTO> cancelPrescription(@PathVariable String id) {
        accessControlService.assertCanManagePrescription(prescriptionService.getPrescriptionById(id));
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.cancelPrescription(id)));
    }

    @PatchMapping("/{id}/posologie")
    public ResponseEntity<PrescriptionResponseDTO> updatePosologie(
            @PathVariable String id,
            @RequestParam String posologie) {
        accessControlService.assertCanManagePrescription(prescriptionService.getPrescriptionById(id));
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.updatePosologie(id, posologie)));
    }

    @PatchMapping("/{id}/instructions")
    public ResponseEntity<PrescriptionResponseDTO> updateInstructions(
            @PathVariable String id,
            @RequestParam String instructions) {
        accessControlService.assertCanManagePrescription(prescriptionService.getPrescriptionById(id));
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.updateInstructions(id, instructions)));
    }

    @PatchMapping("/{id}/resume")
    public ResponseEntity<PrescriptionResponseDTO> updateResume(
            @PathVariable String id,
            @RequestParam String resume) {
        accessControlService.assertCanManagePrescription(prescriptionService.getPrescriptionById(id));
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.updateResumeSimple(id, resume)));
    }

    @PatchMapping("/{id}/notes")
    public ResponseEntity<PrescriptionResponseDTO> updateNotes(
            @PathVariable String id,
            @RequestParam String notes) {
        accessControlService.assertCanManagePrescription(prescriptionService.getPrescriptionById(id));
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.addNotes(id, notes)));
    }

    // ========== DELETE ==========

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePrescription(@PathVariable String id) {
        accessControlService.assertCanManagePrescription(prescriptionService.getPrescriptionById(id));
        prescriptionService.deletePrescription(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/generate-pdf")
    public ResponseEntity<PrescriptionResponseDTO> generatePdf(@PathVariable String id) {
        accessControlService.assertCanManagePrescription(prescriptionService.getPrescriptionById(id));
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.generatePdf(id), true));
    }

    // ========== PDF DOWNLOAD ==========

    /**
     * GET /api/prescriptions/{id}/pdf
     * Downloads the generated PDF as a byte stream
     */
    @GetMapping(value = "/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable String id) {
        accessControlService.assertCanViewPrescription(prescriptionService.getPrescriptionById(id));
        log.info("Downloading PDF for prescription ID: {}", id);
        
        try {
            log.info("PDF controller method reached successfully for ID: {}", id);
            
            // Generate actual PDF using the PDF service
            byte[] pdfBytes = prescriptionPdfService.generatePdf(id);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "prescription-" + id + ".pdf");
            headers.setContentLength(pdfBytes.length);

            log.info("Returning real PDF response for prescription ID: {}, size: {} bytes", id, pdfBytes.length);
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
            
        } catch (Exception e) {
            log.warn("Error generating PDF for prescription ID: {}, retrieving prescription data directly. Error: {}", id, e.getMessage());
            
            // Retrieve prescription data directly as fallback
            try {
                everCare.appointments.entities.Prescription prescription = prescriptionService.getPrescriptionById(id);
                
                // Create PDF with actual prescription data
                byte[] realPdfBytes = generatePdfFromPrescription(prescription);
                
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.setContentDispositionFormData("attachment", "prescription-" + id + ".pdf");
                headers.setContentLength(realPdfBytes.length);

                log.info("Returning PDF with real prescription data for ID: {}, size: {} bytes", id, realPdfBytes.length);
                return new ResponseEntity<>(realPdfBytes, headers, HttpStatus.OK);
                
            } catch (Exception prescriptionException) {
                log.error("Could not retrieve prescription data for ID: {}", id, prescriptionException);
                throw new RuntimeException("Prescription not found and unable to generate PDF: " + id);
            }
        }
    }

    // ========== SEND PDF VIA EMAIL ==========

    /**
     * POST /prescriptions/{id}/send-pdf
     * Sends the prescription PDF via email
     */
    @PostMapping("/{id}/send-pdf")
    public ResponseEntity<String> sendPdfViaEmail(
            @PathVariable String id,
            @RequestBody(required = false) PdfEmailRequest request) {
        everCare.appointments.entities.Prescription prescription = prescriptionService.getPrescriptionById(id);
        accessControlService.assertCanManagePrescription(prescription);
        UserSimpleDTO patient = patientFeignClient.getUserById(prescription.getPatient().getUserId());
        UserSimpleDTO doctor = patientFeignClient.getUserById(prescription.getDoctor().getUserId());

        // Generate PDF
        byte[] pdfBytes = prescriptionPdfService.generatePdf(id);

        // Send via notification service
        PdfEmailRequest emailRequest = PdfEmailRequest.builder()
                .recipientEmail(request != null && request.getRecipientEmail() != null
                        ? request.getRecipientEmail()
                        : patient.getEmail())
                .subject(request != null && request.getSubject() != null
                        ? request.getSubject()
                        : "Your EverCare prescription")
                .body(request != null && request.getBody() != null
                        ? request.getBody()
                        : "Please find your prescription attached.")
                .patientEmail(patient.getEmail())
                .patientName(patient.getName())
                .doctorName(doctor.getName())
                .prescriptionId(id)
                .pdfBase64(Base64.getEncoder().encodeToString(pdfBytes))
                .build();
        
        notificationFeignClient.sendPrescriptionEmail(emailRequest);

        return ResponseEntity.ok("PDF sent successfully to " + emailRequest.getRecipientEmail());
    }

    // ========== COUNT BY MEDICAMENT ==========

    @GetMapping("/count/medicament/{medicamentId}")
    public ResponseEntity<Long> countByMedicament(@PathVariable String medicamentId) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(prescriptionService.countByMedicament(medicamentId));
    }

    // ========== BATCH OPERATIONS ==========

    @PostMapping("/batch")
    public ResponseEntity<List<PrescriptionResponseDTO>> createBatch(
            @RequestBody List<PrescriptionRequestDTO> requests) {
        List<PrescriptionResponseDTO> responses = requests.stream()
                .map(request -> {
                    accessControlService.assertCanManagePrescription(request.getDoctorId());
                    return mapper.toResponse(
                        prescriptionService.createPrescriptionFromConsultation(
                                request.getPatientId(),
                                request.getDoctorId(),
                                request.getAppointmentId(),
                                request.getMedicamentId(),
                                request.getDateDebut(),
                                request.getDateFin(),
                                request.getPosologie(),
                                request.getInstructions(),
                                request.getRenouvelable(),
                                request.getNombreRenouvellements(),
                                request.getPriseMatin(),
                                request.getPriseMidi(),
                                request.getPriseSoir(),
                                request.getResumeSimple(),
                                request.getNotesMedecin()
                        )
                    );
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteBatch(@RequestBody List<String> ids) {
        ids.forEach(id -> accessControlService.assertCanManagePrescription(prescriptionService.getPrescriptionById(id)));
        prescriptionService.deletePrescriptions(ids);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/filter")
    public ResponseEntity<Page<PrescriptionResponseDTO>> filterPrescriptions(
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) String medicamentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean renewable,
            @RequestParam(required = false) Boolean expired,
            @RequestParam(required = false) Boolean expiringSoon,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) Boolean hasAppointment,
            Pageable pageable) {
        String scopedDoctorId = doctorId;

        if (accessControlService.getRequesterRole() == everCare.appointments.entities.UserRole.DOCTOR) {
            scopedDoctorId = accessControlService.getRequesterUserId();
        } else {
            accessControlService.assertAdminAccess();
        }

        Page<PrescriptionResponseDTO> page;

        try {
            page = prescriptionService.filterPrescriptions(
                            patientId,
                            scopedDoctorId,
                            medicamentId,
                            status,
                            renewable,
                            expired,
                            expiringSoon,
                            dateFrom,
                            dateTo,
                            hasAppointment,
                            pageable)
                    .map(prescription -> mapper.toResponse(prescription, accessControlService.shouldIncludeDoctorNotes()));
        } catch (RuntimeException ex) {
            log.warn("Falling back to in-memory prescription filtering", ex);
            page = buildFilterFallback(
                    patientId,
                    scopedDoctorId,
                    medicamentId,
                    status,
                    renewable,
                    expired,
                    expiringSoon,
                    dateFrom,
                    dateTo,
                    hasAppointment,
                    pageable
            );
        }

        return ResponseEntity.ok(page);
    }

    private Page<PrescriptionResponseDTO> buildFilterFallback(
            String patientId,
            String doctorId,
            String medicamentId,
            String status,
            Boolean renewable,
            Boolean expired,
            Boolean expiringSoon,
            LocalDate dateFrom,
            LocalDate dateTo,
            Boolean hasAppointment,
            Pageable pageable
    ) {
        LocalDate today = LocalDate.now();

        List<PrescriptionResponseDTO> filtered = prescriptionService.getPrescriptionsByDoctor(doctorId).stream()
                .filter(prescription -> patientId == null || prescription.getPatient().getUserId().equals(patientId))
                .filter(prescription -> medicamentId == null || prescription.getMedicament().getMedicamentId().equals(medicamentId))
                .filter(prescription -> status == null || prescription.getStatut().equals(status))
                .filter(prescription -> renewable == null || Boolean.TRUE.equals(prescription.getRenouvelable()) == renewable)
                .filter(prescription -> hasAppointment == null || (hasAppointment ? prescription.getAppointment() != null : prescription.getAppointment() == null))
                .filter(prescription -> dateFrom == null || !prescription.getDatePrescription().isBefore(dateFrom))
                .filter(prescription -> dateTo == null || !prescription.getDatePrescription().isAfter(dateTo))
                .filter(prescription -> expired == null || (expired
                        ? prescription.getDateFin() != null && prescription.getDateFin().isBefore(today)
                        : prescription.getDateFin() == null || !prescription.getDateFin().isBefore(today)))
                .filter(prescription -> expiringSoon == null || (expiringSoon
                        ? "ACTIVE".equals(prescription.getStatut())
                          && prescription.getDateFin() != null
                          && !prescription.getDateFin().isBefore(today)
                          && !prescription.getDateFin().isAfter(today.plusDays(7))
                        : true))
                .sorted(buildFallbackComparator(pageable.getSort()))
                .map(prescription -> mapper.toResponse(prescription, accessControlService.shouldIncludeDoctorNotes()))
                .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<PrescriptionResponseDTO> content = start >= filtered.size() ? List.of() : filtered.subList(start, end);

        return new PageImpl<>(content, pageable, filtered.size());
    }

    private Comparator<everCare.appointments.entities.Prescription> buildFallbackComparator(Sort sort) {
        Comparator<everCare.appointments.entities.Prescription> comparator = Comparator.comparing(
                prescription -> prescription.getDatePrescription() != null ? prescription.getDatePrescription() : LocalDate.MIN
        );

        for (Sort.Order order : sort) {
            Comparator<everCare.appointments.entities.Prescription> current;

            if ("dateFin".equals(order.getProperty())) {
                current = Comparator.comparing(
                        prescription -> prescription.getDateFin() != null ? prescription.getDateFin() : LocalDate.MIN
                );
            } else {
                current = Comparator.comparing(
                        prescription -> prescription.getDatePrescription() != null ? prescription.getDatePrescription() : LocalDate.MIN
                );
            }

            comparator = order.isAscending() ? current : current.reversed();
        }

        return comparator;
    }

    // ========== SEARCH AND FILTER ==========

    @GetMapping("/analytics/summary")
    public ResponseEntity<PrescriptionAnalyticsSummaryDTO> getAnalyticsSummary() {
        String doctorScope = null;

        if (accessControlService.getRequesterRole() == everCare.appointments.entities.UserRole.DOCTOR) {
            doctorScope = accessControlService.getRequesterUserId();
        } else {
            accessControlService.assertAdminAccess();
        }

        return ResponseEntity.ok(prescriptionService.getAnalyticsSummary(doctorScope));
    }

    @GetMapping("/analytics/status-breakdown")
    public ResponseEntity<List<StatusCountDTO>> getStatusBreakdown() {
        String doctorScope = null;

        if (accessControlService.getRequesterRole() == everCare.appointments.entities.UserRole.DOCTOR) {
            doctorScope = accessControlService.getRequesterUserId();
        } else {
            accessControlService.assertAdminAccess();
        }

        return ResponseEntity.ok(prescriptionService.getStatusBreakdown(doctorScope));
    }

    @GetMapping("/analytics/top-medicaments")
    public ResponseEntity<List<TopMedicamentDTO>> getTopMedicaments(
            @RequestParam(defaultValue = "5") int limit) {
        String doctorScope = null;

        if (accessControlService.getRequesterRole() == everCare.appointments.entities.UserRole.DOCTOR) {
            doctorScope = accessControlService.getRequesterUserId();
        } else {
            accessControlService.assertAdminAccess();
        }

        return ResponseEntity.ok(prescriptionService.getTopMedicaments(doctorScope, limit));
    }

    @GetMapping("/search")
    public ResponseEntity<List<PrescriptionResponseDTO>> searchPrescriptions(
            @RequestParam(required = false) String patientName,
            @RequestParam(required = false) String doctorName,
            @RequestParam(required = false) String medicamentName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        accessControlService.assertAdminAccess();

        return ResponseEntity.ok(
                prescriptionService.searchPrescriptions(
                        patientName, doctorName, medicamentName, status, dateFrom, dateTo
                ).stream()
                 .map(prescription -> mapper.toResponse(prescription, accessControlService.shouldIncludeDoctorNotes()))
                 .collect(Collectors.toList())
        );
    }

    // ========== HELPER METHODS ==========

    /**
     * Generates PDF from real prescription data
     */
    private byte[] generatePdfFromPrescription(everCare.appointments.entities.Prescription prescription) {
        try {
            log.info("Generating PDF from prescription data for ID: {}", prescription.getPrescriptionId());
            
            // Create PDF using real prescription data
            ByteArrayOutputStream pdfStream = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(pdfStream);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document doc = new Document(pdfDoc);
            
            // Add content using real prescription data
            doc.add(new Paragraph("PRESCRIPTION")
                    .setFontSize(24).setBold());
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("Prescription ID: " + prescription.getPrescriptionId()));
            doc.add(new Paragraph("Prescription Date: " + prescription.getDatePrescription()));
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("PATIENT INFORMATION")
                    .setFontSize(14).setBold());
            
            // Get patient information
            if (prescription.getPatient() != null) {
                doc.add(new Paragraph("Patient ID: " + prescription.getPatient().getUserId()));
                if (prescription.getPatient().getName() != null) {
                    doc.add(new Paragraph("Name: " + prescription.getPatient().getName()));
                }
                if (prescription.getPatient().getEmail() != null) {
                    doc.add(new Paragraph("Email: " + prescription.getPatient().getEmail()));
                }
            }
            
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("DOCTOR INFORMATION")
                    .setFontSize(14).setBold());
            
            // Get doctor information
            if (prescription.getDoctor() != null) {
                doc.add(new Paragraph("Doctor ID: " + prescription.getDoctor().getUserId()));
                if (prescription.getDoctor().getName() != null) {
                    doc.add(new Paragraph("Name: " + prescription.getDoctor().getName()));
                }
                if (prescription.getDoctor().getSpecialization() != null) {
                    doc.add(new Paragraph("Specialization: " + prescription.getDoctor().getSpecialization()));
                }
            }
            
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("MEDICATION PRESCRIBED")
                    .setFontSize(14).setBold());
            
            // Get medication information
            if (prescription.getMedicament() != null) {
                doc.add(new Paragraph("• Medication: " + prescription.getMedicament().getNomCommercial()));
                if (prescription.getMedicament().getDosage() != null) {
                    doc.add(new Paragraph("• Dosage: " + prescription.getMedicament().getDosage()));
                }
                if (prescription.getMedicament().getForme() != null) {
                    doc.add(new Paragraph("• Form: " + prescription.getMedicament().getForme()));
                }
            }
            
            if (prescription.getPosologie() != null) {
                doc.add(new Paragraph("• Posology: " + prescription.getPosologie()));
            }
            
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("PRESCRIPTION DETAILS")
                    .setFontSize(14).setBold());
            
            if (prescription.getDateDebut() != null) {
                doc.add(new Paragraph("Start Date: " + prescription.getDateDebut()));
            }
            if (prescription.getDateFin() != null) {
                doc.add(new Paragraph("End Date: " + prescription.getDateFin()));
            }
            
            doc.add(new Paragraph("Status: " + (prescription.getStatut() != null ? prescription.getStatut() : "ACTIVE")));
            doc.add(new Paragraph("Renewable: " + (prescription.getRenouvelable() != null ? prescription.getRenouvelable() : false)));
            
            if (prescription.getInstructions() != null) {
                doc.add(new Paragraph(" "));
                doc.add(new Paragraph("INSTRUCTIONS")
                        .setFontSize(14).setBold());
                doc.add(new Paragraph(prescription.getInstructions()));
            }
            
            if (prescription.getNotesMedecin() != null) {
                doc.add(new Paragraph(" "));
                doc.add(new Paragraph("DOCTOR'S NOTES")
                        .setFontSize(14).setBold());
                doc.add(new Paragraph(prescription.getNotesMedecin()));
            }
            
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("_________________________"));
            if (prescription.getDoctor() != null && prescription.getDoctor().getName() != null) {
                doc.add(new Paragraph(prescription.getDoctor().getName()));
            } else {
                doc.add(new Paragraph("Doctor Signature"));
            }
            doc.add(new Paragraph("Signature & Date"));
            doc.add(new Paragraph(" "));
            
            doc.close();
            
            byte[] pdfBytes = pdfStream.toByteArray();
            log.info("PDF generated from prescription data successfully, size: {} bytes", pdfBytes.length);
            return pdfBytes;
            
        } catch (Exception e) {
            log.error("Error generating PDF from prescription data: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate PDF from prescription data: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a sample PDF when prescription is not found
     */
    private byte[] generateSamplePdf(String prescriptionId) {
        try {
            log.info("Generating sample PDF for prescription ID: {}", prescriptionId);
            
            // Create a simple PDF using iText
            ByteArrayOutputStream pdfStream = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(pdfStream);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document doc = new Document(pdfDoc);
            
            // Add content to the PDF
            doc.add(new Paragraph("PRESCRIPTION")
                    .setFontSize(24).setBold());
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("Prescription ID: " + prescriptionId));
            doc.add(new Paragraph("Prescription Date: " + java.time.LocalDate.now().minusDays(3).toString()));
            doc.add(new Paragraph("PATIENT INFORMATION")
                    .setFontSize(14).setBold());
            doc.add(new Paragraph("Name: John Doe"));
            doc.add(new Paragraph("Age: 45 years"));
            doc.add(new Paragraph("Email: john.doe@email.com"));
            doc.add(new Paragraph("Phone: (555) 123-4567"));

            doc.add(new Paragraph("DOCTOR INFORMATION")
                    .setFontSize(14).setBold());
            doc.add(new Paragraph("Dr. Sarah Smith"));
            doc.add(new Paragraph("General Practitioner"));
            doc.add(new Paragraph("License: MD-12345"));
            doc.add(new Paragraph("Clinic: EverCare Health Center"));
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("MEDICATION PRESCRIBED")
                    .setFontSize(14).setBold());
            doc.add(new Paragraph("• Medication: Amoxicillin 500mg"));
            doc.add(new Paragraph("• Form: Capsules"));
            doc.add(new Paragraph("• Dosage: 1 capsule twice daily"));
            doc.add(new Paragraph("• Duration: 7 days"));
            doc.add(new Paragraph("• Instructions: Take with food, complete full course"));
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("PRESCRIPTION DETAILS")
                    .setFontSize(14).setBold());
            doc.add(new Paragraph("Start Date: " + java.time.LocalDate.now().minusDays(3).toString()));
            doc.add(new Paragraph("End Date: " + java.time.LocalDate.now().plusDays(4).toString()));
            doc.add(new Paragraph("Status: ACTIVE"));
            doc.add(new Paragraph("Renewable: No"));
            doc.add(new Paragraph("Refills: 0"));

            doc.add(new Paragraph("DOCTOR'S NOTES")
                    .setFontSize(14).setBold());
            doc.add(new Paragraph("Patient presenting with bacterial infection. "));
            doc.add(new Paragraph("Monitor for allergic reactions. "));
            doc.add(new Paragraph("Follow up in 7 days if symptoms persist."));

            doc.add(new Paragraph("PHARMACY INSTRUCTIONS")
                    .setFontSize(14).setBold());
            doc.add(new Paragraph("Dispense as written"));
            doc.add(new Paragraph("No substitutions permitted"));

            doc.add(new Paragraph("_________________________"));
            doc.add(new Paragraph("Dr. Sarah Smith"));
            doc.add(new Paragraph("Signature & Date"));

            doc.add(new Paragraph("Note: This is a sample prescription generated for testing purposes.")
                    .setFontSize(10).setFontColor(new DeviceRgb(128, 128, 128)));
            
            doc.close();
            
            byte[] pdfBytes = pdfStream.toByteArray();
            log.info("Sample PDF generated successfully, size: {} bytes", pdfBytes.length);
            return pdfBytes;
            
        } catch (Exception e) {
            log.error("Error generating sample PDF: {}", e.getMessage(), e);
            // Return a simple text-based PDF as last resort
            String fallbackContent = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Sample Prescription) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000202 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n299\n%%EOF";
            return fallbackContent.getBytes();
        }
    }

    /**
     * Calculates duration in days between start and end dates
     */
    private String calculateDuration(LocalDate dateDebut, LocalDate dateFin) {
        if (dateDebut == null || dateFin == null) {
            return null;
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(dateDebut, dateFin);
        return days + " days";
    }
}
