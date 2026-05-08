package org.example.trackingservice.repositories;

import org.example.trackingservice.entities.LocationPing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface LocationPingRepository extends JpaRepository<LocationPing, Long> {

    // âœ… EXISTING (KEEP)
    List<LocationPing> findByPatientIdOrderByTimestampDesc(String patientId);
    List<LocationPing> findTop100ByPatientIdOrderByTimestampDesc(String patientId);

    // ðŸ”¥ 1. Get last 2 pings (for behavior detection)
    @Query("""
        SELECT l FROM LocationPing l
        WHERE l.patientId = :patientId
        ORDER BY l.timestamp DESC
    """)
    List<LocationPing> findLastPings(@Param("patientId") String patientId);

    // ðŸ”¥ 2. Patients outside safe zones
    @Query("""
        SELECT l FROM LocationPing l
        WHERE l.insideSafeZone = false
    """)
    List<LocationPing> findUnsafePatients();

    // ðŸ”¥ 3. High risk patients
    @Query("""
        SELECT l FROM LocationPing l
        WHERE l.riskScore >= 70
    """)
    List<LocationPing> findHighRiskPatients();

    // ðŸ”¥ 4. Inactive patients (advanced condition)
    @Query("""
        SELECT l FROM LocationPing l
        WHERE l.timestamp < :limit
    """)
    List<LocationPing> findInactiveSince(@Param("limit") LocalDateTime limit);
    @Query("SELECT DISTINCT l.patientId FROM LocationPing l")
    List<String> findDistinctPatientIds();
    // ðŸ”¥ 5. Latest ping per patient (VERY ADVANCED â­)
    @Query("""
        SELECT l FROM LocationPing l
        WHERE l.timestamp = (
            SELECT MAX(lp.timestamp)
            FROM LocationPing lp
            WHERE lp.patientId = l.patientId
        )
    """)
    List<LocationPing> findLatestPingPerPatient();
}
