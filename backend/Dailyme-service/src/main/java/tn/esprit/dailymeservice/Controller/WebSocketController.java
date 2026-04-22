package tn.esprit.dailymeservice.Controller;


import tn.esprit.dailymeservice.Dto.DailyEntryDTO;
import tn.esprit.dailymeservice.Dto.DailyTaskDTO;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class WebSocketController {

    @MessageMapping("/entry/new")
    @SendTo("/topic/entries")
    public DailyEntryDTO broadcastNewEntry(DailyEntryDTO entry) {
        return entry;
    }

    @MessageMapping("/task/update")
    @SendTo("/topic/tasks")
    public DailyTaskDTO broadcastTaskUpdate(DailyTaskDTO task) {
        return task;
    }
}