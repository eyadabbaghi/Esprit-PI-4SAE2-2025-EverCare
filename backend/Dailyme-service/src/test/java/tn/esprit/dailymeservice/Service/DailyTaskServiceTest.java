package tn.esprit.dailymeservice.Service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.dailymeservice.Dto.DailyTaskDTO;
import tn.esprit.dailymeservice.Model.DailyTask;
import tn.esprit.dailymeservice.Repository.DailyTaskRepository;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyTaskServiceTest {

    @Mock
    private DailyTaskRepository dailyTaskRepository;

    @InjectMocks
    private DailyTaskService service;

    @Test
    void createTaskShouldTrimTitleAndInitializeArchiveFields() {

        DailyTaskDTO dto = new DailyTaskDTO();
        dto.setPatientId("P1");
        dto.setTitle("  Morning medicine  ");
        dto.setTaskType("MEDICATION");
        dto.setScheduledTime("08:30");
        dto.setCompleted(false);
        dto.setNotes("after breakfast");

        when(dailyTaskRepository.save(any(DailyTask.class))).thenAnswer(invocation -> {
            DailyTask saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        DailyTaskDTO result = service.createTask(dto);

        ArgumentCaptor<DailyTask> captor = ArgumentCaptor.forClass(DailyTask.class);
        verify(dailyTaskRepository).save(captor.capture());

        DailyTask savedEntity = captor.getValue();
        assertEquals("Morning medicine", savedEntity.getTitle());
        assertEquals(LocalTime.of(8, 30), savedEntity.getScheduledTime());
        assertFalse(savedEntity.isArchived());
        assertNull(savedEntity.getArchivedAt());

        assertEquals(1L, result.getId());
        assertEquals("Morning medicine", result.getTitle());
        assertEquals("08:30", result.getScheduledTime());
        assertFalse(result.isArchived());
    }

    @Test
    void archiveExpiredTasksShouldArchiveFoundTasks() {

        DailyTask expired = new DailyTask();
        expired.setPatientId("P1");
        expired.setTitle("Task");
        expired.setTaskType("OTHER");
        expired.setScheduledTime(LocalTime.of(9, 0));
        expired.setArchived(false);
        expired.setArchivedAt(null);

        when(dailyTaskRepository.findExpiredNotArchived(any(LocalDateTime.class)))
                .thenReturn(List.of(expired));

        service.archiveExpiredTasks();

        verify(dailyTaskRepository).saveAll(List.of(expired));
        assertEquals(true, expired.isArchived());
        assertNotNull(expired.getArchivedAt());
    }

    @Test
    void setCompletedShouldSetCompletedAtWhenTaskBecomesDone() {

        DailyTask task = new DailyTask();
        task.setId(7L);
        task.setPatientId("P1");
        task.setTitle("Walk");
        task.setTaskType("EXERCISE");
        task.setScheduledTime(LocalTime.of(18, 0));
        task.setCompleted(false);

        when(dailyTaskRepository.findById(7L)).thenReturn(Optional.of(task));
        when(dailyTaskRepository.save(task)).thenReturn(task);

        DailyTaskDTO result = service.setCompleted(7L, true);

        assertEquals(true, task.isCompleted());
        assertNotNull(task.getCompletedAt());
        assertEquals(true, result.isCompleted());
        assertNotNull(result.getCompletedAt());
    }
}
