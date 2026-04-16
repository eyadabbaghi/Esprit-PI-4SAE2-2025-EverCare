package everCare.appointments.services;

import everCare.appointments.entities.Medicament;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.repositories.MedicamentRepository;
import everCare.appointments.repositories.PrescriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MedicamentServiceImplTest {

    @Mock
    private MedicamentRepository medicamentRepository;

    @Mock
    private PrescriptionRepository prescriptionRepository;

    private MedicamentServiceImpl service;

    private Medicament testMedicament;

    @BeforeEach
    void setUp() {
        service = new MedicamentServiceImpl(medicamentRepository, prescriptionRepository);

        testMedicament = new Medicament();
        testMedicament.setMedicamentId("med-001");
        testMedicament.setNomCommercial("Doliprane");
        testMedicament.setDenominationCommuneInternationale("Paracétamol");
        testMedicament.setActif(true);
        testMedicament.setCodeCIP("12345678");
    }

    // ============== CREATE Tests ==============

    @Test
    void createMedicament_validData_returnsSavedMedicament() {
        when(medicamentRepository.findByCodeCIP(any())).thenReturn(null);
        when(medicamentRepository.save(any(Medicament.class))).thenReturn(testMedicament);

        Medicament result = service.createMedicament(testMedicament);

        assertNotNull(result);
        assertTrue(testMedicament.isActif()); // Default active should be true
    }

    @Test
    void createMedicament_duplicateCodeCIP_throwsException() {
        Medicament existing = new Medicament();
        existing.setCodeCIP("12345678");
        
        when(medicamentRepository.findByCodeCIP("12345678")).thenReturn(existing);

        assertThrows(Exception.class, () -> service.createMedicament(testMedicament));
    }

    // ============== READ Tests ==============

    @Test
    void getAllMedicaments_returnsAll() {
        List<Medicament> medicaments = List.of(testMedicament);
        when(medicamentRepository.findAll()).thenReturn(medicaments);

        List<Medicament> result = service.getAllMedicaments();

        assertEquals(1, result.size());
    }

    @Test
    void getMedicamentById_existingId_returnsMedicament() {
        when(medicamentRepository.findById("med-001")).thenReturn(Optional.of(testMedicament));

        Optional<Medicament> result = service.getMedicamentById("med-001");

        assertTrue(result.isPresent());
        assertEquals("med-001", result.get().getMedicamentId());
    }

    @Test
    void getMedicamentById_nonExistingId_returnsEmpty() {
        when(medicamentRepository.findById("med-999")).thenReturn(Optional.empty());

        Optional<Medicament> result = service.getMedicamentById("med-999");

        assertFalse(result.isPresent());
    }

    @Test
    void getMedicamentByCodeCIP_existingCode_returnsMedicament() {
        when(medicamentRepository.findByCodeCIP("12345678")).thenReturn(testMedicament);

        Optional<Medicament> result = service.getMedicamentByCodeCIP("12345678");

        assertTrue(result.isPresent());
    }

    @Test
    void searchMedicaments_byName_returnsList() {
        List<Medicament> medicaments = List.of(testMedicament);
        when(medicamentRepository.findByNomCommercialContainingIgnoreCase("Doli")).thenReturn(medicaments);

        List<Medicament> result = service.searchMedicaments("Doli", null, null, null);

        assertEquals(1, result.size());
    }

    @Test
    void searchMedicaments_byDCI_returnsList() {
        List<Medicament> medicaments = List.of(testMedicament);
        when(medicamentRepository.findByDenominationCommuneInternationaleContainingIgnoreCase("Paracétamol")).thenReturn(medicaments);

        List<Medicament> result = service.searchMedicaments(null, "Paracétamol", null, null);

        assertEquals(1, result.size());
    }

    @Test
    void searchMedicaments_activeOnly_returnsList() {
        List<Medicament> medicaments = List.of(testMedicament);
        when(medicamentRepository.findByActifTrue()).thenReturn(medicaments);

        List<Medicament> result = service.searchMedicaments(null, null, null, true);

        assertEquals(1, result.size());
    }

    @Test
    void getActiveMedicaments_returnsList() {
        List<Medicament> medicaments = List.of(testMedicament);
        when(medicamentRepository.findByActifTrue()).thenReturn(medicaments);

        List<Medicament> result = service.getActiveMedicaments();

        assertEquals(1, result.size());
    }

    @Test
    void getMedicamentsByForm_returnsList() {
        List<Medicament> medicaments = List.of(testMedicament);
        when(medicamentRepository.findByForme("Comprimé")).thenReturn(medicaments);

        List<Medicament> result = service.getMedicamentsByForm("Comprimé");

        assertEquals(1, result.size());
    }

    @Test
    void getMedicamentsByLaboratory_returnsList() {
        List<Medicament> medicaments = List.of(testMedicament);
        when(medicamentRepository.findByLaboratoire("Sanofi")).thenReturn(medicaments);

        List<Medicament> result = service.getMedicamentsByLaboratory("Sanofi");

        assertEquals(1, result.size());
    }

    // ============== UPDATE Tests ==============

    @Test
    void updateMedicament_existingId_returnsUpdated() {
        when(medicamentRepository.findById("med-001")).thenReturn(Optional.of(testMedicament));
        when(medicamentRepository.save(any(Medicament.class))).thenReturn(testMedicament);

        Medicament result = service.updateMedicament("med-001", testMedicament);

        assertNotNull(result);
    }

    @Test
    void updateMedicament_nonExistingId_throwsException() {
        when(medicamentRepository.findById("med-999")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> 
            service.updateMedicament("med-999", testMedicament));
    }

    @Test
    void deactivateMedicament_existingId_returnsDeactivated() {
        when(medicamentRepository.findById("med-001")).thenReturn(Optional.of(testMedicament));
        when(medicamentRepository.save(any(Medicament.class))).thenReturn(testMedicament);

        Medicament result = service.deactivateMedicament("med-001");

        assertNotNull(result);
    }

    // ============== DELETE Tests ==============

    @Test
    void deleteMedicament_existingId_deletesSuccessfully() {
        when(medicamentRepository.existsById("med-001")).thenReturn(true);
        when(prescriptionRepository.findByMedicament(testMedicament)).thenReturn(new ArrayList<>());
        doNothing().when(medicamentRepository).deleteById("med-001");

        service.deleteMedicament("med-001");

        verify(medicamentRepository).deleteById("med-001");
    }

    @Test
    void deleteMedicament_withPrescriptions_throwsException() {
        List<Prescription> prescriptions = List.of(new Prescription());
        when(medicamentRepository.existsById("med-001")).thenReturn(true);
        when(prescriptionRepository.findByMedicament(testMedicament)).thenReturn(prescriptions);

        assertThrows(Exception.class, () -> service.deleteMedicament("med-001"));
    }

    // ============== Utility Tests ==============

    @Test
    void existsById_existingId_returnsTrue() {
        when(medicamentRepository.existsById("med-001")).thenReturn(true);

        boolean result = service.existsById("med-001");

        assertTrue(result);
    }

    @Test
    void existsById_nonExistingId_returnsFalse() {
        when(medicamentRepository.existsById("med-999")).thenReturn(false);

        boolean result = service.existsById("med-999");

        assertFalse(result);
    }

    @Test
    void isActive_existingActive_returnsTrue() {
        when(medicamentRepository.findById("med-001")).thenReturn(Optional.of(testMedicament));

        boolean result = service.isActive("med-001");

        assertTrue(result);
    }

    @Test
    void isActive_inactive_returnsFalse() {
        testMedicament.setActif(false);
        when(medicamentRepository.findById("med-001")).thenReturn(Optional.of(testMedicament));

        boolean result = service.isActive("med-001");

        assertFalse(result);
    }

    // Import for Prescription
    private static class Prescription {
        // Placeholder for testing deletion with prescriptions
    }
}