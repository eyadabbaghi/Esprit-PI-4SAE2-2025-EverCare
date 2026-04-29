package tn.esprit.activities.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.activities.client.NotificationClient;
import tn.esprit.activities.client.UserServiceClient;
import tn.esprit.activities.dto.*;
import tn.esprit.activities.entity.Activity;
import tn.esprit.activities.entity.ActivityDetails;
import tn.esprit.activities.entity.ActivityRecommendation;
import tn.esprit.activities.entity.UserActivity;
import tn.esprit.activities.exception.ResourceNotFoundException;
import tn.esprit.activities.repository.ActivityDetailsRepository;
import tn.esprit.activities.repository.ActivityRecommendationRepository;
import tn.esprit.activities.repository.ActivityRepository;
import tn.esprit.activities.repository.UserActivityRepository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityDetailsRepository detailsRepository;
    private final UserActivityRepository userActivityRepository;
    private final ActivityRecommendationRepository recommendationRepository;
    private final UserServiceClient userServiceClient;
    private final NotificationClient notificationClient;

    // ---------- Admin: Activity CRUD ----------

    public List<ActivityDTO> getAllActivities() {
        return activityRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public ActivityDTO getActivityById(String id) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activity not found"));
        return mapToDTO(activity);
    }

    @Transactional
    public ActivityDTO createActivity(CreateActivityRequest request) {
        Activity activity = Activity.builder()
                .name(request.getName())
                .type(request.getType())
                .duration(request.getDuration())
                .scheduledTime(request.getScheduledTime())
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .rating(0.0)
                .totalRatings(0)
                .doctorSuggested(request.isDoctorSuggested())
                .location(request.getLocation())
                .startTime(request.getStartTime())
                .monitoredBy(request.getMonitoredBy())
                .build();
        activity = activityRepository.save(activity);

        sendNotification(activity.getId(), "CREATED", "Activity '" + activity.getName() + "' was created.");

        return mapToDTO(activity);
    }

    @Transactional
    public ActivityDTO updateActivity(String id, UpdateActivityRequest request) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activity not found"));

        if (request.getName() != null) activity.setName(request.getName());
        if (request.getType() != null) activity.setType(request.getType());
        if (request.getDuration() != null) activity.setDuration(request.getDuration());
        if (request.getScheduledTime() != null) activity.setScheduledTime(request.getScheduledTime());
        if (request.getDescription() != null) activity.setDescription(request.getDescription());
        if (request.getImageUrl() != null) activity.setImageUrl(request.getImageUrl());
        if (request.getDoctorSuggested() != null) activity.setDoctorSuggested(request.getDoctorSuggested());
        if (request.getLocation() != null) activity.setLocation(request.getLocation());
        if (request.getStartTime() != null) activity.setStartTime(request.getStartTime());
        if (request.getMonitoredBy() != null) activity.setMonitoredBy(request.getMonitoredBy());

        activity = activityRepository.save(activity);

        sendNotification(activity.getId(), "UPDATED", "Activity '" + activity.getName() + "' was updated.");

        return mapToDTO(activity);
    }

    @Transactional
    public void deleteActivity(String id) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activity not found"));
        activityRepository.delete(activity);

        sendNotification(activity.getId(), "DELETED", "Activity '" + activity.getName() + "' was deleted.");
    }

    // ---------- Admin: ActivityDetails CRUD ----------

    public List<ActivityDetailsDTO> getDetailsByActivityId(String activityId) {
        return detailsRepository.findByActivityId(activityId).stream()
                .map(this::mapToDetailsDTO)
                .collect(Collectors.toList());
    }

    public ActivityDetailsDTO getDetailsById(String id) {
        ActivityDetails details = detailsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ActivityDetails not found"));
        return mapToDetailsDTO(details);
    }

    @Transactional
    public ActivityDetailsDTO createDetails(CreateActivityDetailsRequest request) {
        Activity activity = activityRepository.findById(request.getActivityId())
                .orElseThrow(() -> new RuntimeException("Activity not found"));

        ActivityDetails details = ActivityDetails.builder()
                .activity(activity)
                .instructions(request.getInstructions() != null ? request.getInstructions() : List.of())
                .difficulty(request.getDifficulty())
                .recommendedStage(request.getRecommendedStage() != null ? request.getRecommendedStage() : List.of())
                .frequency(request.getFrequency())
                .supervision(request.getSupervision())
                .benefits(request.getBenefits() != null ? request.getBenefits() : List.of())
                .precautions(request.getPrecautions() != null ? request.getPrecautions() : List.of())
                .build();
        details = detailsRepository.save(details);
        return mapToDetailsDTO(details);
    }

    @Transactional
    public ActivityDetailsDTO updateDetails(String id, UpdateActivityDetailsRequest request) {
        ActivityDetails details = detailsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ActivityDetails not found"));

        if (request.getInstructions() != null) details.setInstructions(request.getInstructions());
        if (request.getDifficulty() != null) details.setDifficulty(request.getDifficulty());
        if (request.getRecommendedStage() != null) details.setRecommendedStage(request.getRecommendedStage());
        if (request.getFrequency() != null) details.setFrequency(request.getFrequency());
        if (request.getSupervision() != null) details.setSupervision(request.getSupervision());
        if (request.getBenefits() != null) details.setBenefits(request.getBenefits());
        if (request.getPrecautions() != null) details.setPrecautions(request.getPrecautions());

        details = detailsRepository.save(details);
        return mapToDetailsDTO(details);
    }

    @Transactional
    public void deleteDetails(String id) {
        ActivityDetails details = detailsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ActivityDetails not found"));
        detailsRepository.delete(details);
    }

    // ---------- Front-office: user interactions ----------

    public List<ActivityWithUserDataDTO> getActivitiesForUser(String userId) {
        List<Activity> activities = activityRepository.findAll();
        List<UserActivity> userActivities = userActivityRepository.findByUserId(userId);
        List<ActivityRecommendation> recommendations = recommendationRepository.findByPatientId(userId);
        Set<String> recommendedIds = recommendations.stream()
                .map(rec -> rec.getActivity().getId()).collect(Collectors.toSet());
        Map<String, UserDto> doctorCache = new HashMap<>();

        return activities.stream().map(activity -> {
            ActivityWithUserDataDTO dto = mapToWithUserData(activity, userActivities);
            boolean isRecommended = recommendedIds.contains(activity.getId());
            dto.setRecommendedByDoctor(isRecommended);
            if (isRecommended) {
                ActivityRecommendation rec = recommendations.stream()
                        .filter(r -> r.getActivity().getId().equals(activity.getId()))
                        .findFirst().orElse(null);
                if (rec != null) {
                    UserDto doctor = doctorCache.computeIfAbsent(rec.getDoctorId(),
                            did -> userServiceClient.getUserById(did));
                    dto.setDoctorName(doctor.getName());
                    dto.setDoctorPicture(doctor.getProfilePicture());
                }
            }
            return dto;
        }).collect(Collectors.toList());
    }

    public ActivityWithUserDataDTO getActivityForUser(String userId, String activityId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new RuntimeException("Activity not found"));
        UserActivity userActivity = userActivityRepository.findByUserIdAndActivityId(userId, activityId)
                .orElse(null);
        return mapToWithUserData(activity, userActivity);
    }

    @Transactional
    public UserActivityDTO markCompleted(String userId, String activityId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new RuntimeException("Activity not found"));
        UserActivity userActivity = userActivityRepository.findByUserIdAndActivityId(userId, activityId)
                .orElse(UserActivity.builder()
                        .userId(userId)
                        .activity(activity)
                        .completed(false)
                        .favorite(false)
                        .build());
        userActivity.setCompleted(true);
        userActivity.setCompletedAt(LocalDateTime.now());
        userActivity = userActivityRepository.save(userActivity);
        return mapToUserActivityDTO(userActivity);
    }

    @Transactional
    public UserActivityDTO toggleFavorite(String userId, String activityId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new RuntimeException("Activity not found"));
        UserActivity userActivity = userActivityRepository.findByUserIdAndActivityId(userId, activityId)
                .orElse(UserActivity.builder()
                        .userId(userId)
                        .activity(activity)
                        .completed(false)
                        .favorite(false)
                        .build());
        userActivity.setFavorite(!userActivity.isFavorite());
        userActivity = userActivityRepository.save(userActivity);
        return mapToUserActivityDTO(userActivity);
    }

    @Transactional
    public ActivityDTO rateActivity(String userId, String activityId, int rating) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new RuntimeException("Activity not found"));
        UserActivity userActivity = userActivityRepository.findByUserIdAndActivityId(userId, activityId)
                .orElse(UserActivity.builder()
                        .userId(userId)
                        .activity(activity)
                        .completed(false)
                        .favorite(false)
                        .build());

        if (userActivity.getUserRating() != null) {
            double total = activity.getRating() * activity.getTotalRatings();
            total = total - userActivity.getUserRating() + rating;
            activity.setRating(total / activity.getTotalRatings());
        } else {
            double total = activity.getRating() * activity.getTotalRatings() + rating;
            activity.setTotalRatings(activity.getTotalRatings() + 1);
            activity.setRating(total / activity.getTotalRatings());
        }

        userActivity.setUserRating(rating);
        userActivityRepository.save(userActivity);
        activityRepository.save(activity);
        return mapToDTO(activity);
    }

    // ---------- Helper: Send notification (with error handling) ----------

    private void sendNotification(String activityId, String action, String details) {
        try {
            NotificationRequest request = new NotificationRequest();
            request.setActivityId(activityId);
            request.setAction(action);
            request.setDetails(details);
            notificationClient.sendNotification(request);
            log.info("Notification sent: {} - {}", action, activityId);
        } catch (Exception e) {
            log.error("Failed to send notification for activity {}: {}", activityId, e.getMessage());
        }
    }

    // ---------- Mapping ----------

    private ActivityDTO mapToDTO(Activity activity) {
        ActivityDTO dto = new ActivityDTO();
        dto.setId(activity.getId());
        dto.setName(activity.getName());
        dto.setType(activity.getType());
        dto.setDuration(activity.getDuration());
        dto.setScheduledTime(activity.getScheduledTime());
        dto.setDescription(activity.getDescription());
        dto.setImageUrl(activity.getImageUrl());
        dto.setRating(activity.getRating());
        dto.setTotalRatings(activity.getTotalRatings());
        dto.setDoctorSuggested(activity.isDoctorSuggested());
        dto.setLocation(activity.getLocation());
        dto.setStartTime(activity.getStartTime());
        dto.setMonitoredBy(activity.getMonitoredBy());
        return dto;
    }

    private ActivityDetailsDTO mapToDetailsDTO(ActivityDetails details) {
        ActivityDetailsDTO dto = new ActivityDetailsDTO();
        dto.setId(details.getId());
        dto.setActivityId(details.getActivity().getId());
        dto.setInstructions(details.getInstructions());
        dto.setDifficulty(details.getDifficulty());
        dto.setRecommendedStage(details.getRecommendedStage());
        dto.setFrequency(details.getFrequency());
        dto.setSupervision(details.getSupervision());
        dto.setBenefits(details.getBenefits());
        dto.setPrecautions(details.getPrecautions());
        return dto;
    }

    private UserActivityDTO mapToUserActivityDTO(UserActivity userActivity) {
        UserActivityDTO dto = new UserActivityDTO();
        dto.setId(userActivity.getId());
        dto.setUserId(userActivity.getUserId());
        dto.setActivityId(userActivity.getActivity().getId());
        dto.setCompleted(userActivity.isCompleted());
        dto.setFavorite(userActivity.isFavorite());
        dto.setUserRating(userActivity.getUserRating());
        dto.setCompletedAt(userActivity.getCompletedAt());
        return dto;
    }

    private ActivityWithUserDataDTO mapToWithUserData(Activity activity, List<UserActivity> userActivities) {
        UserActivity userActivity = userActivities.stream()
                .filter(ua -> ua.getActivity().getId().equals(activity.getId()))
                .findFirst()
                .orElse(null);
        return mapToWithUserData(activity, userActivity);
    }

    private ActivityWithUserDataDTO mapToWithUserData(Activity activity, UserActivity userActivity) {
        ActivityWithUserDataDTO dto = new ActivityWithUserDataDTO();
        dto.setId(activity.getId());
        dto.setName(activity.getName());
        dto.setType(activity.getType());
        dto.setDuration(activity.getDuration());
        dto.setScheduledTime(activity.getScheduledTime());
        dto.setDescription(activity.getDescription());
        dto.setImageUrl(activity.getImageUrl());
        dto.setRating(activity.getRating());
        dto.setTotalRatings(activity.getTotalRatings());
        dto.setDoctorSuggested(activity.isDoctorSuggested());
        dto.setLocation(activity.getLocation());
        dto.setStartTime(activity.getStartTime());
        dto.setMonitoredBy(activity.getMonitoredBy());

        if (!activity.getDetails().isEmpty()) {
            ActivityDetails details = activity.getDetails().get(0);
            dto.setInstructions(details.getInstructions());
            dto.setDifficulty(details.getDifficulty());
            dto.setRecommendedStage(details.getRecommendedStage());
            dto.setFrequency(details.getFrequency());
            dto.setSupervision(details.getSupervision());
            dto.setBenefits(details.getBenefits());
            dto.setPrecautions(details.getPrecautions());
        }

        if (userActivity != null) {
            dto.setCompleted(userActivity.isCompleted());
            dto.setFavorite(userActivity.isFavorite());
            dto.setUserRating(userActivity.getUserRating());
        } else {
            dto.setCompleted(false);
            dto.setFavorite(false);
            dto.setUserRating(null);
        }
        return dto;
    }

    public Activity getActivityEntityById(String id) {
        return activityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found with id: " + id));
    }

    public List<ActivityDetails> getDetailsEntitiesByActivityId(String activityId) {
        return detailsRepository.findByActivityId(activityId);
    }

    @Transactional
    public void recommendActivity(String doctorId, String patientId, String activityId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new RuntimeException("Activity not found"));
        ActivityRecommendation rec = ActivityRecommendation.builder()
                .doctorId(doctorId).patientId(patientId).activity(activity)
                .recommendedAt(LocalDateTime.now()).build();
        recommendationRepository.save(rec);
    }

    public List<ActivityDTO> getRecommendationsForPatient(String patientId) {
        return recommendationRepository.findByPatientId(patientId).stream()
                .map(rec -> mapToDTO(rec.getActivity())).collect(Collectors.toList());
    }
}