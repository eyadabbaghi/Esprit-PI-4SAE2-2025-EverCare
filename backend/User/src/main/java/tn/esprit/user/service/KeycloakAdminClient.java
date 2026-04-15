package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import tn.esprit.user.dto.ChangePasswordRequest;
import tn.esprit.user.dto.RegisterRequest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class KeycloakAdminClient {

    @Value("${keycloak.auth-server-url}")
    private String authServerUrl;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${keycloak.admin-client-id}")
    private String adminClientId;

    @Value("${keycloak.admin-client-secret}")
    private String adminClientSecret;

    @Value("${keycloak.admin-fallback-enabled:true}")
    private boolean adminFallbackEnabled;

    @Value("${keycloak.admin-fallback-realm:master}")
    private String adminFallbackRealm;

    @Value("${keycloak.admin-fallback-client-id:admin-cli}")
    private String adminFallbackClientId;

    @Value("${keycloak.admin-fallback-username:${KEYCLOAK_ADMIN:admin}}")
    private String adminFallbackUsername;

    @Value("${keycloak.admin-fallback-password:${KEYCLOAK_ADMIN_PASSWORD:admin}}")
    private String adminFallbackPassword;

    private final RestTemplate restTemplate;

    public Optional<String> findUserIdByEmail(String email) {
        String url = UriComponentsBuilder
                .fromHttpUrl(authServerUrl)
                .path("/admin/realms/{realm}/users")
                .queryParam("email", email)
                .queryParam("exact", true)
                .buildAndExpand(realm)
                .toUriString();

        ResponseEntity<List> response = exchangeWithAdminFallback(
                url,
                HttpMethod.GET,
                null,
                null,
                List.class
        );

        if (response.getBody() == null || response.getBody().isEmpty()) {
            return Optional.empty();
        }

        Object firstEntry = response.getBody().get(0);
        if (firstEntry instanceof Map<?, ?> userMap && userMap.get("id") instanceof String userId) {
            return Optional.of(userId);
        }

        return Optional.empty();
    }

    public String createUser(RegisterRequest request) {
        String url = authServerUrl + "/admin/realms/" + realm + "/users";

        Map<String, Object> userRepresentation = Map.of(
                "username", request.getEmail(),
                "email", request.getEmail(),
                "firstName", firstName(request.getName()),
                "lastName", lastName(request.getName()),
                "enabled", true,
                "emailVerified", true,
                "credentials", List.of(Map.of(
                        "type", "password",
                        "value", request.getPassword(),
                        "temporary", false
                ))
        );

        ResponseEntity<Void> response = exchangeWithAdminFallback(
                url,
                HttpMethod.POST,
                userRepresentation,
                MediaType.APPLICATION_JSON,
                Void.class
        );

        if (response.getStatusCode() != HttpStatus.CREATED || response.getHeaders().getLocation() == null) {
            throw new IllegalStateException("Failed to create user in Keycloak");
        }

        String location = response.getHeaders().getLocation().toString();
        return location.substring(location.lastIndexOf('/') + 1);
    }

    public void resetPassword(String userId, String newPassword) {
        String url = authServerUrl + "/admin/realms/" + realm + "/users/" + userId + "/reset-password";

        Map<String, Object> credential = Map.of(
                "type", "password",
                "value", newPassword,
                "temporary", false
        );

        exchangeWithAdminFallback(
                url,
                HttpMethod.PUT,
                credential,
                MediaType.APPLICATION_JSON,
                Void.class
        );
    }

    public void changePassword(String userId, ChangePasswordRequest request) {
        resetPassword(userId, request.getNewPassword());
    }

    public void deleteUser(String userId) {
        String url = authServerUrl + "/admin/realms/" + realm + "/users/" + userId;

        exchangeWithAdminFallback(
                url,
                HttpMethod.DELETE,
                null,
                null,
                Void.class
        );
    }

    private String getAdminAccessToken() {
        try {
            return getServiceAccountAccessToken();
        } catch (HttpClientErrorException | IllegalStateException exception) {
            if (!canUseAdminFallback()) {
                throw exception;
            }
            return getFallbackAdminAccessToken();
        }
    }

    private String getServiceAccountAccessToken() {
        String tokenUrl = authServerUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", adminClientId);
        body.add("client_secret", adminClientSecret);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                tokenUrl,
                new HttpEntity<>(body, headers),
                Map.class
        );

        if (response.getBody() == null || response.getBody().get("access_token") == null) {
            throw new IllegalStateException("Failed to obtain Keycloak admin access token");
        }

        return (String) response.getBody().get("access_token");
    }

    private String getFallbackAdminAccessToken() {
        String tokenUrl = authServerUrl + "/realms/" + adminFallbackRealm + "/protocol/openid-connect/token";

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", adminFallbackClientId);
        body.add("username", adminFallbackUsername);
        body.add("password", adminFallbackPassword);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                tokenUrl,
                new HttpEntity<>(body, headers),
                Map.class
        );

        if (response.getBody() == null || response.getBody().get("access_token") == null) {
            throw new IllegalStateException("Failed to obtain fallback Keycloak admin access token");
        }

        return (String) response.getBody().get("access_token");
    }

    private boolean canUseAdminFallback() {
        return adminFallbackEnabled
                && !isBlank(adminFallbackRealm)
                && !isBlank(adminFallbackClientId)
                && !isBlank(adminFallbackUsername)
                && !isBlank(adminFallbackPassword);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private <T> ResponseEntity<T> exchangeWithAdminFallback(
            String url,
            HttpMethod method,
            Object body,
            MediaType mediaType,
            Class<T> responseType
    ) {
        String accessToken = getAdminAccessToken();

        try {
            return restTemplate.exchange(
                    url,
                    method,
                    new HttpEntity<>(body, adminHeaders(accessToken, mediaType)),
                    responseType
            );
        } catch (HttpClientErrorException.Forbidden exception) {
            if (!canUseAdminFallback()) {
                throw exception;
            }

            String fallbackToken = getFallbackAdminAccessToken();
            return restTemplate.exchange(
                    url,
                    method,
                    new HttpEntity<>(body, adminHeaders(fallbackToken, mediaType)),
                    responseType
            );
        }
    }

    private HttpHeaders adminHeaders(String accessToken) {
        return adminHeaders(accessToken, null);
    }

    private HttpHeaders adminHeaders(String accessToken, MediaType mediaType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        if (mediaType != null) {
            headers.setContentType(mediaType);
        }
        return headers;
    }

    private String firstName(String fullName) {
        String trimmed = fullName == null ? "" : fullName.trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        return trimmed.split("\\s+", 2)[0];
    }

    private String lastName(String fullName) {
        String trimmed = fullName == null ? "" : fullName.trim();
        if (trimmed.isEmpty() || !trimmed.contains(" ")) {
            return "";
        }
        return trimmed.split("\\s+", 2)[1];
    }
}
