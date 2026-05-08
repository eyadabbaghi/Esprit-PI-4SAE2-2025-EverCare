package everCare.appointments.services;

import everCare.appointments.entities.Medicament;
import everCare.appointments.entities.Prescription;
import everCare.appointments.repositories.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DrugInteractionChecker {

    private final PrescriptionRepository prescriptionRepository;

    public InteractionCheckResult checkInteractions(String patientId, Medicament newMedicament, LocalDate startDate, LocalDate endDate) {
        InteractionCheckResult result = new InteractionCheckResult();
        result.setHasInteractions(false);
        result.setLevel("INFO");
        result.setInteractions(new ArrayList<>());

        if (patientId == null || newMedicament == null) {
            return result;
        }

        String newMedInteractions = newMedicament.getCommonInteractions();
        if (newMedInteractions == null || newMedInteractions.isBlank()) {
            return result;
        }

        List<String> newMedDrugs = parseDrugNames(newMedInteractions);
        if (newMedDrugs.isEmpty()) {
            return result;
        }

        List<Prescription> activePrescriptions = prescriptionRepository.findActiveByPatientId(patientId);
        
        for (Prescription existingPrescription : activePrescriptions) {
            if (existingPrescription.getMedicament() == null) {
                continue;
            }

            if (!isDateOverlap(existingPrescription.getDateDebut(), existingPrescription.getDateFin(), startDate, endDate)) {
                continue;
            }

            Medicament existingMed = existingPrescription.getMedicament();
            String existingMedName = existingMed.getDenominationCommuneInternationale();
            String existingMedCommercial = existingMed.getNomCommercial();

            for (String interactingDrug : newMedDrugs) {
                if (matchesDrugName(interactingDrug, existingMedName) || 
                    matchesDrugName(interactingDrug, existingMedCommercial)) {
                    
                    InteractionDetail detail = new InteractionDetail();
                    detail.setInteractingDrug(interactingDrug.trim());
                    detail.setExistingMedication(existingMedName + " (" + existingMedCommercial + ")");
                    detail.setPrescriptionId(existingPrescription.getPrescriptionId());
                    result.getInteractions().add(detail);
                    result.setHasInteractions(true);
                }
            }

            String existingInteractions = existingMed.getCommonInteractions();
            if (existingInteractions != null && !existingInteractions.isBlank()) {
                List<String> existingMedDrugs = parseDrugNames(existingInteractions);
                String newMedName = newMedicament.getDenominationCommuneInternationale();
                String newMedCommercial = newMedicament.getNomCommercial();

                for (String interactingDrug : existingMedDrugs) {
                    if (matchesDrugName(interactingDrug, newMedName) || 
                        matchesDrugName(interactingDrug, newMedCommercial)) {
                        
                        InteractionDetail detail = new InteractionDetail();
                        detail.setInteractingDrug(interactingDrug.trim());
                        detail.setExistingMedication(newMedName + " (" + newMedCommercial + ")");
                        result.getInteractions().add(detail);
                        result.setHasInteractions(true);
                    }
                }
            }
        }

        if (result.isHasInteractions()) {
            int count = result.getInteractions().size();
            if (count >= 3) {
                result.setLevel("SEVERE");
            } else if (count == 2) {
                result.setLevel("MODERATE");
            } else {
                result.setLevel("MILD");
            }
        }

        return result;
    }

    private List<String> parseDrugNames(String interactions) {
        List<String> drugs = new ArrayList<>();
        if (interactions == null || interactions.isBlank()) {
            return drugs;
        }

        String[] parts = interactions.split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                drugs.add(trimmed.toLowerCase());
            }
        }
        return drugs;
    }

    private boolean matchesDrugName(String drugName, String medicationName) {
        if (drugName == null || medicationName == null) {
            return false;
        }
        String lowerDrug = drugName.toLowerCase();
        String lowerMed = medicationName.toLowerCase();
        return lowerMed.contains(lowerDrug) || lowerDrug.contains(lowerMed);
    }

    private boolean isDateOverlap(LocalDate start1, LocalDate end1, LocalDate start2, LocalDate end2) {
        if (start1 == null || end1 == null || start2 == null || end2 == null) {
            return true;
        }
        return !end1.isBefore(start2) && !start1.isAfter(end2);
    }

    public static class InteractionCheckResult {
        private boolean hasInteractions;
        private String level;
        private List<InteractionDetail> interactions;

        public boolean isHasInteractions() { return hasInteractions; }
        public void setHasInteractions(boolean hasInteractions) { this.hasInteractions = hasInteractions; }
        public String getLevel() { return level; }
        public void setLevel(String level) { this.level = level; }
        public List<InteractionDetail> getInteractions() { return interactions; }
        public void setInteractions(List<InteractionDetail> interactions) { this.interactions = interactions; }
    }

    public static class InteractionDetail {
        private String interactingDrug;
        private String existingMedication;
        private String prescriptionId;

        public String getInteractingDrug() { return interactingDrug; }
        public void setInteractingDrug(String interactingDrug) { this.interactingDrug = interactingDrug; }
        public String getExistingMedication() { return existingMedication; }
        public void setExistingMedication(String existingMedication) { this.existingMedication = existingMedication; }
        public String getPrescriptionId() { return prescriptionId; }
        public void setPrescriptionId(String prescriptionId) { this.prescriptionId = prescriptionId; }
    }
}