package tn.esprit.activities.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import tn.esprit.activities.dto.ActivityDTO;
import tn.esprit.activities.dto.CreateActivityRequest;
import tn.esprit.activities.service.ActivityService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminActivityControllerTest {

    @Mock
    private ActivityService activityService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(new AdminActivityController(activityService))
                .setValidator(validator)
                .build();
    }

    @Test
    void createActivityReturnsCreated() throws Exception {
        CreateActivityRequest request = new CreateActivityRequest();
        request.setName("Yoga");
        request.setType("Relaxation");
        request.setDuration(30);
        request.setDescription("Gentle movement");

        ActivityDTO response = new ActivityDTO();
        response.setId("activity-1");
        response.setName("Yoga");

        when(activityService.createActivity(any(CreateActivityRequest.class))).thenReturn(response);

        mockMvc.perform(post("/admin/activities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("activity-1"))
                .andExpect(jsonPath("$.name").value("Yoga"));
    }

    @Test
    void deleteActivityReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/admin/activities/activity-1"))
                .andExpect(status().isNoContent());

        verify(activityService).deleteActivity("activity-1");
    }
}
