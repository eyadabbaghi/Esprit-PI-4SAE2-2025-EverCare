package tn.esprit.user.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import tn.esprit.user.dto.ChangePasswordRequest;
import tn.esprit.user.dto.RegisterRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;

/**
 * Client for Keycloak Admin REST API operations.
 * 
 * CHANGED: Fixed 401 error on registration by using master realm admin credentials
 * instead of service account client credentials which were not properly configured.
 * 
 * Before: Used client_credentials grant type with realm-specific client
 * After: Uses password grant type with master realm admin user
 * 
 * Configuration: keycloak.admin-user and keycloak.admin-password in application.properties
 */
@Service
public class KeycloakAdminClient {

    @Value("${keycloak.auth-server-url}")
    private String authServerUrl;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${keycloak.frontend-client-id:frontend-app}")
    private String frontendClientId;

    @Value("${keycloak.frontend-client-secret}")
    private String frontendClientSecret;

    // CHANGED: Added configurable admin credentials for master realm authentication
    @Value("${keycloak.admin-user:admin}")
    private String adminUser;

    @Value("${keycloak.admin-password:admin}")
    private String adminPassword;

    private final RestTemplate restTemplate;

    public KeycloakAdminClient() {
        this.restTemplate = new RestTemplate();
        restTemplate.setInterceptors(Collections.singletonList(new ClientHttpRequestInterceptor() {
            @Override
            public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
                System.out.println("=== HTTP Request ===");
                System.out.println("Method: " + request.getMethod());
                System.out.println("URI: " + request.getURI());
                if (body.length > 0) {
                    System.out.println("Body: " + new String(body, StandardCharsets.UTF_8));
                }
                ClientHttpResponse response = execution.execute(request, body);
                System.out.println("Response status: " + response.getStatusCode());
                return response;
            }
        }));
    }

    // CHANGED: Now uses master realm admin token instead of realm-specific service account
    private String getAdminAccessToken() {
        // Changed from /realms/{realm}/... to /realms/master/...
        String tokenUrl = authServerUrl + "/realms/master/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        // CHANGED: From client_credentials to password grant type
        body.add("grant_type", "password");
        body.add("client_id", "admin-cli");
        body.add("username", adminUser);
        body.add("password", adminPassword);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, request, Map.class);
        return (String) response.getBody().get("access_token");
    }

    public String createUser(RegisterRequest request) {
        String token = getAdminAccessToken();
        String url = authServerUrl + "/admin/realms/" + realm + "/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> userRep = Map.of(
                "username", request.getEmail(),
                "email", request.getEmail(),
                "firstName", request.getName().split(" ")[0],
                "lastName", request.getName().contains(" ") ? request.getName().substring(request.getName().indexOf(" ") + 1) : "",
                "enabled", true,
                "emailVerified", true,
                "credentials", new Object[]{
                        Map.of(
                                "type", "password",
                                "value", request.getPassword(),
                                "temporary", false
                        )
                }
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(userRep, headers);
        ResponseEntity<Void> response = restTemplate.postForEntity(url, entity, Void.class);

        if (response.getStatusCode() == HttpStatus.CREATED) {
            String location = response.getHeaders().getLocation().toString();
            return location.substring(location.lastIndexOf('/') + 1);
        }
        throw new RuntimeException("Failed to create user in Keycloak");
    }

    public void changePassword(String userId, ChangePasswordRequest request) {
        String token = getAdminAccessToken();
        String url = authServerUrl + "/admin/realms/" + realm + "/users/" + userId + "/reset-password";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> credential = Map.of(
                "type", "password",
                "value", request.getNewPassword(),
                "temporary", false
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(credential, headers);
        restTemplate.put(url, entity);
    }

    public boolean verifyUserPassword(String email, String currentPassword) {
        String tokenUrl = authServerUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", frontendClientId);
        body.add("client_secret", frontendClientSecret);
        body.add("username", email);
        body.add("password", currentPassword);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    tokenUrl,
                    new HttpEntity<>(body, headers),
                    Map.class
            );
            return response.getStatusCode().is2xxSuccessful()
                    && response.getBody() != null
                    && response.getBody().get("access_token") != null;
        } catch (Exception exception) {
            return false;
        }
    }

    public void deleteUser(String userId) {
        String token = getAdminAccessToken();
        String url = authServerUrl + "/admin/realms/" + realm + "/users/" + userId;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        restTemplate.exchange(url, HttpMethod.DELETE, entity, Void.class);
    }
}
