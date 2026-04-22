package tn.esprit.dailymeservice.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.dailymeservice.Model.JournalEntry;
import tn.esprit.dailymeservice.Repository.JournalRepository;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JournalService {

    private final JournalRepository repo;

    private final Path root = Paths.get("uploads/journal");

    public JournalEntry save(String patientId, String text, MultipartFile audio) throws Exception {
        if (!Files.exists(root)) Files.createDirectories(root);

        String savedPath = null;

        if (audio != null && !audio.isEmpty()) {
            String filename = System.currentTimeMillis() + "_" + audio.getOriginalFilename();
            Path dest = root.resolve(filename);
            Files.copy(audio.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
            savedPath = dest.toString();
        }

        JournalEntry e = new JournalEntry();
        e.setPatientId(patientId);
        e.setText(text);
        e.setAudioPath(savedPath);
        e.setCreatedAt(LocalDateTime.now());
        return repo.save(e);
    }

    public List<JournalEntry> getByPatient(String patientId){
        return repo.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    public void delete(Long id){
        repo.deleteById(id);
    }
}