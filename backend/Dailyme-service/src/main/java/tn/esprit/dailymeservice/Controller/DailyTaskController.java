package tn.esprit.dailymeservice.Controller;

import tn.esprit.dailymeservice.Dto.DailyTaskDTO;
import tn.esprit.dailymeservice.Service.DailyTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/daily-tasks")
@RequiredArgsConstructor

public class DailyTaskController {

    private final DailyTaskService dailyTaskService;

    @PostMapping
    public ResponseEntity<?> createTask(@Valid @RequestBody DailyTaskDTO taskDTO, BindingResult result) {
        if (result.hasErrors()) {
            List<String> errors = result.getFieldErrors()
                    .stream()
                    .map(e -> e.getField() + ": " + e.getDefaultMessage())
                    .collect(Collectors.toList());
            return ResponseEntity.badRequest().body(errors);
        }
        DailyTaskDTO created = dailyTaskService.createTask(taskDTO);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    // ✅ ACTIVE tasks only (auto archives expired before returning)
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<DailyTaskDTO>> getPatientTasks(@PathVariable String patientId) {
        return ResponseEntity.ok(dailyTaskService.getTasksByPatientId(patientId));
    }

    // ✅ HISTORY tasks
    @GetMapping("/patient/{patientId}/history")
    public ResponseEntity<List<DailyTaskDTO>> getPatientHistory(@PathVariable String patientId) {
        return ResponseEntity.ok(dailyTaskService.getHistoryByPatientId(patientId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTask(@PathVariable Long id,
                                        @Valid @RequestBody DailyTaskDTO dto,
                                        BindingResult result) {
        if (result.hasErrors()) {
            List<String> errors = result.getFieldErrors()
                    .stream()
                    .map(e -> e.getField() + ": " + e.getDefaultMessage())
                    .collect(Collectors.toList());
            return ResponseEntity.badRequest().body(errors);
        }
        DailyTaskDTO updated = dailyTaskService.updateTask(id, dto);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/completed")
    public ResponseEntity<?> setCompleted(@PathVariable Long id,
                                          @RequestBody Map<String, Boolean> body) {
        boolean completed = Boolean.TRUE.equals(body.get("completed"));
        DailyTaskDTO updated = dailyTaskService.setCompleted(id, completed);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable Long id) {
        dailyTaskService.deleteTask(id);
        return ResponseEntity.ok("Task deleted successfully");
    }
    @GetMapping("/{id}")
    public ResponseEntity<?> getTaskById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(dailyTaskService.getTaskById(id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Not found: " + id);
        }
    }
}