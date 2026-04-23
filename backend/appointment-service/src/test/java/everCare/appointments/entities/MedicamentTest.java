package everCare.appointments.entities;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MedicamentTest {

    @Test
    void testMedicament_idIsGeneratedWhenNull() {
        Medicament medicament = new Medicament();
        assertNull(medicament.getMedicamentId());
    }

    @Test
    void testMedicament_settersAndGetters() {
        Medicament medicament = new Medicament();
        
        medicament.setNomCommercial("DOLIPRANE");
        medicament.setDenominationCommuneInternationale("PARACETAMOL");
        medicament.setDosage("1000mg");
        medicament.setForme("Comprimé");
        medicament.setActif(true);

        assertEquals("DOLIPRANE", medicament.getNomCommercial());
        assertEquals("PARACETAMOL", medicament.getDenominationCommuneInternationale());
        assertEquals("1000mg", medicament.getDosage());
        assertEquals("Comprimé", medicament.getForme());
        assertTrue(medicament.isActif());
    }

    @Test
    void testMedicament_builder() {
        Medicament medicament = Medicament.builder()
            .nomCommercial("RENITEC")
            .denominationCommuneInternationale("ENALAPRIL")
            .dosage("10mg")
            .forme("Comprimé")
            .actif(true)
            .build();

        assertEquals("RENITEC", medicament.getNomCommercial());
        assertEquals("ENALAPRIL", medicament.getDenominationCommuneInternationale());
        assertEquals("10mg", medicament.getDosage());
        assertTrue(medicament.isActif());
    }

    @Test
    void testMedicament_noArgsConstructor() {
        Medicament medicament = new Medicament();
        assertNotNull(medicament);
    }
}