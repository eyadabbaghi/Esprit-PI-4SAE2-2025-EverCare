package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import tn.esprit.user.entity.User;
import tn.esprit.user.repository.UserRepository;

import java.util.Map;
import java.util.Optional;

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

    @Value("${keycloak.frontend-client-secret:}")
    private String frontendClientSecret;

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final KeycloakAdminClient keycloakAdminClient;

    public Map<String, Object> loginFrontendUser(String username, String password) {
        String normalizedUsername = normalizeUsername(username);
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", frontendClientId);
        body.add("username", normalizedUsername);
        body.add("password", password);

        try {
            return requestFrontendToken(body);
        } catch (RuntimeException error) {
            if (!isInvalidGrant(error)) {
                throw error;
            }

            Optional<User> user = userRepository.findByEmailIgnoreCase(normalizedUsername);
            String keycloakId = user.map(User::getKeycloakId).orElse(null);
            if (keycloakId == null || keycloakId.isBlank()) {
                throw error;
            }

            String keycloakUsername = keycloakAdminClient.getLoginUsername(keycloakId);
            if (keycloakUsername == null || keycloakUsername.isBlank()
                    || keycloakUsername.equalsIgnoreCase(normalizedUsername)) {
                throw error;
            }

            MultiValueMap<String, String> retryBody = new LinkedMultiValueMap<>();
            retryBody.add("grant_type", "password");
            retryBody.add("client_id", frontendClientId);
            retryBody.add("username", keycloakUsername);
            retryBody.add("password", password);
            return requestFrontendToken(retryBody);
        }
    }

    public Map<String, Object> refreshFrontendUserToken(String refreshToken) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "refresh_token");
        body.add("client_id", frontendClientId);
        body.add("refresh_token", refreshToken);

        return requestFrontendToken(body);
    }

    public String getTokenForUser(String keycloakUserId) {
        String tokenUrl = tokenUrl();
        HttpHeaders headers = formHeaders();

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
        String tokenUrl = tokenUrl();
        HttpHeaders headers = formHeaders();

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, request, Map.class);
        return (String) response.getBody().get("access_token");
    }

    private Map<String, Object> requestToken(
            String tokenUrl,
            HttpHeaders headers,
            MultiValueMap<String, String> body
    ) {
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    tokenUrl,
                    new HttpEntity<>(body, headers),
                    Map.class
            );
            if (response.getBody() == null) {
                throw new RuntimeException("Keycloak returned an empty token response");
            }
            return response.getBody();
        } catch (HttpClientErrorException e) {
            throw new RuntimeException(readableKeycloakError(e), e);
        }
    }

    private Map<String, Object> requestFrontendToken(MultiValueMap<String, String> body) {
        if (frontendClientSecret != null && !frontendClientSecret.isBlank()) {
            try {
                return requestTokenWithOptionalSecret(body, frontendClientSecret);
            } catch (RuntimeException e) {
                if (!isInvalidClient(e)) {
                    throw e;
                }
            }
        }

        return requestTokenWithOptionalSecret(body, null);
    }

    private Map<String, Object> requestTokenWithOptionalSecret(MultiValueMap<String, String> body, String secret) {
        MultiValueMap<String, String> requestBody = new LinkedMultiValueMap<>();
        requestBody.addAll(body);
        addClientSecret(requestBody, secret);
        return requestToken(tokenUrl(), formHeaders(), requestBody);
    }

    private String tokenUrl() {
        return authServerUrl + "/realms/" + realm + "/protocol/openid-connect/token";
    }

    private HttpHeaders formHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        return headers;
    }

    private void addClientSecret(MultiValueMap<String, String> body, String secret) {
        if (secret != null && !secret.isBlank()) {
            body.add("client_secret", secret);
        }
    }

    private String normalizeUsername(String username) {
        return username == null ? "" : username.trim().toLowerCase();
    }

    private boolean isInvalidClient(RuntimeException e) {
        Throwable cause = e.getCause();
        if (cause instanceof HttpClientErrorException clientError) {
            String body = clientError.getResponseBodyAsString();
            return body != null && body.contains("invalid_client");
        }
        return false;
    }

    private boolean isInvalidGrant(RuntimeException e) {
        Throwable cause = e.getCause();
        if (cause instanceof HttpClientErrorException clientError) {
            String body = clientError.getResponseBodyAsString();
            return body != null && body.contains("invalid_grant");
        }
        return false;
    }

    private String readableKeycloakError(HttpClientErrorException e) {
        String body = e.getResponseBodyAsString();
        if (body != null) {
            if (body.contains("invalid_grant")) {
                return "Invalid email or password.";
            }
            if (body.contains("invalid_client")) {
                return "Login client is not configured correctly. Check the Keycloak frontend client secret.";
            }
        }
        return "Login failed. Please try again.";
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
