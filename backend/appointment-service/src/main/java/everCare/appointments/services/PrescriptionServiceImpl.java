package everCare.appointments.services;

import everCare.appointments.dtos.PrescriptionAnalyticsSummaryDTO;
import everCare.appointments.dtos.PrescriptionRequestDTO;
import everCare.appointments.dtos.StatusCountDTO;
import everCare.appointments.dtos.TopMedicamentDTO;
import everCare.appointments.entities.Prescription;
import everCare.appointments.entities.User;
import everCare.appointments.entities.Medicament;
import everCare.appointments.entities.Appointment;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.repositories.PrescriptionRepository;
import everCare.appointments.repositories.UserRepository;
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
    private final UserRepository userRepository;
    private final MedicamentRepository medicamentRepository;
    private final AppointmentRepository appointmentRepository;

    // ========== CREATE ==========

    @Override
    public Prescription createPrescription(Prescription prescription) {
        validatePrescriptionDates(prescription.getDateDebut(), prescription.getDateFin());
        ensureMedicamentIsActive(prescription.getMedicament());
        ensureNoOverlap(prescription.getPatient(), prescription.getMedicament(), prescription.getDateDebut(), prescription.getDateFin(), null);

        prescription.setCreatedAt(LocalDateTime.now());

        // Set default status
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

        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));

        Medicament medicament = medicamentRepository.findById(medicamentId)
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + medicamentId));

        ensureMedicamentIsActive(medicament);
        validatePrescriptionDates(dateDebut, dateFin);
        ensureNoOverlap(patient, medicament, dateDebut, dateFin, null);

        Appointment appointment = appointmentId == null || appointmentId.isBlank()
                ? null
                : appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + appointmentId));

        Prescription prescription = Prescription.builder()
                .prescriptionId(UUID.randomUUID().toString())
                .patient(patient)
                .doctor(doctor)
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
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));
        return prescriptionRepository.findByPatient(patient);
    }

    @Override
    public List<Prescription> getPrescriptionsByDoctor(String doctorId) {
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));
        return prescriptionRepository.findByDoctor(doctor);
    }

    @Override
    public List<Prescription> getPrescriptionsByMedicament(String medicamentId) {
        Medicament medicament = medicamentRepository.findById(medicamentId)
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + medicamentId));
        return prescriptionRepository.findByMedicament(medicament);
    }

    @Override
    public List<Prescription> getActivePrescriptionsByPatient(String patientId) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));
        return prescriptionRepository.findActiveByPatient(patient);
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

        // Check 1: is it marked as renewable at all?
        if (prescription.getNombreRenouvellements() == null
                || prescription.getNombreRenouvellements() <= 0) {
            throw new RuntimeException("Prescription " + id + " is not renewable.");
        }

        // Check 2 (THE FIX): are there renewals remaining?
        if (prescription.getNombreRenouvellements() <= 0) {
            throw new RuntimeException(
                    "No renewals remaining for prescription " + id + "."
            );
        }

        // Check 3: can only renew an ACTIVE prescription
        if (!"ACTIVE".equals(prescription.getStatut())) {
            throw new RuntimeException(
                    "Cannot renew prescription with status: " + prescription.getStatut()
                            + ". Only ACTIVE prescriptions can be renewed."
            );
        }

        LocalDate newDateDebut = prescription.getDateFin().plusDays(1);
        validatePrescriptionDates(newDateDebut, newDateFin);
        ensureNoOverlap(prescription.getPatient(), prescription.getMedicament(), newDateDebut, newDateFin, id);

        // Build the new prescription — start date is old end date + 1 day
        Prescription newPrescription = Prescription.builder()
                .prescriptionId(UUID.randomUUID().toString())
                .patient(prescription.getPatient())
                .doctor(prescription.getDoctor())
                .medicament(prescription.getMedicament())
                .datePrescription(LocalDate.now())
                .dateDebut(newDateDebut)
                .dateFin(newDateFin)
                .posologie(prescription.getPosologie())
                .instructions(prescription.getInstructions())
                .statut("ACTIVE")
                .renouvelable(prescription.getRenouvelable())
                .nombreRenouvellements(prescription.getNombreRenouvellements() - 1) // decrement safely
                .priseMatin(prescription.getPriseMatin())
                .priseMidi(prescription.getPriseMidi())
                .priseSoir(prescription.getPriseSoir())
                .resumeSimple(prescription.getResumeSimple())
                .createdAt(LocalDateTime.now())
                .build();

        // Mark the old prescription as renewed (not TERMINEE — different meaning)
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
        // Logic to generate PDF
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
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));
        List<Prescription> prescriptions = prescriptionRepository.findByPatient(patient);
        prescriptionRepository.deleteAll(prescriptions);
    }

    // ========== SEARCH AND FILTER ==========

    @Override
    public List<Prescription> searchPrescriptions(String patientName, String doctorName, String medicamentName, 
                                                 String status, LocalDate dateFrom, LocalDate dateTo) {
        List<Prescription> prescriptions = getAllPrescriptions();
        
        // Filter by patient name
        if (patientName != null && !patientName.trim().isEmpty()) {
            prescriptions = prescriptions.stream()
                .filter(p -> p.getPatient() != null && 
                           p.getPatient().getName() != null &&
                           p.getPatient().getName().toLowerCase().contains(patientName.toLowerCase()))
                .toList();
        }
        
        // Filter by doctor name
        if (doctorName != null && !doctorName.trim().isEmpty()) {
            prescriptions = prescriptions.stream()
                .filter(p -> p.getDoctor() != null && 
                           p.getDoctor().getName() != null &&
                           p.getDoctor().getName().toLowerCase().contains(doctorName.toLowerCase()))
                .toList();
        }
        
        // Filter by medicament name
        if (medicamentName != null && !medicamentName.trim().isEmpty()) {
            prescriptions = prescriptions.stream()
                .filter(p -> p.getMedicament() != null && 
                           p.getMedicament().getNomCommercial() != null &&
                           p.getMedicament().getNomCommercial().toLowerCase().contains(medicamentName.toLowerCase()))
                .toList();
        }
        
        // Filter by status
        if (status != null && !status.trim().isEmpty()) {
            prescriptions = prescriptions.stream()
                .filter(p -> status.equals(p.getStatut()))
                .toList();
        }
        
        // Filter by date range
        if (dateFrom != null) {
            prescriptions = prescriptions.stream()
                .filter(p -> p.getDatePrescription() != null && 
                           !p.getDatePrescription().isBefore(dateFrom))
                .toList();
        }
        
        if (dateTo != null) {
            prescriptions = prescriptions.stream()
                .filter(p -> p.getDatePrescription() != null && 
                           !p.getDatePrescription().isAfter(dateTo))
                .toList();
        }
        
        return prescriptions;
    }

    @Override
    public Page<Prescription> filterPrescriptions(String patientId, String doctorId, String medicamentId,
                                                  String status, Boolean renewable, Boolean expired,
                                                  Boolean expiringSoon, LocalDate dateFrom, LocalDate dateTo,
                                                  Boolean hasAppointment, Pageable pageable) {
        return prescriptionRepository.findAll(
                PrescriptionSpecifications.withFilters(
                        patientId,
                        doctorId,
                        medicamentId,
                        status,
                        renewable,
                        expired,
                        expiringSoon,
                        dateFrom,
                        dateTo,
                        hasAppointment
                ),
                pageable
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
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        return prescriptionRepository.findActiveByPatient(patient).stream()
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

        Medicament targetMedicament = existingPrescription.getMedicament();

        // Resolve medicament from ID if provided
        if (request.getMedicamentId() != null) {
            Medicament medicament = medicamentRepository.findById(request.getMedicamentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + request.getMedicamentId()));
            existingPrescription.setMedicament(medicament);
            targetMedicament = medicament;
        }

        if (request.getDateDebut() != null) {
            existingPrescription.setDateDebut(request.getDateDebut());
        }

        if (request.getDateFin() != null) {
            existingPrescription.setDateFin(request.getDateFin());
        }

        validatePrescriptionDates(existingPrescription.getDateDebut(), existingPrescription.getDateFin());
        ensureMedicamentIsActive(targetMedicament);
        ensureNoOverlap(
                existingPrescription.getPatient(),
                targetMedicament,
                existingPrescription.getDateDebut(),
                existingPrescription.getDateFin(),
                existingPrescription.getPrescriptionId()
        );

        if (request.getPosologie() != null) {
            existingPrescription.setPosologie(request.getPosologie());
        }

        if (request.getInstructions() != null) {
            existingPrescription.setInstructions(request.getInstructions());
        }

        // Statut should NOT be updatable freely via a generic update —
        // use the dedicated endpoints (terminate, cancel, renew) instead.
        // Removing this to prevent status bypass.

        if (request.getPriseMatin() != null) {
            existingPrescription.setPriseMatin(request.getPriseMatin());
        }

        if (request.getPriseMidi() != null) {
            existingPrescription.setPriseMidi(request.getPriseMidi());
        }

        if (request.getPriseSoir() != null) {
            existingPrescription.setPriseSoir(request.getPriseSoir());
        }

        if (request.getNotesMedecin() != null) {
            existingPrescription.setNotesMedecin(request.getNotesMedecin());
        }

        if (request.getResumeSimple() != null) {
            existingPrescription.setResumeSimple(request.getResumeSimple());
        }

        // Only update renouvelable if explicitly set to true
        // (avoids the primitive boolean defaulting-to-false problem)
        if (request.getRenouvelable() != null) {
            existingPrescription.setRenouvelable(request.getRenouvelable());
        }

        if (request.getNombreRenouvellements() != null) {
            existingPrescription.setNombreRenouvellements(request.getNombreRenouvellements());
        }

        existingPrescription.setUpdatedAt(LocalDateTime.now());

        return prescriptionRepository.save(existingPrescription);
    }

    @Override
    public Prescription cancelPrescription(String id) {
        Prescription prescription = getPrescriptionById(id);

        // Can only cancel an ACTIVE prescription
        if (!"ACTIVE".equals(prescription.getStatut())) {
            throw new RuntimeException(
                    "Cannot cancel prescription with status: " + prescription.getStatut()
                            + ". Only ACTIVE prescriptions can be cancelled."
            );
        }

        prescription.setStatut("INTERROMPUE"); // matches your entity's statut values
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
        List<TopMedicamentDTO> medicaments = prescriptionRepository.getTopMedicaments(doctorId);
        return medicaments.stream().limit(Math.max(limit, 1)).toList();
    }

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

    private void ensureNoOverlap(User patient, Medicament medicament, LocalDate dateDebut, LocalDate dateFin, String excludedPrescriptionId) {
        if (patient == null || medicament == null || dateDebut == null || dateFin == null) {
            return;
        }

        boolean overlaps = prescriptionRepository.existsOverlappingPrescription(
                patient,
                medicament,
                dateDebut,
                dateFin,
                excludedPrescriptionId
        );

        if (overlaps) {
            throw new ResponseStatusException(
                    CONFLICT,
                    "An overlapping prescription already exists for this patient and medicament."
            );
        }
    }

}
