package everCare.appointments.services;

import everCare.appointments.dtos.ClinicalMeasurementResponseDTO;
import everCare.appointments.dtos.PrescriptionRequestDTO;
import everCare.appointments.dtos.SafetyCheckResult;
import everCare.appointments.entities.ClinicalMeasurement;
import everCare.appointments.entities.Medicament;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PrescriptionSafetyServiceImpl implements PrescriptionSafetyService {

    private final DrugInteractionChecker drugInteractionChecker;

    @Override
    public SafetyCheckResult checkSafety(PrescriptionRequestDTO prescription, ClinicalMeasurement measurement) {
        return SafetyCheckResult.builder()
                .isSafe(true)
                .level("INFO")
                .message("No clinical measurements available. Please verify dosage manually.")
                .build();
    }

    @Override
    public SafetyCheckResult checkSafetyWithMedicament(PrescriptionRequestDTO prescription,
                                                         ClinicalMeasurement measurement,
                                                         Medicament medicament) {
        if (measurement == null) {
            return checkSafety(prescription, null);
        }

        List<String> warnings = new ArrayList<>();
        List<String> interactions = new ArrayList<>();
        List<String> contraindications = new ArrayList<>();
        String level = "INFO";
        boolean isSafe = true;

        double prescribedDose = parseDoseFromPosologie(prescription.getPosologie(), medicament.getDoseCalculation());

        if (measurement.getWeight() != null && medicament.getWeightMaxDose() != null) {
            SafetyCheckResult weightCheck = checkWeightBasedDose(prescribedDose, measurement.getWeight(), medicament);
            if (!weightCheck.isSafe()) {
                warnings.add(weightCheck.getMessage());
                if ("CRITICAL".equals(weightCheck.getLevel())) {
                    isSafe = false;
                    level = "CRITICAL";
                } else if ("WARNING".equals(weightCheck.getLevel())) {
                    level = "WARNING";
                }
            }
        }

        if (measurement.getKidneyTestResult() != null && medicament.getRenalAdjustment() != null) {
            SafetyCheckResult kidneyCheck = checkKidneyAdjustment(measurement.getKidneyTestResult(), medicament);
            if (!kidneyCheck.isSafe()) {
                warnings.add(kidneyCheck.getMessage());
                if ("CRITICAL".equals(kidneyCheck.getLevel())) {
                    isSafe = false;
                    level = "CRITICAL";
                } else if ("WARNING".equals(kidneyCheck.getLevel()) && !"CRITICAL".equals(level)) {
                    level = "WARNING";
                }
            }
        }

        if (Boolean.TRUE.equals(measurement.getSevereLiverProblem()) && medicament.getHepaticAdjustment() != null) {
            SafetyCheckResult liverCheck = checkHepaticAdjustment(medicament);
            if (!liverCheck.isSafe()) {
                warnings.add(liverCheck.getMessage());
                if ("CRITICAL".equals(liverCheck.getLevel())) {
                    isSafe = false;
                    level = "CRITICAL";
                } else if ("WARNING".equals(liverCheck.getLevel()) && !"CRITICAL".equals(level)) {
                    level = "WARNING";
                }
            }
        }

        if (measurement.getCurrentMedications() != null && medicament.getCommonInteractions() != null) {
            SafetyCheckResult interactionCheck = checkDrugInteractions(
                    measurement.getCurrentMedications(), 
                    medicament.getCommonInteractions(),
                    medicament.getDenominationCommuneInternationale());
            if (!interactionCheck.isSafe()) {
                interactions.addAll(interactionCheck.getInteractions());
                if ("WARNING".equals(interactionCheck.getLevel()) && !"CRITICAL".equals(level)) {
                    level = "WARNING";
                }
            }
        }

        if (measurement.getAllergies() != null && medicament.getContreIndications() != null) {
            SafetyCheckResult contraindicationCheck = checkAllergiesContraindications(
                    measurement.getAllergies(), medicament.getContreIndications());
            if (!contraindicationCheck.isSafe()) {
                contraindications.addAll(contraindicationCheck.getContraindications());
                isSafe = false;
                level = "CRITICAL";
            }
        }

        String message = warnings.isEmpty() ? "Dosage appears safe for this patient." : String.join("; ", warnings);

        return SafetyCheckResult.builder()
                .isSafe(isSafe)
                .level(level)
                .message(message)
                .suggestedDose(null)
                .interactions(interactions)
                .contraindications(contraindications)
                .build();
    }

    private double parseDoseFromPosologie(String posologie, String doseCalculation) {
        if (posologie == null || doseCalculation == null) {
            return 0;
        }

        try {
            Pattern tabletPattern = Pattern.compile("(\\d+)\\s*comprim");
            Matcher tabletMatcher = tabletPattern.matcher(posologie.toLowerCase());
            if (tabletMatcher.find()) {
                int tablets = Integer.parseInt(tabletMatcher.group(1));
                Pattern mgPattern = Pattern.compile("(\\d+)\\s*mg");
                Matcher mgMatcher = mgPattern.matcher(doseCalculation.toLowerCase());
                if (mgMatcher.find()) {
                    int mgPerTablet = Integer.parseInt(mgMatcher.group(1));
                    return tablets * mgPerTablet;
                }
            }
        } catch (Exception e) {
            return 0;
        }
        return 0;
    }

    private SafetyCheckResult checkWeightBasedDose(double prescribedDose, Double weight, Medicament medicament) {
        if (prescribedDose == 0 || weight == null || medicament.getWeightMaxDose() == null) {
            return SafetyCheckResult.builder().isSafe(true).build();
        }

        Pattern pattern = Pattern.compile("(\\d+\\.?\\d*)\\s*mg/kg");
        Matcher matcher = pattern.matcher(medicament.getWeightMaxDose().toLowerCase());
        if (matcher.find()) {
            double maxMgPerKg = Double.parseDouble(matcher.group(1));
            double maxDose = maxMgPerKg * weight;
            if (prescribedDose > maxDose) {
                return SafetyCheckResult.builder()
                        .isSafe(false)
                        .level("WARNING")
                        .message(String.format("Dose (%.0fmg) exceeds weight-based maximum (%.0fmg for %.1fkg). Consider reducing.",
                                prescribedDose, maxDose, weight))
                        .suggestedDose(String.format("Max: %.0fmg", maxDose))
                        .build();
            }
        }
        return SafetyCheckResult.builder().isSafe(true).build();
    }

    private SafetyCheckResult checkKidneyAdjustment(String kidneyTestResult, Medicament medicament) {
        Integer eGFR = parseEGFR(kidneyTestResult);
        if (eGFR == null || medicament.getRenalAdjustment() == null) {
            return SafetyCheckResult.builder().isSafe(true).build();
        }

        String adjustment = medicament.getRenalAdjustment().toLowerCase();

        if (eGFR < 30) {
            if (adjustment.contains("avoid") || adjustment.contains("contraindicated")) {
                return SafetyCheckResult.builder()
                        .isSafe(false)
                        .level("CRITICAL")
                        .message("CONTRAINDICATED: Drug should be avoided with eGFR < 30 ml/min/1.73m²")
                        .build();
            }
            Pattern reducePattern = Pattern.compile("(\\d+)%\\s+if\\s+egfr<(\\d+)");
            Matcher matcher = reducePattern.matcher(adjustment);
            if (matcher.find()) {
                int reducePercent = Integer.parseInt(matcher.group(1));
                return SafetyCheckResult.builder()
                        .isSafe(false)
                        .level("WARNING")
                        .message(String.format("Reduce dose by %d%% due to severe renal impairment (eGFR: %d). %s",
                                reducePercent, eGFR, adjustment))
                        .build();
            }
        } else if (eGFR < 60) {
            if (adjustment.contains("avoid")) {
                return SafetyCheckResult.builder()
                        .isSafe(false)
                        .level("WARNING")
                        .message(String.format("Use with caution: eGFR %d. %s", eGFR, adjustment))
                        .build();
            }
        }

        return SafetyCheckResult.builder().isSafe(true).build();
    }

    private SafetyCheckResult checkHepaticAdjustment(Medicament medicament) {
        if (medicament.getHepaticAdjustment() == null) {
            return SafetyCheckResult.builder().isSafe(true).build();
        }

        String adjustment = medicament.getHepaticAdjustment().toLowerCase();
        if (adjustment.contains("avoid") || adjustment.contains("contraindicated")) {
            return SafetyCheckResult.builder()
                    .isSafe(false)
                    .level("CRITICAL")
                    .message("CONTRAINDICATED: Drug should be avoided with severe liver impairment")
                    .build();
        }

        return SafetyCheckResult.builder()
                .isSafe(false)
                .level("WARNING")
                .message("Use with caution: " + adjustment)
                .build();
    }

    private SafetyCheckResult checkDrugInteractions(String currentMeds, String knownInteractions, String drugName) {
        List<String> foundInteractions = new ArrayList<>();
        if (currentMeds == null || knownInteractions == null) {
            return SafetyCheckResult.builder().isSafe(true).build();
        }

        String[] currentMedsList = currentMeds.toLowerCase().split("[,;]");
        String[] interactionList = knownInteractions.toLowerCase().split("[,;]");

        for (String current : currentMedsList) {
            for (String interaction : interactionList) {
                if (current.trim().contains(interaction.trim()) || interaction.trim().contains(current.trim())) {
                    foundInteractions.add("Interaction: " + current.trim() + " with " + drugName);
                }
            }
        }

        if (!foundInteractions.isEmpty()) {
            return SafetyCheckResult.builder()
                    .isSafe(false)
                    .level("WARNING")
                    .message("Potential drug interactions detected")
                    .interactions(foundInteractions)
                    .build();
        }

        return SafetyCheckResult.builder().isSafe(true).build();
    }

    private SafetyCheckResult checkAllergiesContraindications(String allergies, String contraindications) {
        List<String> foundContra = new ArrayList<>();
        if (allergies == null || contraindications == null) {
            return SafetyCheckResult.builder().isSafe(true).build();
        }

        String[] allergiesList = allergies.toLowerCase().split("[,;]");
        String[] contraList = contraindications.toLowerCase().split("[,;]");

        for (String allergy : allergiesList) {
            for (String contra : contraList) {
                if (allergy.trim().contains(contra.trim()) || contra.trim().contains(allergy.trim())) {
                    foundContra.add("Contraindicated: " + allergy.trim());
                }
            }
        }

        if (!foundContra.isEmpty()) {
            return SafetyCheckResult.builder()
                    .isSafe(false)
                    .level("CRITICAL")
                    .message("Patient has known allergy/contraindication")
                    .contraindications(foundContra)
                    .build();
        }

        return SafetyCheckResult.builder().isSafe(true).build();
    }

    private Integer parseEGFR(String kidneyTestResult) {
        if (kidneyTestResult == null || kidneyTestResult.equalsIgnoreCase("none")) {
            return null;
        }
        Pattern pattern = Pattern.compile("eGFR[:\\s]*(\\d+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(kidneyTestResult);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        try {
            return Integer.parseInt(kidneyTestResult.replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public SafetyCheckResult checkSafetyWithDTO(PrescriptionRequestDTO prescription,
                                                  ClinicalMeasurementResponseDTO measurement,
                                                  Medicament medicament) {
        if (measurement == null) {
            return checkSafety(prescription, null);
        }

        List<String> warnings = new ArrayList<>();
        List<String> interactions = new ArrayList<>();
        List<String> contraindicationsList = new ArrayList<>();
        String level = "INFO";
        boolean isSafe = true;

        double prescribedDose = parseDoseFromPosologie(prescription.getPosologie(), medicament.getDoseCalculation());

        if (measurement.getWeight() != null && medicament.getWeightMaxDose() != null) {
            SafetyCheckResult weightCheck = checkWeightBasedDose(prescribedDose, measurement.getWeight(), medicament);
            if (!weightCheck.isSafe()) {
                warnings.add(weightCheck.getMessage());
                if ("CRITICAL".equals(weightCheck.getLevel())) {
                    isSafe = false;
                    level = "CRITICAL";
                } else if ("WARNING".equals(weightCheck.getLevel())) {
                    level = "WARNING";
                }
            }
        }

        if (measurement.getKidneyTestResult() != null && medicament.getRenalAdjustment() != null) {
            SafetyCheckResult kidneyCheck = checkKidneyAdjustment(measurement.getKidneyTestResult(), medicament);
            if (!kidneyCheck.isSafe()) {
                warnings.add(kidneyCheck.getMessage());
                if ("CRITICAL".equals(kidneyCheck.getLevel())) {
                    isSafe = false;
                    level = "CRITICAL";
                } else if ("WARNING".equals(kidneyCheck.getLevel()) && !"CRITICAL".equals(level)) {
                    level = "WARNING";
                }
            }
        }

        if (Boolean.TRUE.equals(measurement.getSevereLiverProblem()) && medicament.getHepaticAdjustment() != null) {
            SafetyCheckResult liverCheck = checkHepaticAdjustment(medicament);
            if (!liverCheck.isSafe()) {
                warnings.add(liverCheck.getMessage());
                if ("CRITICAL".equals(liverCheck.getLevel())) {
                    isSafe = false;
                    level = "CRITICAL";
                } else if ("WARNING".equals(liverCheck.getLevel()) && !"CRITICAL".equals(level)) {
                    level = "WARNING";
                }
            }
        }

        if (measurement.getCurrentMedications() != null && medicament.getCommonInteractions() != null) {
            SafetyCheckResult interactionCheck = checkDrugInteractions(
                    measurement.getCurrentMedications(),
                    medicament.getCommonInteractions(),
                    medicament.getDenominationCommuneInternationale());
            if (!interactionCheck.isSafe()) {
                interactions.addAll(interactionCheck.getInteractions());
                if ("WARNING".equals(interactionCheck.getLevel()) && !"CRITICAL".equals(level)) {
                    level = "WARNING";
                }
            }
        }

        if (measurement.getAllergies() != null && medicament.getContreIndications() != null) {
            SafetyCheckResult contraindicationCheck = checkAllergiesContraindications(
                    measurement.getAllergies(), medicament.getContreIndications());
            if (!contraindicationCheck.isSafe()) {
                contraindicationsList.addAll(contraindicationCheck.getContraindications());
                isSafe = false;
                level = "CRITICAL";
            }
        }

        String message = warnings.isEmpty() ? "Dosage appears safe for this patient." : String.join("; ", warnings);

        return SafetyCheckResult.builder()
                .isSafe(isSafe)
                .level(level)
                .message(message)
                .suggestedDose(null)
                .interactions(interactions)
                .contraindications(contraindicationsList)
                .build();
    }

    @Override
    public SafetyCheckResult checkDrugInteractionsWithPrescriptions(PrescriptionRequestDTO prescription,
                                                                 String patientId,
                                                                 Medicament newMedicament) {
        if (patientId == null || newMedicament == null) {
            return SafetyCheckResult.builder()
                    .isSafe(true)
                    .level("INFO")
                    .message("No interactions to check.")
                    .build();
        }

        java.time.LocalDate startDate = prescription.getDateDebut() != null ? prescription.getDateDebut() : java.time.LocalDate.now();
        java.time.LocalDate endDate = prescription.getDateFin();

        var result = drugInteractionChecker.checkInteractions(patientId, newMedicament, startDate, endDate);

        if (result.isHasInteractions()) {
            List<String> interactionMessages = new ArrayList<>();
            for (var detail : result.getInteractions()) {
                interactionMessages.add(detail.getInteractingDrug() + " conflicts with " + detail.getExistingMedication());
            }
            String level = result.getLevel();
            boolean critical = "SEVERE".equals(level);

            return SafetyCheckResult.builder()
                    .isSafe(!critical)
                    .level(level)
                    .message("Drug interaction detected: " + String.join("; ", interactionMessages))
                    .interactions(interactionMessages)
                    .build();
        }

        return SafetyCheckResult.builder()
                .isSafe(true)
                .level("INFO")
                .message("No interactions with current prescriptions.")
                .build();
    }
}