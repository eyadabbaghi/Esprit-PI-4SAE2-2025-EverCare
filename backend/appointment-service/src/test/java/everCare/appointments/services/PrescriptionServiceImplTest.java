package everCare.appointments.services;

import everCare.appointments.dtos.PrescriptionAnalyticsSummaryDTO;
import everCare.appointments.entities.Medicament;
import everCare.appointments.entities.Prescription;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.feign.UserFeignClient;
import everCare.appointments.dtos.UserSimpleDTO;
import everCare.appointments.repositories.MedicamentRepository;
import everCare.appointments.repositories.PrescriptionRepository;
import everCare.appointments.repositories.AppointmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrescriptionServiceImplTest {

    @Mock
    private PrescriptionRepository prescriptionRepository;

    @Mock
    private UserFeignClient userFeignClient;

    @Mock
    private MedicamentRepository medicamentRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    private PrescriptionServiceImpl service;

    private Medicament testMedicament;
    private Prescription testPrescription;
    private UserSimpleDTO testPatient;
    private UserSimpleDTO testDoctor;

    @BeforeEach
    void setUp() {
        service = new PrescriptionServiceImpl(
            prescriptionRepository, 
            userFeignClient, 
            medicamentRepository, 
            appointmentRepository);

        testMedicament = new Medicament();
        testMedicament.setMedicamentId("med-001");
        testMedicament.setNomCommercial("Doliprane");
        testMedicament.setDenominationCommuneInternationale("Paracétamol");
        testMedicament.setActif(true);

        testPrescription = new Prescription();
        testPrescription.setPrescriptionId("rx-001");
        testPrescription.setPatientId("patient-001");
        testPrescription.setDoctorId("doctor-001");
        testPrescription.setMedicament(testMedicament);
        testPrescription.setDateDebut(LocalDate.now());
        testPrescription.setDateFin(LocalDate.now().plusDays(30));
        testPrescription.setStatut("ACTIVE");
        testPrescription.setPosologie("1 comprimé 3x par jour");

        testPatient = new UserSimpleDTO();
        testPatient.setUserId("patient-001");
        testPatient.setName("John Doe");
        testPatient.setEmail("john@example.com");

        testDoctor = new UserSimpleDTO();
        testDoctor.setUserId("doctor-001");
        testDoctor.setName("Dr. Smith");
        testDoctor.setEmail("smith@example.com");
    }

    // ============== CREATE Tests ==============

    @Test
    void createPrescription_validData_returnsSavedPrescription() {
        when(medicamentRepository.findById("med-001")).thenReturn(Optional.of(testMedicament));
        when(prescriptionRepository.findActiveByPatientId(any())).thenReturn(new ArrayList<>());
        when(prescriptionRepository.save(any(Prescription.class))).thenReturn(testPrescription);

        Prescription result = service.createPrescription(testPrescription);

        assertNotNull(result);
        verify(prescriptionRepository).save(any(Prescription.class));
    }

    @Test
    void createPrescriptionFromConsultation_validData_returnsPrescription() {
        when(userFeignClient.getUserById("patient-001")).thenReturn(testPatient);
        when(userFeignClient.getUserById("doctor-001")).thenReturn(testDoctor);
        when(medicamentRepository.findById("med-001")).thenReturn(Optional.of(testMedicament));
        when(prescriptionRepository.findActiveByPatientId(any())).thenReturn(new ArrayList<>());
        when(prescriptionRepository.save(any(Prescription.class))).thenReturn(testPrescription);

        Prescription result = service.createPrescriptionFromConsultation(
            "patient-001", "doctor-001", null, "med-001",
            LocalDate.now(), LocalDate.now().plusDays(30),
            "1 comprimé 3x par jour", null, true, 2, null, null, null, null, null);

        assertNotNull(result);
        verify(prescriptionRepository).save(any(Prescription.class));
    }

    @Test
    void createPrescriptionFromConsultation_patientNotFound_throwsException() {
        when(userFeignClient.getUserById("patient-001")).thenReturn(null);

        assertThrows(ResourceNotFoundException.class, () -> 
            service.createPrescriptionFromConsultation(
                "patient-001", "doctor-001", null, "med-001",
                LocalDate.now(), LocalDate.now().plusDays(30),
                "1 comprimé", null, true, 0, null, null, null, null, null));
    }

    @Test
    void createPrescriptionFromConsultation_doctorNotFound_throwsException() {
        when(userFeignClient.getUserById("patient-001")).thenReturn(testPatient);
        when(userFeignClient.getUserById("doctor-001")).thenReturn(null);

        assertThrows(ResourceNotFoundException.class, () -> 
            service.createPrescriptionFromConsultation(
                "patient-001", "doctor-001", null, "med-001",
                LocalDate.now(), LocalDate.now().plusDays(30),
                "1 comprimé", null, true, 0, null, null, null, null, null));
    }

    @Test
    void createPrescriptionFromConsultation_medicamentNotFound_throwsException() {
        when(userFeignClient.getUserById("patient-001")).thenReturn(testPatient);
        when(userFeignClient.getUserById("doctor-001")).thenReturn(testDoctor);
        when(medicamentRepository.findById("med-001")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> 
            service.createPrescriptionFromConsultation(
                "patient-001", "doctor-001", null, "med-001",
                LocalDate.now(), LocalDate.now().plusDays(30),
                "1 comprimé", null, true, 0, null, null, null, null, null));
    }

    // ============== READ Tests ==============

    @Test
    void getAllPrescriptions_returnsAll() {
        List<Prescription> prescriptions = List.of(testPrescription);
        when(prescriptionRepository.findAll()).thenReturn(prescriptions);

        List<Prescription> result = service.getAllPrescriptions();

        assertEquals(1, result.size());
    }

    @Test
    void getPrescriptionById_existingId_returnsPrescription() {
        when(prescriptionRepository.findById("rx-001")).thenReturn(Optional.of(testPrescription));

        Prescription result = service.getPrescriptionById("rx-001");

        assertNotNull(result);
        assertEquals("rx-001", result.getPrescriptionId());
    }

    @Test
    void getPrescriptionById_nonExistingId_throwsException() {
        when(prescriptionRepository.findById("rx-999")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getPrescriptionById("rx-999"));
    }

    @Test
    void getPrescriptionsByPatient_existingPatient_returnsList() {
        // Mock the user validation call
        when(userFeignClient.getUserById("patient-001")).thenReturn(testPatient);
        
        List<Prescription> prescriptions = List.of(testPrescription);
        when(prescriptionRepository.findByPatientId("patient-001")).thenReturn(prescriptions);

        List<Prescription> result = service.getPrescriptionsByPatient("patient-001");

        assertEquals(1, result.size());
    }

    @Test
    void getPrescriptionsByDoctor_existingDoctor_returnsList() {
        // Mock the user validation call
        when(userFeignClient.getUserById("doctor-001")).thenReturn(testDoctor);
        
        List<Prescription> prescriptions = List.of(testPrescription);
        when(prescriptionRepository.findByDoctorId("doctor-001")).thenReturn(prescriptions);

        List<Prescription> result = service.getPrescriptionsByDoctor("doctor-001");

        assertEquals(1, result.size());
    }

    @Test
    void getActivePrescriptionsByPatient_activePrescriptions_returnsList() {
        // Mock the user validation call
        when(userFeignClient.getUserById("patient-001")).thenReturn(testPatient);
        
        List<Prescription> prescriptions = List.of(testPrescription);
        when(prescriptionRepository.findActiveByPatientId("patient-001")).thenReturn(prescriptions);

        List<Prescription> result = service.getActivePrescriptionsByPatient("patient-001");

        assertEquals(1, result.size());
    }

    @Test
    void getPrescriptionsByStatus_existingStatus_returnsList() {
        List<Prescription> prescriptions = List.of(testPrescription);
        when(prescriptionRepository.findByStatut("ACTIVE")).thenReturn(prescriptions);

        List<Prescription> result = service.getPrescriptionsByStatus("ACTIVE");

        assertEquals(1, result.size());
    }

    @Test
    void getExpiringPrescriptions_expiring_returnsList() {
        List<Prescription> prescriptions = List.of(testPrescription);
        when(prescriptionRepository.findExpiringWithinDays(7)).thenReturn(prescriptions);

        List<Prescription> result = service.getExpiringPrescriptions(7);

        assertEquals(1, result.size());
    }

    @Test
    void getPrescriptionsByAppointment_existingAppointment_returnsList() {
        List<Prescription> prescriptions = List.of(testPrescription);
        when(prescriptionRepository.findByAppointment_AppointmentId("apt-001")).thenReturn(prescriptions);

        List<Prescription> result = service.getPrescriptionsByAppointment("apt-001");

        assertEquals(1, result.size());
    }

    // ============== UPDATE Tests ==============

    @Test
    void terminatePrescription_existingId_returnsTerminated() {
        testPrescription.setStatut("ACTIVE");
        when(prescriptionRepository.findById("rx-001")).thenReturn(Optional.of(testPrescription));
        when(prescriptionRepository.save(any(Prescription.class))).thenReturn(testPrescription);

        Prescription result = service.terminatePrescription("rx-001");

        assertNotNull(result);
    }

    @Test
    void cancelPrescription_existingId_returnsCancelled() {
        when(prescriptionRepository.findById("rx-001")).thenReturn(Optional.of(testPrescription));
        when(prescriptionRepository.save(any(Prescription.class))).thenReturn(testPrescription);

        Prescription result = service.cancelPrescription("rx-001");

        assertNotNull(result);
    }

    @Test
    void renewPrescription_validDates_returnsRenewed() {
        // Make prescription renewable
        testPrescription.setRenouvelable(true);
        
        when(prescriptionRepository.findById("rx-001")).thenReturn(Optional.of(testPrescription));
        when(prescriptionRepository.save(any(Prescription.class))).thenReturn(testPrescription);

        Prescription result = service.renewPrescription("rx-001", LocalDate.now().plusDays(60));

        assertNotNull(result);
    }

    @Test
    void updatePosologie_existingId_returnsUpdated() {
        when(prescriptionRepository.findById("rx-001")).thenReturn(Optional.of(testPrescription));
        when(prescriptionRepository.save(any(Prescription.class))).thenReturn(testPrescription);

        Prescription result = service.updatePosologie("rx-001", "2 comprimés par jour");

        assertNotNull(result);
    }

    // ============== DELETE Tests ==============

    @Test
    void deletePrescription_existingId_deletesSuccessfully() {
        when(prescriptionRepository.existsById("rx-001")).thenReturn(true);
        doNothing().when(prescriptionRepository).deleteById("rx-001");

        service.deletePrescription("rx-001");

        verify(prescriptionRepository).deleteById("rx-001");
    }

    // ============== Utility Tests ==============

    @Test
    void isPrescriptionActive_activePrescription_returnsTrue() {
        when(prescriptionRepository.findById("rx-001")).thenReturn(Optional.of(testPrescription));

        boolean result = service.isPrescriptionActive("rx-001");

        assertTrue(result);
    }

    @Test
    void isPrescriptionActive_inactivePrescription_returnsFalse() {
        testPrescription.setStatut("CANCELLED");
        when(prescriptionRepository.findById("rx-001")).thenReturn(Optional.of(testPrescription));

        boolean result = service.isPrescriptionActive("rx-001");

        assertFalse(result);
    }
}