package everCare.appointments.services;

import everCare.appointments.dtos.PrescriptionRequestDTO;
import everCare.appointments.entities.Prescription;
import everCare.appointments.entities.User;
import everCare.appointments.entities.Medicament;
import everCare.appointments.entities.Appointment;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.repositories.PrescriptionRepository;
import everCare.appointments.repositories.UserRepository;
import everCare.appointments.repositories.MedicamentRepository;
import everCare.appointments.repositories.AppointmentRepository;
import everCare.appointments.services.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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


        // Set creation timestamp
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
                                                           String posologie) {

        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));

        Medicament medicament = medicamentRepository.findById(medicamentId)
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + medicamentId));

        Appointment appointment = appointmentRepository.findById(appointmentId)
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
                .statut("ACTIVE")
                .renouvelable(false)
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

        // Build the new prescription — start date is old end date + 1 day
        Prescription newPrescription = Prescription.builder()
                .prescriptionId(UUID.randomUUID().toString())
                .patient(prescription.getPatient())
                .doctor(prescription.getDoctor())
                .medicament(prescription.getMedicament())
                .datePrescription(LocalDate.now())
                .dateDebut(prescription.getDateFin().plusDays(1))
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
    public void deletePrescriptionsByPatient(String patientId) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));
        List<Prescription> prescriptions = prescriptionRepository.findByPatient(patient);
        prescriptionRepository.deleteAll(prescriptions);
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
                .filter(p -> p.getDateDebut().isBefore(LocalDate.now().plusDays(1)) &&
                        (p.getDateFin() == null || p.getDateFin().isAfter(LocalDate.now())))
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

        // Resolve medicament from ID if provided
        if (request.getMedicamentId() != null) {
            Medicament medicament = medicamentRepository.findById(request.getMedicamentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + request.getMedicamentId()));
            existingPrescription.setMedicament(medicament);
        }

        if (request.getDateDebut() != null) {
            existingPrescription.setDateDebut(request.getDateDebut());
        }

        if (request.getDateFin() != null) {
            existingPrescription.setDateFin(request.getDateFin());
        }

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

}