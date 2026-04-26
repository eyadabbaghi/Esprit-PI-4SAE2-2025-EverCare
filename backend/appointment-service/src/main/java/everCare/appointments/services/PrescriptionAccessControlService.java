/**
 * PrescriptionAccessControlService - Service for prescription access control.
 * 
 * CHANGED: Updated to work with String patientId/doctorId instead of User entities.
 * User data is fetched via Feign client.
 */
package everCare.appointments.services;

import everCare.appointments.dtos.CaregiverPatientsResponseDTO;
import everCare.appointments.entities.Prescription;
import everCare.appointments.entities.UserRole;
import everCare.appointments.feign.PatientFeignClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PrescriptionAccessControlService {

    private final RequestAccessContext requestAccessContext;
    private final PatientFeignClient patientFeignClient;

    public boolean shouldIncludeDoctorNotes() {
        UserRole role = requestAccessContext.requireRole();
        return role == UserRole.DOCTOR || role == UserRole.ADMIN;
    }

    public UserRole getRequesterRole() {
        return requestAccessContext.requireRole();
    }

    public String getRequesterUserId() {
        return requestAccessContext.requireUserId();
    }

    public void assertAdminAccess() {
        if (requestAccessContext.requireRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required.");
        }
    }

    public void assertDoctorScope(String doctorId) {
        UserRole role = requestAccessContext.requireRole();
        String requesterId = requestAccessContext.requireUserId();

        if (role == UserRole.ADMIN) {
            return;
        }

        if (role != UserRole.DOCTOR || !requesterId.equals(doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doctor access denied.");
        }
    }

    public void assertPatientScope(String patientId) {
        UserRole role = requestAccessContext.requireRole();
        String requesterId = requestAccessContext.requireUserId();

        if (role == UserRole.ADMIN) {
            return;
        }

        if (role == UserRole.PATIENT && requesterId.equals(patientId)) {
            return;
        }

        if (role == UserRole.CAREGIVER && isLinkedCaregiver(requesterId, patientId)) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Patient access denied.");
    }

    public void assertCanViewPrescription(Prescription prescription) {
        UserRole role = requestAccessContext.requireRole();
        String requesterId = requestAccessContext.requireUserId();

        if (role == UserRole.ADMIN) {
            return;
        }

        if (role == UserRole.DOCTOR && requesterId.equals(prescription.getDoctorId())) {
            return;
        }

        if (role == UserRole.PATIENT && requesterId.equals(prescription.getPatientId())) {
            return;
        }

        if (role == UserRole.CAREGIVER && isLinkedCaregiver(requesterId, prescription.getPatientId())) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Prescription access denied.");
    }

    public void assertCanManagePrescription(String doctorId) {
        UserRole role = requestAccessContext.requireRole();
        String requesterId = requestAccessContext.requireUserId();

        if (role == UserRole.DOCTOR && requesterId.equals(doctorId)) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the prescribing doctor can manage this prescription.");
    }

    public void assertCanManagePrescription(Prescription prescription) {
        assertCanManagePrescription(prescription.getDoctorId());
    }

    private boolean isLinkedCaregiver(String caregiverId, String patientId) {
        CaregiverPatientsResponseDTO response = patientFeignClient.getPatientsByCaregiverId(caregiverId);
        if (response == null || response.getPatients() == null) {
            return false;
        }

        return response.getPatients().stream()
            .anyMatch(patient -> String.valueOf(patient.getUserId()).equals(patientId));
    }
}
