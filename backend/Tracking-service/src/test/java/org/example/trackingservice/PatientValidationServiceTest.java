package org.example.trackingservice;

import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import feign.Response;
import org.example.trackingservice.client.UserServiceClient;
import org.example.trackingservice.dto.PatientUserDto;
import org.example.trackingservice.services.PatientValidationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatientValidationServiceTest {

    @Mock
    private UserServiceClient userServiceClient;

    @InjectMocks
    private PatientValidationService service;

    @Test
    void shouldReturnPatientWhenUserServiceFindsIt() {

        PatientUserDto patient = new PatientUserDto();
        patient.setUserId("P1");
        patient.setName("Patient One");
        patient.setRole("PATIENT");

        when(userServiceClient.getPatientById("P1")).thenReturn(patient);

        PatientUserDto result = service.validatePatientExists("P1");

        assertSame(patient, result);
    }

    @Test
    void shouldThrowBadRequestWhenPatientIdIsBlank() {

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.validatePatientExists(" ")
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void shouldThrowNotFoundWhenUserServiceReturns404() {

        when(userServiceClient.getPatientById("P1")).thenThrow(feignNotFound());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.validatePatientExists("P1")
        );

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    private FeignException.NotFound feignNotFound() {
        Request request = Request.create(
                Request.HttpMethod.GET,
                "/EverCare/internal/users/patients/P1",
                Collections.emptyMap(),
                null,
                StandardCharsets.UTF_8,
                new RequestTemplate()
        );

        Response response = Response.builder()
                .status(404)
                .reason("Not Found")
                .request(request)
                .build();

        return (FeignException.NotFound) FeignException.errorStatus("getPatientById", response);
    }
}
