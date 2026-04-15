package tn.esprit.user.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import tn.esprit.user.dto.RegisterRequest;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KeycloakAdminClientTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private KeycloakAdminClient keycloakAdminClient;

    @Test
    void createUserFallsBackToBootstrapAdminWhenServiceAccountLacksAdminRoles() {
        ReflectionTestUtils.setField(keycloakAdminClient, "authServerUrl", "http://localhost:8180");
        ReflectionTestUtils.setField(keycloakAdminClient, "realm", "EverCareRealm");
        ReflectionTestUtils.setField(keycloakAdminClient, "adminClientId", "evercare-backend");
        ReflectionTestUtils.setField(keycloakAdminClient, "adminClientSecret", "**********");
        ReflectionTestUtils.setField(keycloakAdminClient, "adminFallbackEnabled", true);
        ReflectionTestUtils.setField(keycloakAdminClient, "adminFallbackRealm", "master");
        ReflectionTestUtils.setField(keycloakAdminClient, "adminFallbackClientId", "admin-cli");
        ReflectionTestUtils.setField(keycloakAdminClient, "adminFallbackUsername", "admin");
        ReflectionTestUtils.setField(keycloakAdminClient, "adminFallbackPassword", "admin");

        RegisterRequest request = new RegisterRequest();
        request.setName("Jane Doe");
        request.setEmail("jane@example.com");
        request.setPassword("StrongPass1!");

        when(restTemplate.postForEntity(
                eq("http://localhost:8180/realms/EverCareRealm/protocol/openid-connect/token"),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(ResponseEntity.ok(Map.of("access_token", "service-token")));

        when(restTemplate.postForEntity(
                eq("http://localhost:8180/realms/master/protocol/openid-connect/token"),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(ResponseEntity.ok(Map.of("access_token", "fallback-token")));

        when(restTemplate.exchange(
                eq("http://localhost:8180/admin/realms/EverCareRealm/users"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class)
        ))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.FORBIDDEN,
                        "Forbidden",
                        HttpHeaders.EMPTY,
                        "{}".getBytes(StandardCharsets.UTF_8),
                        StandardCharsets.UTF_8
                ))
                .thenReturn(ResponseEntity.created(URI.create("http://localhost:8180/admin/realms/EverCareRealm/users/kc-1")).build());

        String keycloakId = keycloakAdminClient.createUser(request);

        assertEquals("kc-1", keycloakId);

        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, times(2)).exchange(
                eq("http://localhost:8180/admin/realms/EverCareRealm/users"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(Void.class)
        );

        assertEquals("Bearer service-token", entityCaptor.getAllValues().get(0).getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
        assertEquals("Bearer fallback-token", entityCaptor.getAllValues().get(1).getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
    }
}
