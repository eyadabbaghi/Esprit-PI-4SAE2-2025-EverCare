package everCare.appointments.services;

import everCare.appointments.dtos.ClinicalMeasurementResponseDTO;
import everCare.appointments.dtos.PrescriptionRequestDTO;
import everCare.appointments.dtos.SafetyCheckResult;
import everCare.appointments.entities.ClinicalMeasurement;

public interface PrescriptionSafetyService {

    SafetyCheckResult checkSafety(PrescriptionRequestDTO prescription, ClinicalMeasurement measurement);

    SafetyCheckResult checkSafetyWithMedicament(PrescriptionRequestDTO prescription, 
                                                ClinicalMeasurement measurement,
                                                everCare.appointments.entities.Medicament medicament);

    SafetyCheckResult checkSafetyWithDTO(PrescriptionRequestDTO prescription, 
                                          ClinicalMeasurementResponseDTO measurement,
                                          everCare.appointments.entities.Medicament medicament);
}