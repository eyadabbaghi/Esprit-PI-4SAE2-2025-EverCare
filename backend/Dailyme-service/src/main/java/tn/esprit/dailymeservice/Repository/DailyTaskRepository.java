package tn.esprit.dailymeservice.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.dailymeservice.Model.DailyTask;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DailyTaskRepository extends JpaRepository<DailyTask, Long> {

    // (optional) all tasks
    List<DailyTask> findByPatientId(String patientId);

    // ✅ Active tasks (not archived)
    List<DailyTask> findByPatientIdAndArchivedFalseOrderByScheduledTimeAsc(String patientId);

    // ✅ History tasks (archived)
    List<DailyTask> findByPatientIdAndArchivedTrueOrderByArchivedAtDesc(String patientId);

    // ✅ tasks older than 24h and not archived yet
    @Query("SELECT t FROM DailyTask t WHERE t.archived = false AND t.createdAt < :limit")
    List<DailyTask> findExpiredNotArchived(@Param("limit") LocalDateTime limit);
    // ✅ counts for top cards
    @Query("SELECT COUNT(t) FROM DailyTask t WHERE t.patientId = :pid AND t.archived = false")
    long countActive(@Param("pid") String patientId);

    @Query("SELECT COUNT(t) FROM DailyTask t WHERE t.patientId = :pid AND t.archived = false AND t.completed = true")
    long countCompletedActive(@Param("pid") String patientId);

    // ✅ missed history (archived, not completed, older than 24h)
    @Query("""
    SELECT COUNT(t)
    FROM DailyTask t
    WHERE t.patientId = :pid
      AND t.archived = true
      AND t.completed = false
      AND t.createdAt <= :limit
""")
    long countMissedHistory(@Param("pid") String patientId, @Param("limit") LocalDateTime limit);

    // ✅ donut chart: distribution by type (active only)
    @Query("""
    SELECT t.taskType, COUNT(t)
    FROM DailyTask t
    WHERE t.patientId = :pid
      AND t.archived = false
    GROUP BY t.taskType
""")
    List<Object[]> countByTypeActive(@Param("pid") String patientId);

    // ✅ weekly trend: completion rate per day (active only)
    @Query("""
    SELECT FUNCTION('date', t.createdAt),
           SUM(CASE WHEN t.completed = true THEN 1 ELSE 0 END),
           COUNT(t)
    FROM DailyTask t
    WHERE t.patientId = :pid
      AND t.archived = false
      AND t.createdAt BETWEEN :start AND :end
    GROUP BY FUNCTION('date', t.createdAt)
    ORDER BY FUNCTION('date', t.createdAt)
""")
    List<Object[]> completionByDay(@Param("pid") String patientId,
                                   @Param("start") LocalDateTime start,
                                   @Param("end") LocalDateTime end);

    // ✅ texts for keyword algorithm
    @Query("""
    SELECT t.title, t.notes
    FROM DailyTask t
    WHERE t.patientId = :pid
      AND t.archived = false
""")
    List<Object[]> taskTexts(@Param("pid") String patientId);
}