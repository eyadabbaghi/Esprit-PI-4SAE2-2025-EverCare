/**
 * PrescriptionMapper - Mapper for Prescription and Medicament entities.
 * 
 * CHANGED: Updated to work with String userId fields instead of User entities.
 * User data is now fetched via Feign client when needed.
 */
package everCare.appointments.mappers;

import everCare.appointments.dtos.MedicamentRequestDTO;
import everCare.appointments.dtos.MedicamentResponseDTO;
import everCare.appointments.dtos.PrescriptionResponseDTO;
import everCare.appointments.entities.Appointment;
import everCare.appointments.entities.Medicament;
import everCare.appointments.entities.Prescription;
import org.springframework.stereotype.Component;

@Component
public class PrescriptionMapper {

    // =====================================================================
    // PRESCRIPTION MAPPING
    // =====================================================================

    /**
     * Converts a Prescription entity → PrescriptionResponse DTO.
     * Patient/doctor names need to be fetched separately via Feign.
     */
    public PrescriptionResponseDTO toResponse(Prescription prescription) {
        return toResponse(prescription, true);
    }

    public PrescriptionResponseDTO toResponse(Prescription prescription, boolean includeDoctorNotes) {
        if (prescription == null) return null;

        return PrescriptionResponseDTO.builder()
            .prescriptionId(prescription.getPrescriptionId())
            .patientId(prescription.getPatientId())
            .doctorId(prescription.getDoctorId())
            .medicament(toMedicamentSummary(prescription.getMedicament()))
            .appointment(toAppointmentSummary(prescription.getAppointment()))
            .datePrescription(prescription.getDatePrescription())
            .dateDebut(prescription.getDateDebut())
            .dateFin(prescription.getDateFin())
            .posologie(prescription.getPosologie())
            .instructions(prescription.getInstructions())
            .statut(prescription.getStatut())
            .renouvelable(Boolean.TRUE.equals(prescription.getRenouvelable()))
            .nombreRenouvellements(
                prescription.getNombreRenouvellements() != null
                    ? prescription.getNombreRenouvellements()
                    : 0
            )
            .priseMatin(prescription.getPriseMatin())
            .priseMidi(prescription.getPriseMidi())
            .priseSoir(prescription.getPriseSoir())
            .resumeSimple(prescription.getResumeSimple())
            .pdfUrl(prescription.getPdfUrl())
            .notesMedecin(includeDoctorNotes ? prescription.getNotesMedecin() : null)
            .createdAt(prescription.getCreatedAt())
            .updatedAt(prescription.getUpdatedAt())
            .build();
    }

    // =====================================================================
    // MEDICAMENT MAPPING
    // =====================================================================

    public Medicament toEntity(MedicamentRequestDTO request) {
        if (request == null) return null;

        return Medicament.builder()
            .nomCommercial(request.getNomCommercial())
            .denominationCommuneInternationale(request.getDenominationCommuneInternationale())
            .dosage(request.getDosage())
            .forme(request.getForme())
            .codeCIP(request.getCodeCIP())
            .laboratoire(request.getLaboratoire())
            .indications(request.getIndications())
            .contreIndications(request.getContreIndications())
            .effetsSecondaires(request.getEffetsSecondaires())
            .photoUrl(request.getPhotoUrl())
            .noticeSimplifiee(request.getNoticeSimplifiee())
            .build();
    }

    public MedicamentResponseDTO toResponse(Medicament medicament) {
        if (medicament == null) return null;

        return MedicamentResponseDTO.builder()
            .medicamentId(medicament.getMedicamentId())
            .codeCIP(medicament.getCodeCIP())
            .nomCommercial(medicament.getNomCommercial())
            .denominationCommuneInternationale(medicament.getDenominationCommuneInternationale())
            .dosage(medicament.getDosage())
            .forme(medicament.getForme())
            .laboratoire(medicament.getLaboratoire())
            .indications(medicament.getIndications())
            .contreIndications(medicament.getContreIndications())
            .effetsSecondaires(medicament.getEffetsSecondaires())
            .photoUrl(medicament.getPhotoUrl())
            .noticeSimplifiee(medicament.getNoticeSimplifiee())
            .actif(medicament.isActif())
            .createdAt(medicament.getCreatedAt())
            .updatedAt(medicament.getUpdatedAt())
            .build();
    }

    // =====================================================================
    // PRIVATE HELPERS
    // =====================================================================

    private PrescriptionResponseDTO.MedicamentSummary toMedicamentSummary(Medicament medicament) {
        if (medicament == null) return null;
        return PrescriptionResponseDTO.MedicamentSummary.builder()
            .medicamentId(medicament.getMedicamentId())
            .nomCommercial(medicament.getNomCommercial())
            .denominationCommuneInternationale(medicament.getDenominationCommuneInternationale())
            .dosage(medicament.getDosage())
            .forme(medicament.getForme())
            .photoUrl(medicament.getPhotoUrl())
            .noticeSimplifiee(medicament.getNoticeSimplifiee())
            .build();
    }

    private PrescriptionResponseDTO.AppointmentSummary toAppointmentSummary(Appointment appointment) {
        if (appointment == null) return null;
        return PrescriptionResponseDTO.AppointmentSummary.builder()
            .appointmentId(appointment.getAppointmentId())
            .build();
    }
}
