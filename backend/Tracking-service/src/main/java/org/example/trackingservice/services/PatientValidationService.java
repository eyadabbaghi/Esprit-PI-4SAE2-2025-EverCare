package org.example.trackingservice.services;

import feign.FeignException;
import org.example.trackingservice.client.UserServiceClient;
import org.example.trackingservice.dto.PatientUserDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PatientValidationService {

    private static final Logger log = LoggerFactory.getLogger(PatientValidationService.class);
    private final UserServiceClient userServiceClient;

    public PatientValidationService(UserServiceClient userServiceClient) {
        this.userServiceClient = userServiceClient;
    }

    public PatientUserDto validatePatientExists(String patientId) {

        if (patientId == null || patientId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "patientId is required");
        }

        try {
            PatientUserDto patient = userServiceClient.getPatientById(patientId);

            if (patient == null || patient.getUserId() == null || patient.getUserId().isBlank()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found: " + patientId);
            }

            return patient;
        } catch (FeignException.NotFound ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found: " + patientId);
        } catch (FeignException ex) {
            log.warn("User service unavailable, skipping validation for patient: {}", patientId);
            return null;
        }
    }
}
