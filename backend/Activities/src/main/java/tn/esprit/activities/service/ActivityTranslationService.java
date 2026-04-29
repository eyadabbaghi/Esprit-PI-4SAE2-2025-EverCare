package tn.esprit.activities.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.activities.dto.TranslatedActivityDTO;
import tn.esprit.activities.entity.Activity;
import tn.esprit.activities.entity.ActivityDetails;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActivityTranslationService {

    private final ActivityService activityService;
    private final TranslationService translationService;  // our new real translation service

    public TranslatedActivityDTO translateActivity(String activityId, String targetLang) throws IOException {
        Activity activity = activityService.getActivityEntityById(activityId);
        List<ActivityDetails> detailsList = activityService.getDetailsEntitiesByActivityId(activityId);
        ActivityDetails details = detailsList.isEmpty() ? null : detailsList.get(0);

        TranslatedActivityDTO result = new TranslatedActivityDTO();

        result.setName(translationService.translate(activity.getName(), targetLang));
        result.setDescription(translationService.translate(activity.getDescription(), targetLang));

        if (details != null) {
            result.setInstructions(details.getInstructions().stream()
                    .map(instr -> safeTranslate(instr, targetLang))
                    .collect(Collectors.toList()));
            result.setBenefits(details.getBenefits().stream()
                    .map(ben -> safeTranslate(ben, targetLang))
                    .collect(Collectors.toList()));
            result.setPrecautions(details.getPrecautions().stream()
                    .map(pre -> safeTranslate(pre, targetLang))
                    .collect(Collectors.toList()));
        } else {
            result.setInstructions(List.of());
            result.setBenefits(List.of());
            result.setPrecautions(List.of());
        }

        return result;
    }

    private String safeTranslate(String text, String targetLang) {
        try {
            return translationService.translate(text, targetLang);
        } catch (Exception e) {
            return text + " [translation error]";
        }
    }
}