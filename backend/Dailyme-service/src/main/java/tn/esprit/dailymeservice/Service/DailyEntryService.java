package tn.esprit.dailymeservice.Service;

import tn.esprit.dailymeservice.Dto.DailyEntryDTO;
import tn.esprit.dailymeservice.Model.DailyEntry;
import tn.esprit.dailymeservice.Repository.DailyEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Comparator;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyEntryService {

    private final DailyEntryRepository dailyEntryRepository;

    @Transactional
    public DailyEntryDTO createEntry(DailyEntryDTO dto) {
        DailyEntry entry = mapToEntity(dto);
        DailyEntry saved = dailyEntryRepository.save(entry);
        return mapToDTO(saved);
    }

    // ✅ patientId is UUID String
    public List<DailyEntryDTO> getEntriesByPatientId(String patientId) {
        return dailyEntryRepository.findByPatientIdOrderByEntryDateDesc(patientId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public DailyEntryDTO getEntryById(Long id) {
        DailyEntry entry = dailyEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Entry not found"));
        return mapToDTO(entry);
    }

    // ✅ patientId is UUID String
    public List<DailyEntryDTO> getEntriesByDateRange(String patientId, LocalDate start, LocalDate end) {
        return dailyEntryRepository.findByPatientIdAndEntryDateBetween(patientId, start, end)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ✅ matches Controller: updateEntry(id, dto)
    @Transactional
    public DailyEntryDTO updateEntry(Long id, DailyEntryDTO dto) {
        DailyEntry existing = dailyEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Entry not found"));

        // update allowed fields
        existing.setDailyEmotion(dto.getDailyEmotion());
        existing.setNotes(dto.getNotes());

        // optional: if you want to allow updating the date too
        // existing.setEntryDate(dto.getEntryDate());

        DailyEntry saved = dailyEntryRepository.save(existing);
        return mapToDTO(saved);
    }
    public List<DailyEntryDTO> getWeeklyEntries(String patientId) {

        LocalDate endDate = LocalDate.now();        // today
        LocalDate startDate = endDate.minusDays(6); // 7 days total (inclusive)

        return dailyEntryRepository
                .findByPatientIdAndEntryDateBetween(patientId, startDate, endDate)
                .stream()
                .sorted(Comparator.comparing(DailyEntry::getEntryDate)) // ASC for chart
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteEntry(Long id) {
        if (!dailyEntryRepository.existsById(id)) {
            throw new RuntimeException("Entry not found");
        }
        dailyEntryRepository.deleteById(id);
    }

    private DailyEntry mapToEntity(DailyEntryDTO dto) {
        DailyEntry entry = new DailyEntry();
        entry.setPatientId(dto.getPatientId());     // String
        entry.setEntryDate(dto.getEntryDate());
        entry.setDailyEmotion(dto.getDailyEmotion());
        entry.setNotes(dto.getNotes());
        return entry;
    }

    private DailyEntryDTO mapToDTO(DailyEntry entry) {
        DailyEntryDTO dto = new DailyEntryDTO();
        dto.setId(entry.getId());
        dto.setPatientId(entry.getPatientId());     // String
        dto.setEntryDate(entry.getEntryDate());
        dto.setDailyEmotion(entry.getDailyEmotion());
        dto.setNotes(entry.getNotes());
        return dto;
    }
}
