package com.example.cognitivestimulationservice.service;

import com.example.cognitivestimulationservice.dto.MedicalRecordClientResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicalRecordClientService {

    private final RestTemplate restTemplate;

    @Value("${app.medical-record-service.base-url}")
    private String medicalRecordServiceBaseUrl;

    public MedicalRecordClientResponse getMedicalRecord(UUID medicalRecordId) {
        String url = medicalRecordServiceBaseUrl + "/api/medical-records/" + medicalRecordId;
        try {
            MedicalRecordClientResponse response = restTemplate.getForObject(url, MedicalRecordClientResponse.class);
            if (response == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Medical record not found");
            }
            return response;
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Medical record not found");
        } catch (HttpClientErrorException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Medical record service returned an error");
        } catch (ResourceAccessException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Medical record service is unavailable");
        }
    }
}
