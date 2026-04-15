package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

    @Value("${keycloak.frontend-client-id}")
    private String frontendClientId;

    @Value("${keycloak.frontend-client-secret}")
    private String frontendClientSecret;

    @Value("${keycloak.face-client-id}")
    private String faceClientId;

    @Value("${keycloak.face-client-secret}")
    private String faceClientSecret;

    private final RestTemplate restTemplate;

    public String getTokenForCredentials(String email, String password) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", frontendClientId);
        body.add("client_secret", frontendClientSecret);
        body.add("username", email);
        body.add("password", password);
        body.add("scope", "openid profile email");

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    tokenUrl(),
                    formRequest(body),
                    Map.class
            );

            String token = response.getBody() != null
                    ? (String) response.getBody().get("access_token")
                    : null;

            if (token == null || token.isBlank()) {
                throw new IllegalStateException("Keycloak did not return an access token");
            }

            return token;
        } catch (HttpClientErrorException exception) {
            String responseBody = exception.getResponseBodyAsString();
            if (responseBody.contains("\"error\":\"invalid_grant\"")) {
                throw new IllegalArgumentException("Invalid email or password", exception);
            }
            if (responseBody.contains("\"error\":\"invalid_client\"")
                    || responseBody.contains("\"error\":\"unauthorized_client\"")) {
                throw new IllegalStateException("Login client is misconfigured in Keycloak", exception);
            }
            throw new IllegalStateException("Keycloak authentication failed", exception);
        }
    }

    public String getTokenForUser(String keycloakUserId) {
        String serviceToken = getClientAccessToken(faceClientId, faceClientSecret);
        if (serviceToken == null || serviceToken.isBlank()) {
            throw new IllegalStateException("Failed to get face service token");
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
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    tokenUrl(),
                    formRequest(exchange),
                    Map.class
            );

            String token = response.getBody() != null
                    ? (String) response.getBody().get("access_token")
                    : null;

            if (token == null || token.isBlank()) {
                throw new IllegalStateException("Token exchange failed: no access token returned");
            }

            return token;
        } catch (HttpClientErrorException exception) {
            throw new IllegalStateException(
                    "Token exchange failed: " + exception.getResponseBodyAsString(),
                    exception
            );
        }
    }

    private String getClientAccessToken(String clientId, String clientSecret) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                tokenUrl(),
                formRequest(body),
                Map.class
        );

        return response.getBody() != null
                ? (String) response.getBody().get("access_token")
                : null;
    }

    private HttpEntity<MultiValueMap<String, String>> formRequest(MultiValueMap<String, String> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        return new HttpEntity<>(body, headers);
    }

    private String tokenUrl() {
        return authServerUrl + "/realms/" + realm + "/protocol/openid-connect/token";
    }
}
