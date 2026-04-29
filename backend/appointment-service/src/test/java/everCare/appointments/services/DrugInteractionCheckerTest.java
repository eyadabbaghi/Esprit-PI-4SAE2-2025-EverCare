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

    @BeforeEach
    void setUp() {
        testMedicament = new Medicament();
        testMedicament.setDenominationCommuneInternationale("PARACETAMOL");
        testMedicament.setNomCommercial("DOLIPRANE");
    }

    @Test
    void checkInteractions_withNoActivePrescriptions_returnsNoInteractions() {
        testMedicament.setCommonInteractions("WARFARIN");
        when(prescriptionRepository.findActiveByPatientId("patient123")).thenReturn(Collections.emptyList());

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
                "patient123", testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
        assertEquals("INFO", result.getLevel());
        verify(prescriptionRepository, times(1)).findActiveByPatientId("patient123");
    }

    @Test
    void checkInteractions_withNullPatient_returnsNoInteractions() {
        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
                null, testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
        verifyNoInteractions(prescriptionRepository);
    }

    @Test
    void checkInteractions_withNullMedicament_returnsNoInteractions() {
        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
                "patient123", null, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
        verifyNoInteractions(prescriptionRepository);
    }

    @Test
    void checkInteractions_withNullInteractions_returnsNoInteractions() {
        testMedicament.setCommonInteractions(null);
        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
                "patient123", testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
        verifyNoInteractions(prescriptionRepository);
    }

    @Test
    void checkInteractions_withBlankInteractions_returnsNoInteractions() {
        testMedicament.setCommonInteractions("  ");
        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
                "patient123", testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
        verifyNoInteractions(prescriptionRepository);
    }

    @Test
    void checkInteractions_prescriptionWithNullMedicament_skipsPrescription() {
        Prescription prescription = new Prescription();
        prescription.setPrescriptionId("RX001");
        prescription.setDateDebut(LocalDate.now());
        prescription.setDateFin(LocalDate.now().plusDays(30));
        prescription.setMedicament(null);

        when(prescriptionRepository.findActiveByPatientId("patient123"))
                .thenReturn(List.of(prescription));

        testMedicament.setCommonInteractions("WARFARIN");

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
                "patient123", testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
        verify(prescriptionRepository, times(1)).findActiveByPatientId("patient123");
    }

    @Test
    void checkInteractions_withNoDateOverlap_returnsNoInteractions() {
        Prescription prescription = new Prescription();
        prescription.setPrescriptionId("RX001");
        prescription.setDateDebut(LocalDate.now().minusDays(60));
        prescription.setDateFin(LocalDate.now().minusDays(30));

        Medicament med = new Medicament();
        med.setDenominationCommuneInternationale("WARFARIN");
        med.setNomCommercial("COUMADIN");
        prescription.setMedicament(med);

        when(prescriptionRepository.findActiveByPatientId("patient123"))
                .thenReturn(List.of(prescription));

        testMedicament.setCommonInteractions("WARFARIN");

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
                "patient123", testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
        verify(prescriptionRepository, times(1)).findActiveByPatientId("patient123");
    }

    @Test
    void checkInteractions_initialResult_hasDefaultValues() {
        testMedicament.setCommonInteractions(null);

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
                "patient123", testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertNotNull(result);
        assertFalse(result.isHasInteractions());
        assertEquals("INFO", result.getLevel());
        assertNotNull(result.getInteractions());
        verifyNoInteractions(prescriptionRepository);
    }

    @Test
    void checkInteractions_multipleDrugsParsesCorrectly() {
        testMedicament.setCommonInteractions("WARFARIN, ASPIRIN, IBUPROFEN");

        when(prescriptionRepository.findActiveByPatientId("patient123")).thenReturn(Collections.emptyList());

        DrugInteractionChecker.InteractionCheckResult result = drugInteractionChecker.checkInteractions(
                "patient123", testMedicament, LocalDate.now(), LocalDate.now().plusDays(30));

        assertFalse(result.isHasInteractions());
        verify(prescriptionRepository, times(1)).findActiveByPatientId("patient123");
    }
}