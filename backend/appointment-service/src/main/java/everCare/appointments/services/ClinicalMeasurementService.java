package everCare.appointments.services;

import everCare.appointments.dtos.ClinicalMeasurementRequestDTO;
import everCare.appointments.dtos.ClinicalMeasurementResponseDTO;

import java.util.List;

public interface ClinicalMeasurementService {

    ClinicalMeasurementResponseDTO save(ClinicalMeasurementRequestDTO request, String caregiverId);

    ClinicalMeasurementResponseDTO getByAppointmentId(String appointmentId);

    List<ClinicalMeasurementResponseDTO> getByPatientId(String patientId);

    ClinicalMeasurementResponseDTO getLatestForPatient(String patientId);
}