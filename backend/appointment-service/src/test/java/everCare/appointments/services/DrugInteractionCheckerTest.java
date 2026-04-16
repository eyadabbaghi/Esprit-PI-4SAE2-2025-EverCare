package everCare.appointments.services;

import everCare.appointments.entities.Medicament;
import everCare.appointments.entities.Prescription;
import everCare.appointments.repositories.PrescriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DrugInteractionCheckerTest {

    @Mock
    private PrescriptionRepository prescriptionRepository;

    private DrugInteractionChecker checker;

    private Medicament newMedicament;
    private Prescription existingPrescription;

    @BeforeEach
    void setUp() {
        checker = new DrugInteractionChecker(prescriptionRepository);

        newMedicament = new Medicament();
        newMedicament.setMedicamentId("med-new");
        newMedicament.setNomCommercial("NewDrug");
        newMedicament.setDenominationCommuneInternationale("NewDrugDCI");
        newMedicament.setCommonInteractions("Aspirin,Warfarin");

        existingPrescription = new Prescription();
        existingPrescription.setPrescriptionId("rx-001");
        existingPrescription.setDateDebut(LocalDate.now().minusDays(30));
        existingPrescription.setDateFin(LocalDate.now().plusDays(30));
        
        Medicament existingMed = new Medicament();
        existingMed.setMedicamentId("med-existing");
        existingMed.setNomCommercial("Aspirin");
        existingMed.setDenominationCommuneInternationale("Acide acétylsalicylique");
        existingPrescription.setMedicament(existingMed);
    }

    @Test
    void checkInteractions_nullParams_returnsNoInteraction() {
        DrugInteractionChecker.InteractionCheckResult result = checker.checkInteractions(
            null, null, null, null);

        assertNotNull(result);
        assertFalse(result.isHasInteractions());
        assertEquals("INFO", result.getLevel());
    }

    @Test
    void checkInteractions_noKnownInteractions_returnsNoInteraction() {
        newMedicament.setCommonInteractions(null);
        
        DrugInteractionChecker.InteractionCheckResult result = checker.checkInteractions(
            "patient-001", newMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertNotNull(result);
        assertFalse(result.isHasInteractions());
    }

    @Test
    void checkInteractions_noActivePrescriptions_returnsNoInteraction() {
        when(prescriptionRepository.findActiveByPatientId(any())).thenReturn(new ArrayList<>());
        
        DrugInteractionChecker.InteractionCheckResult result = checker.checkInteractions(
            "patient-001", newMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertNotNull(result);
        assertFalse(result.isHasInteractions());
    }

    @Test
    void checkInteractions_withActiveInteraction_returnsInteraction() {
        when(prescriptionRepository.findActiveByPatientId("patient-001"))
            .thenReturn(List.of(existingPrescription));
        
        DrugInteractionChecker.InteractionCheckResult result = checker.checkInteractions(
            "patient-001", newMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertNotNull(result);
        assertTrue(result.isHasInteractions());
        assertEquals("MILD", result.getLevel());
        assertFalse(result.getInteractions().isEmpty());
    }

    @Test
    void checkInteractions_multipleInteractions_returnsModerateLevel() {
        List<Prescription> prescriptions = new ArrayList<>();
        
        Prescription rx1 = new Prescription();
        rx1.setPrescriptionId("rx-001");
        rx1.setDateDebut(LocalDate.now().minusDays(30));
        rx1.setDateFin(LocalDate.now().plusDays(30));
        Medicament med1 = new Medicament();
        med1.setNomCommercial("Aspirin");
        med1.setDenominationCommuneInternationale("Acide acétylsalicylique");
        rx1.setMedicament(med1);
        
        Prescription rx2 = new Prescription();
        rx2.setPrescriptionId("rx-002");
        rx2.setDateDebut(LocalDate.now().minusDays(30));
        rx2.setDateFin(LocalDate.now().plusDays(30));
        Medicament med2 = new Medicament();
        med2.setNomCommercial("Warfarin");
        med2.setDenominationCommuneInternationale("Warfarin");
        rx2.setMedicament(med2);
        
        prescriptions.add(rx1);
        prescriptions.add(rx2);
        
        when(prescriptionRepository.findActiveByPatientId("patient-001")).thenReturn(prescriptions);
        
        DrugInteractionChecker.InteractionCheckResult result = checker.checkInteractions(
            "patient-001", newMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertNotNull(result);
        assertTrue(result.isHasInteractions());
        assertEquals("MODERATE", result.getLevel());
    }

    @Test
    void checkInteractions_noDateOverlap_returnsNoInteraction() {
        when(prescriptionRepository.findActiveByPatientId("patient-001"))
            .thenReturn(List.of(existingPrescription));
        
        // Non-overlapping dates
        DrugInteractionChecker.InteractionCheckResult result = checker.checkInteractions(
            "patient-001", newMedicament, 
            LocalDate.now().plusDays(60), LocalDate.now().plusDays(90));

        assertNotNull(result);
        assertFalse(result.isHasInteractions());
    }
}