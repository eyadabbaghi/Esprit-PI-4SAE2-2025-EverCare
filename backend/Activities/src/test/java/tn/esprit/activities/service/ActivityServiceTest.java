package tn.esprit.activities.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.activities.client.NotificationClient;
import tn.esprit.activities.client.UserServiceClient;
import tn.esprit.activities.dto.ActivityDTO;
import tn.esprit.activities.dto.CreateActivityRequest;
import tn.esprit.activities.dto.NotificationRequest;
import tn.esprit.activities.dto.UpdateActivityRequest;
import tn.esprit.activities.dto.UserActivityDTO;
import tn.esprit.activities.entity.Activity;
import tn.esprit.activities.entity.UserActivity;
import tn.esprit.activities.repository.ActivityDetailsRepository;
import tn.esprit.activities.repository.ActivityRecommendationRepository;
import tn.esprit.activities.repository.ActivityRepository;
import tn.esprit.activities.repository.UserActivityRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    @Mock
    private ActivityRepository activityRepository;

    @Mock
    private ActivityDetailsRepository detailsRepository;

    @Mock
    private UserActivityRepository userActivityRepository;

    @Mock
    private ActivityRecommendationRepository recommendationRepository;

    @Mock
    private UserServiceClient userServiceClient;

    @Mock
    private NotificationClient notificationClient;

    @InjectMocks
    private ActivityService activityService;

    @Test
    void createActivityInitializesDefaultsAndSendsNotification() {
        CreateActivityRequest request = new CreateActivityRequest();
        request.setName("Yoga");
        request.setType("Relaxation");
        request.setDuration(30);
        request.setDescription("Gentle movement");
        request.setDoctorSuggested(true);

        when(activityRepository.save(any(Activity.class))).thenAnswer(invocation -> {
            Activity activity = invocation.getArgument(0);
            activity.setId("activity-1");
            return activity;
        });

        ActivityDTO response = activityService.createActivity(request);

        assertEquals("activity-1", response.getId());
        assertEquals(0.0, response.getRating());
        assertEquals(0, response.getTotalRatings());

        ArgumentCaptor<NotificationRequest> captor = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notificationClient).sendNotification(captor.capture());
        assertEquals("CREATED", captor.getValue().getAction());
        assertEquals("activity-1", captor.getValue().getActivityId());
    }

    @Test
    void markCompletedCreatesUserActivityWhenMissing() {
        Activity activity = Activity.builder().id("activity-1").name("Yoga").build();

        when(activityRepository.findById("activity-1")).thenReturn(Optional.of(activity));
        when(userActivityRepository.findByUserIdAndActivityId("user-1", "activity-1")).thenReturn(Optional.empty());
        when(userActivityRepository.save(any(UserActivity.class))).thenAnswer(invocation -> {
            UserActivity saved = invocation.getArgument(0);
            saved.setId("ua-1");
            return saved;
        });

        UserActivityDTO response = activityService.markCompleted("user-1", "activity-1");

        assertEquals("ua-1", response.getId());
        assertTrue(response.isCompleted());
        assertNotNull(response.getCompletedAt());
    }

    @Test
    void rateActivityRejectsOutOfRangeValue() {
        assertThrows(IllegalArgumentException.class, () -> activityService.rateActivity("user-1", "activity-1", 0));
        assertThrows(IllegalArgumentException.class, () -> activityService.rateActivity("user-1", "activity-1", 6));
    }

    @Test
    void updateActivityPersistsChangedFields() {
        Activity existing = Activity.builder()
                .id("activity-1")
                .name("Yoga")
                .type("Relaxation")
                .duration(30)
                .description("Old")
                .build();

        UpdateActivityRequest request = new UpdateActivityRequest();
        request.setName("Breathing");
        request.setDescription("Updated");
        request.setDoctorSuggested(true);

        when(activityRepository.findById("activity-1")).thenReturn(Optional.of(existing));
        when(activityRepository.save(any(Activity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ActivityDTO response = activityService.updateActivity("activity-1", request);

        assertEquals("Breathing", response.getName());
        assertEquals("Updated", response.getDescription());
        assertTrue(response.isDoctorSuggested());
        verify(notificationClient).sendNotification(any(NotificationRequest.class));
    }
}
