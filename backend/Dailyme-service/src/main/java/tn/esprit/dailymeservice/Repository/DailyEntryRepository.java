package tn.esprit.dailymeservice.Repository;

import tn.esprit.dailymeservice.Model.DailyEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DailyEntryRepository extends JpaRepository<DailyEntry, Long> {

    // ✅ UUID String
    List<DailyEntry> findByPatientIdOrderByEntryDateDesc(String patientId);

    // ✅ UUID String
    boolean existsByPatientIdAndEntryDate(String patientId, LocalDate entryDate);

    // ✅ UUID String
    List<DailyEntry> findByPatientIdAndEntryDateBetween(String patientId, LocalDate startDate, LocalDate endDate);
}
