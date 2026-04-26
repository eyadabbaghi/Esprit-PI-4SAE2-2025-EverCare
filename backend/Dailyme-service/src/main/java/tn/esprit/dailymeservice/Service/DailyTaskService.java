package tn.esprit.dailymeservice.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.dailymeservice.Dto.DailyTaskDTO;
import tn.esprit.dailymeservice.Model.DailyTask;
import tn.esprit.dailymeservice.Repository.DailyTaskRepository;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DailyTaskService {

    private final DailyTaskRepository dailyTaskRepository;

    private static final DateTimeFormatter F24 = DateTimeFormatter.ofPattern("HH:mm");

    // =========================
    // ✅ TIME PARSER "HH:mm" (accept "HH:mm:ss" too)
    // =========================
    private LocalTime parseTime(String s) {
        if (s == null || s.trim().isEmpty()) return null;
        s = s.trim();
        if (s.matches("^\\d{2}:\\d{2}:\\d{2}$")) s = s.substring(0, 5);
        return LocalTime.parse(s, F24);
    }

    // =========================
    // ✅ Auto-archive tasks older than 24 hours
    // =========================
    @Transactional
    public void archiveExpiredTasks() {
        LocalDateTime limit = LocalDateTime.now().minusHours(24);
        List<DailyTask> expired = dailyTaskRepository.findExpiredNotArchived(limit);

        if (expired == null || expired.isEmpty()) return;

        LocalDateTime now = LocalDateTime.now();
        for (DailyTask t : expired) {
            t.setArchived(true);
            if (t.getArchivedAt() == null) t.setArchivedAt(now);
        }

        dailyTaskRepository.saveAll(expired);
    }

    // =========================
    // ✅ CREATE
    // =========================
    @Transactional
    public DailyTaskDTO createTask(DailyTaskDTO dto) {
        DailyTask task = mapToEntity(dto);

        // ✅ safety default
        task.setArchived(false);
        task.setArchivedAt(null);

        DailyTask saved = dailyTaskRepository.save(task);
        return mapToDTO(saved);
    }

    // =========================
    // ✅ ACTIVE (returns ONLY active tasks)
    // =========================
    public List<DailyTaskDTO> getTasksByPatientId(String patientId) {
        archiveExpiredTasks();

        List<DailyTask> list =
                dailyTaskRepository.findByPatientIdAndArchivedFalseOrderByScheduledTimeAsc(patientId);

        return mapToDTOList(list);
    }

    // =========================
    // ✅ HISTORY
    // =========================
    public List<DailyTaskDTO> getHistoryByPatientId(String patientId) {
        archiveExpiredTasks();

        List<DailyTask> list =
                dailyTaskRepository.findByPatientIdAndArchivedTrueOrderByArchivedAtDesc(patientId);

        return mapToDTOList(list);
    }

    // =========================
    // ✅ UPDATE (does NOT change archived status)
    // =========================
    @Transactional
    public DailyTaskDTO updateTask(Long id, DailyTaskDTO dto) {
        DailyTask task = dailyTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        // keep history state
        boolean wasArchived = task.isArchived();
        LocalDateTime oldArchivedAt = task.getArchivedAt();
        LocalDateTime oldCreatedAt = task.getCreatedAt();

        task.setTitle(dto.getTitle() == null ? null : dto.getTitle().trim());
        task.setTaskType(dto.getTaskType());
        task.setScheduledTime(parseTime(dto.getScheduledTime()));
        task.setNotes(dto.getNotes());

        // keep those untouched
        task.setArchived(wasArchived);
        task.setArchivedAt(oldArchivedAt);
        task.setCreatedAt(oldCreatedAt);

        DailyTask saved = dailyTaskRepository.save(task);
        return mapToDTO(saved);
    }

    // =========================
    // ✅ PATCH completed
    // =========================
    @Transactional
    public DailyTaskDTO setCompleted(Long id, boolean completed) {
        DailyTask task = dailyTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        task.setCompleted(completed);

        // ✅ manage completedAt here (reliable)
        if (completed && task.getCompletedAt() == null) task.setCompletedAt(LocalDateTime.now());
        if (!completed) task.setCompletedAt(null);

        DailyTask saved = dailyTaskRepository.save(task);
        return mapToDTO(saved);
    }

    // =========================
    // ✅ DELETE
    // =========================
    @Transactional
    public void deleteTask(Long id) {
        dailyTaskRepository.deleteById(id);
    }

    // =========================
    // ✅ DTO -> Entity
    // =========================
    private DailyTask mapToEntity(DailyTaskDTO dto) {
        DailyTask task = new DailyTask();
        task.setPatientId(dto.getPatientId());
        task.setTitle(dto.getTitle() == null ? null : dto.getTitle().trim());
        task.setTaskType(dto.getTaskType());
        task.setScheduledTime(parseTime(dto.getScheduledTime()));
        task.setCompleted(dto.isCompleted());
        task.setNotes(dto.getNotes());
        return task;
    }

    // =========================
    // ✅ Entity -> DTO (includes dates + history fields)
    // =========================
    private DailyTaskDTO mapToDTO(DailyTask entity) {
        DailyTaskDTO dto = new DailyTaskDTO();
        dto.setId(entity.getId());
        dto.setPatientId(entity.getPatientId());
        dto.setTitle(entity.getTitle());
        dto.setTaskType(entity.getTaskType());

        dto.setScheduledTime(entity.getScheduledTime() == null ? null : entity.getScheduledTime().format(F24));
        dto.setCompleted(entity.isCompleted());
        dto.setNotes(entity.getNotes());

        // ✅ NEW: send to Angular
        dto.setArchived(entity.isArchived());
        dto.setArchivedAt(entity.getArchivedAt());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setCompletedAt(entity.getCompletedAt());

        return dto;
    }

    private List<DailyTaskDTO> mapToDTOList(List<DailyTask> list) {
        List<DailyTaskDTO> out = new ArrayList<>();
        if (list == null) return out;
        for (DailyTask t : list) out.add(mapToDTO(t));
        return out;
    }
    public DailyTaskDTO getTaskById(Long id) {
        DailyTask task = dailyTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        return mapToDTO(task);
    }
}