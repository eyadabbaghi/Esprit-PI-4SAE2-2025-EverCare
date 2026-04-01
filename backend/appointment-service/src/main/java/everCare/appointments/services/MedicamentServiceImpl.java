package everCare.appointments.services;

import everCare.appointments.entities.Medicament;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.repositories.MedicamentRepository;
import everCare.appointments.services.MedicamentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MedicamentServiceImpl implements MedicamentService {

    private final MedicamentRepository medicamentRepository;

    // ========== CREATE ==========

    @Override
    public Medicament createMedicament(Medicament medicament) {

        // Set default active to true
        medicament.setActif(true);

        // Check if code CIP already exists
        if (medicament.getCodeCIP() != null &&
                medicamentRepository.existsByCodeCIP(medicament.getCodeCIP())) {
            throw new RuntimeException("Medicament with code CIP " + medicament.getCodeCIP() + " already exists");
        }

        return medicamentRepository.save(medicament);
    }

    // ========== READ ==========

    @Override
    public List<Medicament> getAllMedicaments() {
        return medicamentRepository.findAll();
    }

    @Override
    public Medicament getMedicamentById(String id) {
        return medicamentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + id));
    }

    @Override
    public Medicament getMedicamentByCodeCIP(String codeCIP) {
        Medicament medicament = medicamentRepository.findByCodeCIP(codeCIP);
        if (medicament == null) {
            throw new ResourceNotFoundException("Medicament not found with code CIP: " + codeCIP);
        }
        return medicament;
    }

    @Override
    public List<Medicament> searchMedicaments(String keyword) {
        return medicamentRepository.searchMedicaments(keyword);
    }

    @Override
    public List<Medicament> getActiveMedicaments() {
        return medicamentRepository.findByActifTrue();
    }

    @Override
    public List<Medicament> getMedicamentsByLaboratoire(String laboratoire) {
        return medicamentRepository.findByLaboratoireContainingIgnoreCase(laboratoire);
    }

    @Override
    public List<Medicament> getMedicamentsByForme(String forme) {
        return medicamentRepository.findByForme(forme);
    }

    // ========== UPDATE ==========

    @Override
    public Medicament updateMedicament(String id, Medicament medicamentDetails) {
        Medicament existingMedicament = getMedicamentById(id);

        if (medicamentDetails.getNomCommercial() != null) {
            existingMedicament.setNomCommercial(medicamentDetails.getNomCommercial());
        }

        if (medicamentDetails.getDenominationCommuneInternationale() != null) {
            existingMedicament.setDenominationCommuneInternationale(medicamentDetails.getDenominationCommuneInternationale());
        }

        if (medicamentDetails.getDosage() != null) {
            existingMedicament.setDosage(medicamentDetails.getDosage());
        }

        if (medicamentDetails.getForme() != null) {
            existingMedicament.setForme(medicamentDetails.getForme());
        }

        if (medicamentDetails.getLaboratoire() != null) {
            existingMedicament.setLaboratoire(medicamentDetails.getLaboratoire());
        }

        if (medicamentDetails.getIndications() != null) {
            existingMedicament.setIndications(medicamentDetails.getIndications());
        }

        if (medicamentDetails.getContreIndications() != null) {
            existingMedicament.setContreIndications(medicamentDetails.getContreIndications());
        }

        if (medicamentDetails.getEffetsSecondaires() != null) {
            existingMedicament.setEffetsSecondaires(medicamentDetails.getEffetsSecondaires());
        }

        if (medicamentDetails.getNoticeSimplifiee() != null) {
            existingMedicament.setNoticeSimplifiee(medicamentDetails.getNoticeSimplifiee());
        }

        existingMedicament.setUpdatedAt(LocalDateTime.now());

        return medicamentRepository.save(existingMedicament);
    }

    @Override
    public Medicament activateMedicament(String id) {
        Medicament medicament = getMedicamentById(id);
        medicament.setActif(true);
        medicament.setUpdatedAt(LocalDateTime.now());
        return medicamentRepository.save(medicament);
    }

    @Override
    public Medicament deactivateMedicament(String id) {
        Medicament medicament = getMedicamentById(id);
        medicament.setActif(false);
        medicament.setUpdatedAt(LocalDateTime.now());
        return medicamentRepository.save(medicament);
    }

    @Override
    public Medicament updatePhoto(String id, String photoUrl) {
        Medicament medicament = getMedicamentById(id);
        medicament.setPhotoUrl(photoUrl);
        medicament.setUpdatedAt(LocalDateTime.now());
        return medicamentRepository.save(medicament);
    }

    @Override
    public Medicament updateNotice(String id, String notice) {
        Medicament medicament = getMedicamentById(id);
        medicament.setNoticeSimplifiee(notice);
        medicament.setUpdatedAt(LocalDateTime.now());
        return medicamentRepository.save(medicament);
    }

    // ========== DELETE ==========

    @Override
    public void deleteMedicament(String id) {
        Medicament medicament = getMedicamentById(id);
        medicamentRepository.delete(medicament);
    }

    @Override
    public void deleteAllMedicaments() {
        medicamentRepository.deleteAll();
    }

    // ========== BUSINESS LOGIC ==========

    @Override
    public boolean existsByCodeCIP(String codeCIP) {
        return medicamentRepository.existsByCodeCIP(codeCIP);
    }

    @Override
    public long countMedicaments() {
        return medicamentRepository.count();
    }
}