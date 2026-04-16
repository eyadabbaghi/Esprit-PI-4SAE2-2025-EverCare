package everCare.appointments.services;

import everCare.appointments.dtos.ClinicalMeasurementResponseDTO;
import everCare.appointments.dtos.PrescriptionRequestDTO;
import everCare.appointments.dtos.SafetyCheckResult;
import everCare.appointments.entities.ClinicalMeasurement;
import everCare.appointments.entities.Medicament;

public interface PrescriptionSafetyService {

    SafetyCheckResult checkSafety(PrescriptionRequestDTO prescription, ClinicalMeasurement measurement);

    SafetyCheckResult checkSafetyWithMedicament(PrescriptionRequestDTO prescription, 
                                                ClinicalMeasurement measurement,
                                                Medicament medicament);

    SafetyCheckResult checkSafetyWithDTO(PrescriptionRequestDTO prescription, 
                                          ClinicalMeasurementResponseDTO measurement,
                                          Medicament medicament);

    SafetyCheckResult checkDrugInteractionsWithPrescriptions(PrescriptionRequestDTO prescription, 
                                                         String patientId,
                                                         Medicament newMedicament);

    SafetyCheckResult checkTherapeuticDuplicates(PrescriptionRequestDTO prescription,
                                               String patientId,
                                               Medicament newMedicament);
}