package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
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
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (RestClientException ex) {
            return false;
        }
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
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return response.getBody();
        } catch (RestClientException ex) {
            return Map.of("matched", false, "score", 0.0);
        }
    }

    public boolean hasFaceRegistered(String keycloakId) {
        String url = faceServiceUrl + "/face/has-face/" + keycloakId;
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map body = response.getBody();
            return body != null && Boolean.TRUE.equals(body.get("hasFace"));
        } catch (RestClientException ex) {
            return false;
        }
    }
}
