package tn.esprit.dailymeservice.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DailyTaskArchiveScheduler {

    private final DailyTaskService dailyTaskService;

    @Scheduled(fixedRate = 300000) // every 5 minutes
    public void archiveJob() {
        dailyTaskService.archiveExpiredTasks();
    }
}
