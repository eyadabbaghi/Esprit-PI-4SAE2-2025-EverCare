package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
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

    @Value("${keycloak.frontend-client-id:frontend-app}")
    private String frontendClientId;

    private final RestTemplate restTemplate;

    public String getTokenForUser(String keycloakUserId) {
        String tokenUrl = authServerUrl + "/realms/" + realm
                + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String serviceToken = getClientAccessToken(tokenUrl, headers, faceClientId, faceClientSecret);
        if (serviceToken == null) {
            throw new RuntimeException("Failed to get face service token");
        }
        MultiValueMap<String, String> exchange = new LinkedMultiValueMap<>();
        exchange.add("grant_type", "urn:ietf:params:oauth:grant-type:token-exchange");
        exchange.add("client_id", faceClientId);
        exchange.add("client_secret", faceClientSecret);
        exchange.add("subject_token", serviceToken);
        exchange.add("subject_token_type", "urn:ietf:params:oauth:token-type:access_token");
        exchange.add("requested_token_type", "urn:ietf:params:oauth:token-type:access_token");
        exchange.add("requested_subject", keycloakUserId);
        exchange.add("audience", frontendClientId);

        try {
            ResponseEntity<Map> exchangeResponse = restTemplate.postForEntity(
                    tokenUrl, new HttpEntity<>(exchange, headers), Map.class);

            String token = exchangeResponse.getBody() != null
                    ? (String) exchangeResponse.getBody().get("access_token")
                    : null;
            if (token != null) {
                return token;
            }
        } catch (HttpClientErrorException e) {
            throw new RuntimeException("Token exchange failed: " + e.getResponseBodyAsString(), e);
        }

        throw new RuntimeException("Token exchange failed: no access token returned");
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

    private String getClientAccessToken(
            String tokenUrl,
            HttpHeaders headers,
            String requesterClientId,
            String requesterClientSecret
    ) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", requesterClientId);
        body.add("client_secret", requesterClientSecret);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                tokenUrl,
                new HttpEntity<>(body, headers),
                Map.class
        );

        return response.getBody() != null ? (String) response.getBody().get("access_token") : null;
    }
}