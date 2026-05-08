package tn.esprit.activities.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.activities.entity.Activity;
import tn.esprit.activities.entity.ActivityDetails;
import tn.esprit.activities.exception.ResourceNotFoundException;
import tn.esprit.activities.service.ActivityService;
import tn.esprit.activities.service.SummarizationService;

import java.util.List;

@RestController
@RequestMapping("/activities")
@RequiredArgsConstructor
public class SummarizationController {

    private final ActivityService activityService;
    private final SummarizationService summarizationService;

    @GetMapping("/summarize/{id}")
    public ResponseEntity<?> summarizeActivity(@PathVariable String id) {
        try {
            Activity activity = activityService.getActivityEntityById(id);
            List<ActivityDetails> detailsList = activityService.getDetailsEntitiesByActivityId(id);

            StringBuilder textToSummarize = new StringBuilder(activity.getDescription());
            if (!detailsList.isEmpty() && !detailsList.get(0).getInstructions().isEmpty()) {
                textToSummarize.append(" ").append(String.join(". ", detailsList.get(0).getInstructions()));
            }

            String summary = summarizationService.summarize(textToSummarize.toString());
            return ResponseEntity.ok(summary);

        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(503).body("Summarization service unavailable");
        }
    }
}