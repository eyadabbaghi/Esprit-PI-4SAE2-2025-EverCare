package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FaceService {

    @Value("${face.service.url:http://localhost:8085}")
    private String faceServiceUrl;

    private final RestTemplate restTemplate;

    public boolean registerFace(String keycloakId, List<String> images) {
        String url = faceServiceUrl + "/face/register";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "keycloak_id", keycloakId,
                "images", images
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        return response.getStatusCode() == HttpStatus.OK;
    }

    public Map verifyFace(String keycloakId, String base64Image) {
        String url = faceServiceUrl + "/face/verify";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "keycloak_id", keycloakId,
                "image", base64Image
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        return response.getBody();
    }

    public boolean hasFaceRegistered(String keycloakId) {
        String url = faceServiceUrl + "/face/has-face/" + keycloakId;
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        return Boolean.TRUE.equals(response.getBody().get("hasFace"));
    }
}