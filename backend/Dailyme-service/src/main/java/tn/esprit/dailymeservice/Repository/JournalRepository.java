package tn.esprit.dailymeservice.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.dailymeservice.Model.JournalEntry;

import java.util.List;

public interface JournalRepository extends JpaRepository<JournalEntry, Long> {
    List<JournalEntry> findByPatientIdOrderByCreatedAtDesc(String patientId);
}