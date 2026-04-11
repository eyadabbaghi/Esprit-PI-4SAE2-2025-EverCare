package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class KeycloakTokenService {

    @Value("${keycloak.auth-server-url}")
    private String authServerUrl;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${keycloak.client-id}")
    private String clientId;

    @Value("${keycloak.client-secret}")
    private String clientSecret;

    @Value("${keycloak.face-client-id}")        // ← add this
    private String faceClientId;

    @Value("${keycloak.face-client-secret}")    // ← add this
    private String faceClientSecret;

    private final RestTemplate restTemplate;

    public String getTokenForUser(String keycloakUserId) {
        String tokenUrl = authServerUrl + "/realms/" + realm
                + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        // Step 1 — get face-login-service client token
        MultiValueMap<String, String> step1 = new LinkedMultiValueMap<>();
        step1.add("grant_type", "client_credentials");
        step1.add("client_id", faceClientId);
        step1.add("client_secret", faceClientSecret);

        ResponseEntity<Map> step1Response = restTemplate.postForEntity(
                tokenUrl, new HttpEntity<>(step1, headers), Map.class);

        String serviceToken = (String) step1Response.getBody().get("access_token");
        if (serviceToken == null) {
            throw new RuntimeException("Failed to get face service token");
        }
        System.out.println("✅ Step 1 passed — got service token");

        // Step 2 — try LEGACY token exchange (Keycloak < 26)
        // Uses "urn:ietf:params:oauth:grant-type:token-exchange" with legacy params
        MultiValueMap<String, String> legacyExchange = new LinkedMultiValueMap<>();
        legacyExchange.add("grant_type", "urn:ietf:params:oauth:grant-type:token-exchange");
        legacyExchange.add("client_id", faceClientId);
        legacyExchange.add("client_secret", faceClientSecret);
        legacyExchange.add("subject_token", serviceToken);
        legacyExchange.add("subject_token_type", "urn:ietf:params:oauth:token-type:access_token");
        legacyExchange.add("requested_token_type", "urn:ietf:params:oauth:token-type:access_token");
        legacyExchange.add("audience", "frontend-app");
        // NOTE: No "requested_subject" — legacy exchange uses audience only
        // The resulting token will be for the service account but scoped to frontend-app

        try {
            ResponseEntity<Map> legacyResponse = restTemplate.postForEntity(
                    tokenUrl, new HttpEntity<>(legacyExchange, headers), Map.class);

            String token = (String) legacyResponse.getBody().get("access_token");
            if (token != null) {
                System.out.println("✅ Legacy token exchange succeeded");
                return token;
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            System.err.println("❌ Legacy exchange failed: " + e.getResponseBodyAsString());
        }

        throw new RuntimeException("All token exchange attempts failed");
    }

    public String getAdminAccessToken() {
        String tokenUrl = authServerUrl + "/realms/" + realm
                + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, request, Map.class);
        return (String) response.getBody().get("access_token");
    }
}