/**
 * PrescriptionServiceImpl - Service implementation for Prescription operations.
 * 
 * CHANGED: Replaced UserRepository with UserFeignClient.
 * User validation is now done via Feign client to User microservice.
 * Prescription entity now uses String patientId/doctorId instead of User objects.
 */
package everCare.appointments.services;

import everCare.appointments.dtos.PrescriptionAnalyticsSummaryDTO;
import everCare.appointments.dtos.PrescriptionRequestDTO;
import everCare.appointments.dtos.StatusCountDTO;
import everCare.appointments.dtos.TopMedicamentDTO;
import everCare.appointments.dtos.UserSimpleDTO;
import everCare.appointments.entities.Prescription;
import everCare.appointments.entities.Medicament;
import everCare.appointments.entities.Appointment;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.feign.UserFeignClient;
import everCare.appointments.repositories.PrescriptionRepository;
import everCare.appointments.repositories.MedicamentRepository;
import everCare.appointments.repositories.AppointmentRepository;
import everCare.appointments.specifications.PrescriptionSpecifications;
import everCare.appointments.services.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;

@Service
@RequiredArgsConstructor
@Transactional
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final UserFeignClient userFeignClient;
    private final MedicamentRepository medicamentRepository;
    private final AppointmentRepository appointmentRepository;

    // ========== CREATE ==========

    @Override
    public Prescription createPrescription(Prescription prescription) {
        validatePrescriptionDates(prescription.getDateDebut(), prescription.getDateFin());
        ensureMedicamentIsActive(prescription.getMedicament());
        
        if (prescription.getPatientId() != null && prescription.getMedicament() != null) {
            ensureNoOverlap(prescription.getPatientId(), prescription.getMedicament(), 
                prescription.getDateDebut(), prescription.getDateFin(), null);
        }

        prescription.setCreatedAt(LocalDateTime.now());
        if (prescription.getStatut() == null) {
            prescription.setStatut("ACTIVE");
        }
        return prescriptionRepository.save(prescription);
    }

    @Override
    public Prescription createPrescriptionFromConsultation(String patientId, String doctorId,
            String appointmentId, String medicamentId,
            LocalDate dateDebut, LocalDate dateFin,
            String posologie, String instructions,
            Boolean renouvelable, Integer nombreRenouvellements,
            String priseMatin, String priseMidi, String priseSoir,
            String resumeSimple, String notesMedecin) {

        // Validate patient exists via Feign
        UserSimpleDTO patient = userFeignClient.getUserById(patientId);
        if (patient == null) {
            throw new ResourceNotFoundException("Patient not found with id: " + patientId);
        }

        // Validate doctor exists via Feign
        UserSimpleDTO doctor = userFeignClient.getUserById(doctorId);
        if (doctor == null) {
            throw new ResourceNotFoundException("Doctor not found with id: " + doctorId);
        }

        Medicament medicament = medicamentRepository.findById(medicamentId)
            .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + medicamentId));

        ensureMedicamentIsActive(medicament);
        validatePrescriptionDates(dateDebut, dateFin);
        ensureNoOverlap(patientId, medicament, dateDebut, dateFin, null);

        Appointment appointment = appointmentId == null || appointmentId.isBlank()
            ? null
            : appointmentRepository.findById(appointmentId)
                .orElse(null);

        Prescription prescription = Prescription.builder()
            .prescriptionId(UUID.randomUUID().toString())
            .patientId(patientId)
            .doctorId(doctorId)
            .appointment(appointment)
            .medicament(medicament)
            .datePrescription(LocalDate.now())
            .dateDebut(dateDebut)
            .dateFin(dateFin)
            .posologie(posologie)
            .instructions(instructions)
            .statut("ACTIVE")
            .renouvelable(Boolean.TRUE.equals(renouvelable))
            .nombreRenouvellements(Boolean.TRUE.equals(renouvelable)
                ? Math.max(nombreRenouvellements != null ? nombreRenouvellements : 0, 0)
                : 0)
            .priseMatin(priseMatin)
            .priseMidi(priseMidi)
            .priseSoir(priseSoir)
            .resumeSimple(resumeSimple)
            .notesMedecin(notesMedecin)
            .build();

        return prescriptionRepository.save(prescription);
    }

    // ========== READ ==========

    @Override
    public List<Prescription> getAllPrescriptions() {
        return prescriptionRepository.findAll();
    }

    @Override
    public Prescription getPrescriptionById(String id) {
        return prescriptionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Prescription not found with id: " + id));
    }

    @Override
    public List<Prescription> getPrescriptionsByPatient(String patientId) {
        validateUserExists(patientId, "Patient");
        return prescriptionRepository.findByPatientId(patientId);
    }

    @Override
    public List<Prescription> getPrescriptionsByDoctor(String doctorId) {
        validateUserExists(doctorId, "Doctor");
        return prescriptionRepository.findByDoctorId(doctorId);
    }

    @Override
    public List<Prescription> getPrescriptionsByMedicament(String medicamentId) {
        Medicament medicament = medicamentRepository.findById(medicamentId)
            .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + medicamentId));
        return prescriptionRepository.findByMedicament(medicament);
    }

    @Override
    public List<Prescription> getActivePrescriptionsByPatient(String patientId) {
        validateUserExists(patientId, "Patient");
        return prescriptionRepository.findActiveByPatientId(patientId);
    }

    @Override
    public List<Prescription> getPrescriptionsByStatus(String statut) {
        return prescriptionRepository.findByStatut(statut);
    }

    @Override
    public List<Prescription> getPrescriptionsByDateRange(LocalDate start, LocalDate end) {
        return prescriptionRepository.findByDatePrescriptionBetween(start, end);
    }

    @Override
    public List<Prescription> getExpiringPrescriptions(int days) {
        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(days);
        return prescriptionRepository.findExpiringBetween(today, endDate);
    }

    @Override
    public List<Prescription> getPrescriptionsByAppointment(String appointmentId) {
        return prescriptionRepository.findByAppointment_AppointmentId(appointmentId);
    }

    // ========== UPDATE ==========

    @Override
    public Prescription terminatePrescription(String id) {
        Prescription prescription = getPrescriptionById(id);
        prescription.setStatut("TERMINEE");
        prescription.setUpdatedAt(LocalDateTime.now());
        return prescriptionRepository.save(prescription);
    }

    @Override
    public Prescription renewPrescription(String id, LocalDate newDateFin) {
        Prescription prescription = getPrescriptionById(id);
        ensureMedicamentIsActive(prescription.getMedicament());

        if (prescription.getNombreRenouvellements() == null || prescription.getNombreRenouvellements() <= 0) {
            throw new RuntimeException("Prescription " + id + " is not renewable.");
        }

        if (!"ACTIVE".equals(prescription.getStatut())) {
            throw new RuntimeException("Cannot renew prescription with status: " + prescription.getStatut());
        }

        LocalDate newDateDebut = prescription.getDateFin().plusDays(1);
        validatePrescriptionDates(newDateDebut, newDateFin);
        
        if (prescription.getPatientId() != null && prescription.getMedicament() != null) {
            ensureNoOverlap(prescription.getPatientId(), prescription.getMedicament(), newDateDebut, newDateFin, id);
        }

        Prescription newPrescription = Prescription.builder()
            .prescriptionId(UUID.randomUUID().toString())
            .patientId(prescription.getPatientId())
            .doctorId(prescription.getDoctorId())
            .medicament(prescription.getMedicament())
            .datePrescription(LocalDate.now())
            .dateDebut(newDateDebut)
            .dateFin(newDateFin)
            .posologie(prescription.getPosologie())
            .instructions(prescription.getInstructions())
            .statut("ACTIVE")
            .renouvelable(prescription.getRenouvelable())
            .nombreRenouvellements(prescription.getNombreRenouvellements() - 1)
            .priseMatin(prescription.getPriseMatin())
            .priseMidi(prescription.getPriseMidi())
            .priseSoir(prescription.getPriseSoir())
            .resumeSimple(prescription.getResumeSimple())
            .createdAt(LocalDateTime.now())
            .build();

        prescription.setStatut("RENOUVELEE");
        prescription.setUpdatedAt(LocalDateTime.now());
        prescriptionRepository.save(prescription);

        return prescriptionRepository.save(newPrescription);
    }

    @Override
    public Prescription updatePosologie(String id, String posologie) {
        Prescription prescription = getPrescriptionById(id);
        prescription.setPosologie(posologie);
        prescription.setUpdatedAt(LocalDateTime.now());
        return prescriptionRepository.save(prescription);
    }

    @Override
    public Prescription updateInstructions(String id, String instructions) {
        Prescription prescription = getPrescriptionById(id);
        prescription.setInstructions(instructions);
        prescription.setUpdatedAt(LocalDateTime.now());
        return prescriptionRepository.save(prescription);
    }

    @Override
    public Prescription updateResumeSimple(String id, String resume) {
        Prescription prescription = getPrescriptionById(id);
        prescription.setResumeSimple(resume);
        prescription.setUpdatedAt(LocalDateTime.now());
        return prescriptionRepository.save(prescription);
    }

    @Override
    public Prescription addNotes(String id, String notes) {
        Prescription prescription = getPrescriptionById(id);
        prescription.setNotesMedecin(notes);
        prescription.setUpdatedAt(LocalDateTime.now());
        return prescriptionRepository.save(prescription);
    }

    @Override
    public Prescription generatePdf(String id) {
        Prescription prescription = getPrescriptionById(id);
        String pdfUrl = "/pdfs/prescription_" + id + ".pdf";
        prescription.setPdfUrl(pdfUrl);
        prescription.setUpdatedAt(LocalDateTime.now());
        return prescriptionRepository.save(prescription);
    }

    // ========== DELETE ==========

    @Override
    public void deletePrescription(String id) {
        Prescription prescription = getPrescriptionById(id);
        prescriptionRepository.delete(prescription);
    }

    @Override
    public void deletePrescriptions(List<String> ids) {
        List<Prescription> prescriptions = prescriptionRepository.findAllById(ids);
        prescriptionRepository.deleteAll(prescriptions);
    }

    @Override
    public void deletePrescriptionsByPatient(String patientId) {
        validateUserExists(patientId, "Patient");
        List<Prescription> prescriptions = prescriptionRepository.findByPatientId(patientId);
        prescriptionRepository.deleteAll(prescriptions);
    }

    // ========== SEARCH AND FILTER ==========

    @Override
    public List<Prescription> searchPrescriptions(String patientName, String doctorName, String medicamentName, 
            String status, LocalDate dateFrom, LocalDate dateTo) {
        List<Prescription> prescriptions = getAllPrescriptions();
        
        if (patientName != null && !patientName.trim().isEmpty()) {
            // Filter by patient name - fetch via Feign
            prescriptions = prescriptions.stream()
                .filter(p -> p.getPatientId() != null)
                .filter(p -> {
                    try {
                        var patient = userFeignClient.getUserById(p.getPatientId());
                        return patient != null && patient.getName() != null &&
                            patient.getName().toLowerCase().contains(patientName.toLowerCase());
                    } catch (Exception e) { return false; }
                })
                .toList();
        }
        
        if (doctorName != null && !doctorName.trim().isEmpty()) {
            prescriptions = prescriptions.stream()
                .filter(p -> p.getDoctorId() != null)
                .filter(p -> {
                    try {
                        var doctor = userFeignClient.getUserById(p.getDoctorId());
                        return doctor != null && doctor.getName() != null &&
                            doctor.getName().toLowerCase().contains(doctorName.toLowerCase());
                    } catch (Exception e) { return false; }
                })
                .toList();
        }
        
        if (medicamentName != null && !medicamentName.trim().isEmpty()) {
            prescriptions = prescriptions.stream()
                .filter(p -> p.getMedicament() != null && 
                           p.getMedicament().getNomCommercial() != null &&
                           p.getMedicament().getNomCommercial().toLowerCase().contains(medicamentName.toLowerCase()))
                .toList();
        }
        
        if (status != null && !status.trim().isEmpty()) {
            prescriptions = prescriptions.stream()
                .filter(p -> status.equals(p.getStatut()))
                .toList();
        }
        
        if (dateFrom != null) {
            prescriptions = prescriptions.stream()
                .filter(p -> p.getDatePrescription() != null && !p.getDatePrescription().isBefore(dateFrom))
                .toList();
        }
        
        if (dateTo != null) {
            prescriptions = prescriptions.stream()
                .filter(p -> p.getDatePrescription() != null && !p.getDatePrescription().isAfter(dateTo))
                .toList();
        }
        
        return prescriptions;
    }

    @Override
    public Page<Prescription> filterPrescriptions(String patientId, String doctorId, String medicamentId,
            String status, Boolean renewable, Boolean expired, Boolean expiringSoon, 
            LocalDate dateFrom, LocalDate dateTo, Boolean hasAppointment, Pageable pageable) {
        return prescriptionRepository.findAll(
            PrescriptionSpecifications.withFilters(
                patientId, doctorId, medicamentId, status, renewable, expired,
                expiringSoon, dateFrom, dateTo, hasAppointment
            ), pageable
        );
    }

    // ========== BUSINESS LOGIC ==========

    @Override
    public boolean isPrescriptionActive(String id) {
        Prescription prescription = getPrescriptionById(id);
        return "ACTIVE".equals(prescription.getStatut());
    }

    @Override
    public List<Prescription> getTodayPrescriptions(String patientId) {
        validateUserExists(patientId, "Patient");
        return prescriptionRepository.findActiveByPatientId(patientId).stream()
            .filter(p -> p.getDateDebut() != null)
            .filter(p -> !p.getDateDebut().isAfter(LocalDate.now()))
            .filter(p -> p.getDateFin() == null || !p.getDateFin().isBefore(LocalDate.now()))
            .toList();
    }

    @Override
    public long countByMedicament(String medicamentId) {
        Medicament medicament = medicamentRepository.findById(medicamentId)
            .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + medicamentId));
        return prescriptionRepository.countByMedicament(medicament);
    }

    @Override
    public Prescription updatePrescriptionFromRequest(String id, PrescriptionRequestDTO request) {
        Prescription existingPrescription = getPrescriptionById(id);

        if (request.getMedicamentId() != null) {
            Medicament medicament = medicamentRepository.findById(request.getMedicamentId())
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found"));
            existingPrescription.setMedicament(medicament);
        }

        if (request.getDateDebut() != null) existingPrescription.setDateDebut(request.getDateDebut());
        if (request.getDateFin() != null) existingPrescription.setDateFin(request.getDateFin());

        validatePrescriptionDates(existingPrescription.getDateDebut(), existingPrescription.getDateFin());
        
        if (request.getPosologie() != null) existingPrescription.setPosologie(request.getPosologie());
        if (request.getInstructions() != null) existingPrescription.setInstructions(request.getInstructions());
        if (request.getPriseMatin() != null) existingPrescription.setPriseMatin(request.getPriseMatin());
        if (request.getPriseMidi() != null) existingPrescription.setPriseMidi(request.getPriseMidi());
        if (request.getPriseSoir() != null) existingPrescription.setPriseSoir(request.getPriseSoir());
        if (request.getNotesMedecin() != null) existingPrescription.setNotesMedecin(request.getNotesMedecin());
        if (request.getResumeSimple() != null) existingPrescription.setResumeSimple(request.getResumeSimple());
        if (request.getRenouvelable() != null) existingPrescription.setRenouvelable(request.getRenouvelable());
        if (request.getNombreRenouvellements() != null) existingPrescription.setNombreRenouvellements(request.getNombreRenouvellements());

        existingPrescription.setUpdatedAt(LocalDateTime.now());
        return prescriptionRepository.save(existingPrescription);
    }

    @Override
    public Prescription cancelPrescription(String id) {
        Prescription prescription = getPrescriptionById(id);
        if (!"ACTIVE".equals(prescription.getStatut())) {
            throw new RuntimeException("Cannot cancel prescription with status: " + prescription.getStatut());
        }
        prescription.setStatut("INTERROMPUE");
        prescription.setUpdatedAt(LocalDateTime.now());
        return prescriptionRepository.save(prescription);
    }

    @Override
    public PrescriptionAnalyticsSummaryDTO getAnalyticsSummary(String doctorId) {
        LocalDate today = LocalDate.now();
        return PrescriptionAnalyticsSummaryDTO.builder()
            .total(prescriptionRepository.countScoped(doctorId))
            .active(prescriptionRepository.countByStatusScoped(doctorId, "ACTIVE"))
            .expired(prescriptionRepository.countExpiredScoped(doctorId, today))
            .expiringSoon(prescriptionRepository.countExpiringSoonScoped(doctorId, today, today.plusDays(7)))
            .renewed(prescriptionRepository.countByStatusScoped(doctorId, "RENOUVELEE"))
            .interrupted(prescriptionRepository.countByStatusScoped(doctorId, "INTERROMPUE"))
            .completed(prescriptionRepository.countByStatusScoped(doctorId, "TERMINEE"))
            .build();
    }

    @Override
    public List<StatusCountDTO> getStatusBreakdown(String doctorId) {
        return prescriptionRepository.getStatusBreakdown(doctorId);
    }

    @Override
    public List<TopMedicamentDTO> getTopMedicaments(String doctorId, int limit) {
        return prescriptionRepository.getTopMedicaments(doctorId).stream().limit(Math.max(limit, 1)).toList();
    }

    // ========== HELPER METHODS ==========

    private void validatePrescriptionDates(LocalDate dateDebut, LocalDate dateFin) {
        if (dateDebut == null || dateFin == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Prescription start and end dates are required.");
        }
        if (dateFin.isBefore(dateDebut)) {
            throw new ResponseStatusException(BAD_REQUEST, "Prescription end date must be on or after start date.");
        }
    }

    private void ensureMedicamentIsActive(Medicament medicament) {
        if (medicament == null) {
            throw new ResponseStatusException(BAD_REQUEST, "A medicament is required.");
        }
        if (!medicament.isActif()) {
            throw new ResponseStatusException(CONFLICT, "Inactive medicaments cannot be prescribed.");
        }
    }

    private void ensureNoOverlap(String patientId, Medicament medicament, LocalDate dateDebut, LocalDate dateFin, String excludedPrescriptionId) {
        if (patientId == null || medicament == null || dateDebut == null || dateFin == null) {
            return;
        }
        boolean overlaps = prescriptionRepository.existsOverlappingPrescription(
            patientId, medicament, dateDebut, dateFin, excludedPrescriptionId
        );
        if (overlaps) {
            throw new ResponseStatusException(CONFLICT, "An overlapping prescription already exists.");
        }
    }

    private void validateUserExists(String userId, String userType) {
        UserSimpleDTO user = userFeignClient.getUserById(userId);
        if (user == null) {
            throw new ResourceNotFoundException(userType + " not found with id: " + userId);
        }
    }
}
