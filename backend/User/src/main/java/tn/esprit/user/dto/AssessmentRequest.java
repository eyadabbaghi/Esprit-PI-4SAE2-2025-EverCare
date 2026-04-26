package tn.esprit.user.dto;

import lombok.Data;

/**
 * Patient assessment questionnaire data.
 * Maps directly to the ML model feature set.
 * Numeric scales: 0-10 unless noted.
 */
@Data
public class AssessmentRequest {

    // Demographics
    private Integer age;
    private Integer gender;          // 0=Male, 1=Female
    private Double bmi;

    // Lifestyle (0-10 scale)
    private Integer smoking;          // 0/1
    private Double alcoholConsumption; // 0-20 drinks/week
    private Double physicalActivity;   // hours/week 0-10
    private Double dietQuality;        // 0-10
    private Double sleepQuality;       // 0-10

    // Medical history (0/1 binary)
    private Integer familyHistoryAlzheimers;
    private Integer cardiovascularDisease;
    private Integer diabetes;
    private Integer depression;
    private Integer headInjury;
    private Integer hypertension;

    // Vital signs
    private Double systolicBP;
    private Double diastolicBP;
    private Double cholesterolTotal;
    private Double cholesterolLDL;
    private Double cholesterolHDL;
    private Double cholesterolTriglycerides;

    // Cognitive & functional assessment (0-10 scale)
    private Double functionalAssessment;  // ability to perform daily tasks 0-10 (10=fully capable)
    private Integer memoryComplaints;     // 0/1
    private Integer behavioralProblems;   // 0/1
    private Double adl;                   // Activities of Daily Living 0-10

    // Symptom checklist (0/1)
    private Integer confusion;
    private Integer disorientation;
    private Integer personalityChanges;
    private Integer difficultyCompletingTasks;
    private Integer forgetfulness;

    // Optional: if MMSE was already performed (0-30)
    private Double mmse;
}
