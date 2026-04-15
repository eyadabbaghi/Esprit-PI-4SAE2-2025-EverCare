package tn.esprit.activities.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tn.esprit.activities.dto.ActivityDTO;
import tn.esprit.activities.dto.UserActivityDTO;
import tn.esprit.activities.service.ActivityService;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserActivityControllerTest {

    @Mock
    private ActivityService activityService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new UserActivityController(activityService)).build();
    }

    @Test
    void rateActivityReturnsUpdatedActivity() throws Exception {
        ActivityDTO response = new ActivityDTO();
        response.setId("activity-1");
        response.setRating(4.5);

        when(activityService.rateActivity("user-1", "activity-1", 5)).thenReturn(response);

        mockMvc.perform(post("/activities/user/user-1/activity/activity-1/rate")
                        .param("rating", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("activity-1"))
                .andExpect(jsonPath("$.rating").value(4.5));
    }

    @Test
    void getPublicActivitiesReturnsOk() throws Exception {
        ActivityDTO response = new ActivityDTO();
        response.setId("activity-1");
        response.setName("Yoga");

        when(activityService.getAllActivities()).thenReturn(List.of(response));

        mockMvc.perform(get("/activities/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("activity-1"))
                .andExpect(jsonPath("$[0].name").value("Yoga"));
    }
}
