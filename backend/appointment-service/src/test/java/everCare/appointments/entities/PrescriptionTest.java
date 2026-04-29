package everCare.appointments.entities;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class PrescriptionTest {

    @Test
    void testPrescription_idIsGeneratedWhenNull() {
        Prescription prescription = new Prescription();
        assertNull(prescription.getPrescriptionId());
    }

    @Test
    void testPrescription_settersAndGetters() {
        Prescription prescription = new Prescription();
        
        prescription.setPatientId("patient123");
        prescription.setDoctorId("doctor456");
        prescription.setDatePrescription(LocalDate.now());
        prescription.setDateDebut(LocalDate.now());
        prescription.setDateFin(LocalDate.now().plusDays(30));
        prescription.setRenouvelable(true);
        prescription.setNombreRenouvellements(3);
        prescription.setStatut("ACTIVE");

        assertEquals("patient123", prescription.getPatientId());
        assertEquals("doctor456", prescription.getDoctorId());
        assertTrue(prescription.getRenouvelable());
        assertEquals(3, prescription.getNombreRenouvellements());
        assertEquals("ACTIVE", prescription.getStatut());
    }

    @Test
    void testPrescription_builder() {
        Prescription prescription = Prescription.builder()
            .patientId("patient123")
            .doctorId("doctor456")
            .datePrescription(LocalDate.of(2024, 1, 15))
            .dateDebut(LocalDate.of(2024, 1, 15))
            .dateFin(LocalDate.of(2024, 2, 15))
            .renouvelable(true)
            .statut("ACTIVE")
            .build();

        assertEquals("patient123", prescription.getPatientId());
        assertEquals("doctor456", prescription.getDoctorId());
        assertTrue(prescription.getRenouvelable());
        assertEquals("ACTIVE", prescription.getStatut());
    }

    @Test
    void testPrescription_noArgsConstructor() {
        Prescription prescription = new Prescription();
        assertNotNull(prescription);
    }

    @Test
    void testPrescription_defaultStatut() {
        Prescription prescription = new Prescription();
        assertNull(prescription.getStatut());
    }

    @Test
    void testPrescription_defaultRenouvelable() {
        Prescription prescription = new Prescription();
        assertFalse(prescription.getRenouvelable());
    }

    @Test
    void testPrescription_defaultNombreRenouvellements() {
        Prescription prescription = new Prescription();
        assertEquals(0, prescription.getNombreRenouvellements());
    }
}