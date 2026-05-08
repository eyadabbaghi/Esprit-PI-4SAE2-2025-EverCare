package everCare.appointments.services;

import everCare.appointments.dtos.MedicamentAnalyticsSummaryDTO;
import everCare.appointments.dtos.MedicamentUsageStatsDTO;
import everCare.appointments.entities.Medicament;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.repositories.MedicamentRepository;
import everCare.appointments.repositories.PrescriptionRepository;
import everCare.appointments.specifications.MedicamentSpecifications;
import everCare.appointments.services.MedicamentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MedicamentServiceImpl implements MedicamentService {

    private final MedicamentRepository medicamentRepository;
    private final PrescriptionRepository prescriptionRepository;

    // ========== CREATE ==========

    @Override
    public Medicament createMedicament(Medicament medicament, String actorEmail) {
        validateCodeCipUniqueness(medicament.getCodeCIP(), null);

        // Set default active to true
        medicament.setActif(true);
        medicament.setCreatedBy(actorEmail);
        medicament.setUpdatedBy(actorEmail);
        medicament.setUpdatedAt(LocalDateTime.now());

        return medicamentRepository.save(medicament);
    }

    // ========== READ ==========

    @Override
    public List<Medicament> getAllMedicaments() {
        return medicamentRepository.findAll();
    }

    @Override
    public Optional<Medicament> getMedicamentById(String id) {
        return medicamentRepository.findById(id);
    }

    @Override
    public Optional<Medicament> getMedicamentByCodeCIP(String codeCIP) {
        return Optional.ofNullable(medicamentRepository.findByCodeCIP(codeCIP));
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

    @Override
    public Page<Medicament> filterMedicaments(String keyword, Boolean actif, String laboratoire,
                                              String forme, String dosage, Boolean used, Pageable pageable) {
        return medicamentRepository.findAll(
                MedicamentSpecifications.withFilters(keyword, actif, laboratoire, forme, dosage, used),
                pageable
        );
    }

    // ========== UPDATE ==========

    @Override
    public Medicament updateMedicament(String id, Medicament medicamentDetails, String actorEmail) {
        Medicament existingMedicament = getMedicamentById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + id));

        if (medicamentDetails.getCodeCIP() != null) {
            validateCodeCipUniqueness(medicamentDetails.getCodeCIP(), id);
            existingMedicament.setCodeCIP(medicamentDetails.getCodeCIP());
        }

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
        existingMedicament.setUpdatedBy(actorEmail);

        return medicamentRepository.save(existingMedicament);
    }

    @Override
    public Medicament activateMedicament(String id, String actorEmail) {
        Medicament medicament = getMedicamentById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + id));
        medicament.setActif(true);
        medicament.setUpdatedAt(LocalDateTime.now());
        medicament.setUpdatedBy(actorEmail);
        return medicamentRepository.save(medicament);
    }

    @Override
    public Medicament deactivateMedicament(String id, String actorEmail) {
        Medicament medicament = getMedicamentById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + id));
        medicament.setActif(false);
        medicament.setUpdatedAt(LocalDateTime.now());
        medicament.setUpdatedBy(actorEmail);
        return medicamentRepository.save(medicament);
    }

    @Override
    public Medicament updatePhoto(String id, String photoUrl, String actorEmail) {
        Medicament medicament = getMedicamentById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + id));
        medicament.setPhotoUrl(photoUrl);
        medicament.setUpdatedAt(LocalDateTime.now());
        medicament.setUpdatedBy(actorEmail);
        return medicamentRepository.save(medicament);
    }

    @Override
    public Medicament updateNotice(String id, String notice, String actorEmail) {
        Medicament medicament = getMedicamentById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + id));
        medicament.setNoticeSimplifiee(notice);
        medicament.setUpdatedAt(LocalDateTime.now());
        medicament.setUpdatedBy(actorEmail);
        return medicamentRepository.save(medicament);
    }

    // ========== DELETE ==========

    @Override
    public void deleteMedicament(String id) {
        Medicament medicament = getMedicamentById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medicament not found with id: " + id));

        if (prescriptionRepository.countByMedicament(medicament) > 0) {
            throw new ResponseStatusException(
                    CONFLICT,
                    "This medicament is already used in prescriptions. Deactivate it instead."
            );
        }

        medicamentRepository.delete(medicament);
    }

    @Override
    public void deleteAllMedicaments() {
        if (prescriptionRepository.count() > 0) {
            throw new ResponseStatusException(
                    CONFLICT,
                    "Medicaments already used in prescriptions cannot be deleted in bulk. Deactivate them instead."
            );
        }

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

    @Override
    public List<MedicamentUsageStatsDTO> getUsageStats(String doctorId, int limit) {
        return medicamentRepository.getUsageStats(doctorId)
                .stream()
                .limit(Math.max(limit, 1))
                .toList();
    }

    @Override
    public MedicamentAnalyticsSummaryDTO getAnalyticsSummary(String doctorId) {
        List<MedicamentUsageStatsDTO> stats = medicamentRepository.getUsageStats(doctorId);

        long active = stats.stream().filter(MedicamentUsageStatsDTO::isActif).count();
        long inactive = stats.size() - active;
        long used = stats.stream().filter(item -> item.getTotalPrescriptions() > 0).count();
        long unused = stats.size() - used;
        long deactivatedUsed = stats.stream()
                .filter(item -> !item.isActif() && item.getTotalPrescriptions() > 0)
                .count();

        return MedicamentAnalyticsSummaryDTO.builder()
                .totalMedicaments(stats.size())
                .activeMedicaments(active)
                .inactiveMedicaments(inactive)
                .usedMedicaments(used)
                .unusedMedicaments(unused)
                .deactivatedUsedMedicaments(deactivatedUsed)
                .build();
    }

    private void validateCodeCipUniqueness(String codeCIP, String currentMedicamentId) {
        if (codeCIP == null || codeCIP.isBlank()) {
            return;
        }

        Medicament existing = medicamentRepository.findByCodeCIP(codeCIP);
        if (existing != null && !existing.getMedicamentId().equals(currentMedicamentId)) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Another medicament already uses code CIP " + codeCIP + "."
            );
        }
    }
}
