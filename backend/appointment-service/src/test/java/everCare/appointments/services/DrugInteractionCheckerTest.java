package everCare.appointments.services;

import everCare.appointments.entities.Medicament;
import everCare.appointments.entities.Prescription;
import everCare.appointments.repositories.PrescriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DrugInteractionCheckerTest {

    @Mock
    private PrescriptionRepository prescriptionRepository;

    @InjectMocks
    private DrugInteractionChecker drugInteractionChecker;

    private Medicament testMedicament;
    private Prescription testPrescription;

    @BeforeEach
    void setUp() {
        testMedicament = new Medicament();
        testMedicament.setDenominationCommuneInternationale("PARACETAMOL");
        testMedicament.setNomCommercial("DOLIPRANE");
        testMedicament.setCommonInteractions("WARFARIN");

        testPrescription = new Prescription();
        testPrescription.setPrescriptionId("RX001");
        testPrescription.setDateDebut(LocalDate.now());
        testPrescription.setDateFin(LocalDate.now().plusDays(30));
        testPrescription.setMedicament(testMedicament);
    }

    @Test
    void checkInteractions_withNoActivePrescriptions_returnsNoInteractions() {
        when(prescriptionRepository.findActiveByPatientId("patient123")).thenReturn(Collections.emptyList());

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
        assertEquals("INFO", result.getLevel());
        assertTrue(result.getInteractions().isEmpty());
    }

    @Test
    void checkInteractions_withNullPatient_returnsNoInteractions() {
        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            null, testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
    }

    @Test
    void checkInteractions_withNullMedicament_returnsNoInteractions() {
        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", null, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
    }

    @Test
    void checkInteractions_withNoInteractionsData_returnsNoInteractions() {
        testMedicament.setCommonInteractions(null);
        when(prescriptionRepository.findActiveByPatientId("patient123")).thenReturn(Collections.emptyList());

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
    }

    @Test
    void checkInteractions_withEmptyInteractions_returnsNoInteractions() {
        testMedicament.setCommonInteractions("  ");
        when(prescriptionRepository.findActiveByPatientId("patient123")).thenReturn(Collections.emptyList());

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
    }

    @Test
    void checkInteractions_withMatchingDrug_returnsInteractions() {
        when(prescriptionRepository.findActiveByPatientId("patient123"))
            .thenReturn(List.of(testPrescription));

        Medicament newMed = new Medicament();
        newMed.setDenominationCommuneInternationale("ASPIRIN");
        newMed.setNomCommercial("KARDEGIC");
        newMed.setCommonInteractions("WARFARIN, PARACETAMOL");

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", newMed, LocalDate.now(), LocalDate.now().plusDays(30));

        assertTrue(result.isHasInteractions());
        assertFalse(result.getInteractions().isEmpty());
    }

    @Test
    void checkInteractions_withOverlappingDates_detectsInteractions() {
        when(prescriptionRepository.findActiveByPatientId("patient123"))
            .thenReturn(List.of(testPrescription));

        Medicament newMed = new Medicament();
        newMed.setDenominationCommuneInternationale("ASPIRIN");
        newMed.setNomCommercial("KARDEGIC");
        newMed.setCommonInteractions("WARFARIN");

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", newMed, LocalDate.now(), LocalDate.now().plusDays(30));

        assertTrue(result.isHasInteractions());
    }

    @Test
    void checkInteractions_withNoDateOverlap_returnsNoInteractions() {
        when(prescriptionRepository.findActiveByPatientId("patient123"))
            .thenReturn(List.of(testPrescription));

        Medicament newMed = new Medicament();
        newMed.setDenominationCommuneInternationale("ASPIRIN");
        newMed.setNomCommercial("KARDEGIC");
        newMed.setCommonInteractions("WARFARIN");

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", newMed,
            LocalDate.now().plusDays(60), LocalDate.now().plusDays(90));

        assertFalse(result.isHasInteractions());
    }

    @Test
    void checkInteractions_multipleInteractions_setsSevereLevel() {
        Prescription rx2 = new Prescription();
        rx2.setPrescriptionId("RX002");
        rx2.setDateDebut(LocalDate.now());
        rx2.setDateFin(LocalDate.now().plusDays(30));
        Medicament med2 = new Medicament();
        med2.setDenominationCommuneInternationale("MED2");
        med2.setNomCommercial("NAME2");
        med2.setCommonInteractions("DRUG1");
        rx2.setMedicament(med2);

        Prescription rx3 = new Prescription();
        rx3.setPrescriptionId("RX003");
        rx3.setDateDebut(LocalDate.now());
        rx3.setDateFin(LocalDate.now().plusDays(30));
        Medicament med3 = new Medicament();
        med3.setDenominationCommuneInternationale("MED3");
        med3.setNomCommercial("NAME3");
        med3.setCommonInteractions("DRUG2");
        rx3.setMedicament(med3);

        when(prescriptionRepository.findActiveByPatientId("patient123"))
            .thenReturn(List.of(testPrescription, rx2, rx3));

        Medicament newMed = new Medicament();
        newMed.setDenominationCommuneInternationale("NEWDRUG");
        newMed.setNomCommercial("NEWNAME");
        newMed.setCommonInteractions("DRUG1,DRUG2,DRUG3,DRUG4");

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", newMed, LocalDate.now(), LocalDate.now().plusDays(30));

        assertTrue(result.isHasInteractions());
        assertEquals("SEVERE", result.getLevel());
    }

    @Test
    void checkInteractions_singleInteraction_setsMildLevel() {
        when(prescriptionRepository.findActiveByPatientId("patient123"))
            .thenReturn(List.of(testPrescription));

        Medicament newMed = new Medicament();
        newMed.setDenominationCommuneInternationale("ASPIRIN");
        newMed.setNomCommercial("KARDEGIC");
        newMed.setCommonInteractions("WARFARIN");

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", newMed, LocalDate.now(), LocalDate.now().plusDays(30));

        assertEquals("MILD", result.getLevel());
    }

    @Test
    void checkInteractions_twoInteractions_setsModerateLevel() {
        Prescription rx2 = new Prescription();
        rx2.setPrescriptionId("RX002");
        rx2.setDateDebut(LocalDate.now());
        rx2.setDateFin(LocalDate.now().plusDays(30));
        Medicament med2 = new Medicament();
        med2.setDenominationCommuneInternationale("MED2");
        med2.setNomCommercial("NAME2");
        med2.setCommonInteractions("DRUG1");
        rx2.setMedicament(med2);

        when(prescriptionRepository.findActiveByPatientId("patient123"))
            .thenReturn(List.of(testPrescription, rx2));

        Medicament newMed = new Medicament();
        newMed.setDenominationCommuneInternationale("NEWDRUG");
        newMed.setNomCommercial("NEWNAME");
        newMed.setCommonInteractions("DRUG1,DRUG2");

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", newMed, LocalDate.now(), LocalDate.now().plusDays(30));

        assertEquals("MODERATE", result.getLevel());
    }

    @Test
    void checkInteractions_prescriptionWithNullMedicament_skipsPrescription() {
        testPrescription.setMedicament(null);
        when(prescriptionRepository.findActiveByPatientId("patient123"))
            .thenReturn(List.of(testPrescription));

        Medicament newMed = new Medicament();
        newMed.setDenominationCommuneInternationale("ASPIRIN");
        newMed.setNomCommercial("KARDEGIC");
        newMed.setCommonInteractions("WARFARIN");

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
            "patient123", newMed, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
    }
}