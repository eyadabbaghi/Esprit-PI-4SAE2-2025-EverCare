package everCare.appointments.services;

import everCare.appointments.dtos.PrescriptionRequestDTO;
import everCare.appointments.entities.Prescription;
import everCare.appointments.entities.User;
import java.time.LocalDate;
import java.util.List;

public interface PrescriptionService {

    // ========== CREATE ==========
    Prescription createPrescription(Prescription prescription);
    Prescription createPrescriptionFromConsultation(String patientId, String doctorId,
                                                    String appointmentId, String medicamentId,
                                                    LocalDate dateDebut, LocalDate dateFin,
                                                    String posologie, String instructions);

    // ========== READ ==========
    List<Prescription> getAllPrescriptions();
    Prescription getPrescriptionById(String id);
    List<Prescription> getPrescriptionsByPatient(String patientId);
    List<Prescription> getPrescriptionsByDoctor(String doctorId);
    List<Prescription> getPrescriptionsByMedicament(String medicamentId);
    List<Prescription> getActivePrescriptionsByPatient(String patientId);
    List<Prescription> getPrescriptionsByStatus(String statut);
    List<Prescription> getPrescriptionsByDateRange(LocalDate start, LocalDate end);
    List<Prescription> getExpiringPrescriptions(int days);
    List<Prescription> getPrescriptionsByAppointment(String appointmentId);

    // ========== UPDATE ==========
    Prescription terminatePrescription(String id);
    Prescription renewPrescription(String id, LocalDate newDateFin);
    Prescription updatePosologie(String id, String posologie);
    Prescription updateResumeSimple(String id, String resume);
    Prescription addNotes(String id, String notes);
    Prescription generatePdf(String id);

    // ========== DELETE ==========
    void deletePrescription(String id);
    void deletePrescriptions(List<String> ids);
    void deletePrescriptionsByPatient(String patientId);

    // ========== SEARCH AND FILTER ==========
    List<Prescription> searchPrescriptions(String patientName, String doctorName, String medicamentName, 
                                         String status, LocalDate dateFrom, LocalDate dateTo);

    // ========== BUSINESS LOGIC ==========
    boolean isPrescriptionActive(String id);
    List<Prescription> getTodayPrescriptions(String patientId);
    long countByMedicament(String medicamentId);

    Prescription updatePrescriptionFromRequest(String id, PrescriptionRequestDTO request);
    Prescription cancelPrescription(String id);
}
