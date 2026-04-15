package tn.esprit.alerts.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import tn.esprit.alerts.client.NotificationClient;
import tn.esprit.alerts.dto.AlertRequest;
import tn.esprit.alerts.dto.AlertResponse;
import tn.esprit.alerts.service.AlertService;
import tn.esprit.alerts.service.SmsService;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AlertControllerTest {

    @Mock
    private AlertService alertService;

    @Mock
    private SmsService smsService;

    @Mock
    private NotificationClient notificationClient;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(
                        new AlertController(alertService, smsService, notificationClient))
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .setValidator(validator)
                .build();
    }

    @Test
    void createAlertReturnsCreatedResponse() throws Exception {
        AlertRequest request = new AlertRequest();
        request.setIncidentId("incident-1");
        request.setSenderId("sender-1");
        request.setTargetId("target-1");

        AlertResponse response = new AlertResponse();
        response.setAlertId("alert-1");
        response.setIncidentId("incident-1");
        response.setStatus("SENT");

        when(alertService.createAlert(any(AlertRequest.class))).thenReturn(response);

        mockMvc.perform(post("/alerts")
                        .accept(MediaType.APPLICATION_JSON)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.alertId").value("alert-1"))
                .andExpect(jsonPath("$.incidentId").value("incident-1"))
                .andExpect(jsonPath("$.status").value("SENT"));
    }

    @Test
    void getAlertsByIncidentReturnsOk() throws Exception {
        AlertResponse response = new AlertResponse();
        response.setAlertId("alert-1");
        response.setIncidentId("incident-1");

        when(alertService.getAlertsByIncident("incident-1")).thenReturn(List.of(response));

        mockMvc.perform(get("/alerts/by-incident/incident-1").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alertId").value("alert-1"));
    }

    @Test
    void acknowledgeAlertReturnsUpdatedAlert() throws Exception {
        AlertResponse response = new AlertResponse();
        response.setAlertId("alert-1");
        response.setStatus("ACKNOWLEDGED");

        when(alertService.acknowledgeAlert("alert-1")).thenReturn(response);

        mockMvc.perform(patch("/alerts/alert-1/acknowledge").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACKNOWLEDGED"));
    }

    @Test
    void deleteAlertReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/alerts/alert-1"))
                .andExpect(status().isNoContent());

        verify(alertService).deleteAlert("alert-1");
    }
}
