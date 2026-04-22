package tn.esprit.dailymeservice.Service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.dailymeservice.Dto.DailyEntryDTO;
import tn.esprit.dailymeservice.Model.DailyEntry;
import tn.esprit.dailymeservice.Repository.DailyEntryRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyEntryServiceTest {

    @Mock
    private DailyEntryRepository dailyEntryRepository;

    @InjectMocks
    private DailyEntryService service;

    @Test
    void getWeeklyEntriesShouldReturnEntriesSortedAscendingByDate() {

        DailyEntry day3 = entry(3L, LocalDate.now().minusDays(1), "Calm");
        DailyEntry day1 = entry(1L, LocalDate.now().minusDays(3), "Happy");
        DailyEntry day2 = entry(2L, LocalDate.now().minusDays(2), "Neutral");

        when(dailyEntryRepository.findByPatientIdAndEntryDateBetween(eq("P1"), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(day3, day1, day2));

        List<DailyEntryDTO> result = service.getWeeklyEntries("P1");

        assertEquals(3, result.size());
        assertEquals(day1.getEntryDate(), result.get(0).getEntryDate());
        assertEquals(day2.getEntryDate(), result.get(1).getEntryDate());
        assertEquals(day3.getEntryDate(), result.get(2).getEntryDate());
    }

    @Test
    void updateEntryShouldKeepExistingDateAndReplaceEditableFields() {

        DailyEntry existing = entry(1L, LocalDate.of(2026, 4, 10), "Sad");
        existing.setNotes("old");

        DailyEntryDTO update = new DailyEntryDTO();
        update.setEntryDate(LocalDate.of(2026, 4, 14));
        update.setDailyEmotion("Calm");
        update.setNotes("better");

        when(dailyEntryRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(dailyEntryRepository.save(existing)).thenReturn(existing);

        DailyEntryDTO result = service.updateEntry(1L, update);

        assertEquals(LocalDate.of(2026, 4, 10), existing.getEntryDate());
        assertEquals("Calm", existing.getDailyEmotion());
        assertEquals("better", existing.getNotes());
        assertEquals("Calm", result.getDailyEmotion());
    }

    @Test
    void deleteEntryShouldThrowWhenEntryDoesNotExist() {

        when(dailyEntryRepository.existsById(99L)).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.deleteEntry(99L));

        assertEquals("Entry not found", ex.getMessage());
        verify(dailyEntryRepository).existsById(99L);
    }

    private DailyEntry entry(Long id, LocalDate date, String emotion) {
        DailyEntry entry = new DailyEntry();
        entry.setId(id);
        entry.setPatientId("P1");
        entry.setEntryDate(date);
        entry.setDailyEmotion(emotion);
        entry.setNotes("note");
        return entry;
    }
}
