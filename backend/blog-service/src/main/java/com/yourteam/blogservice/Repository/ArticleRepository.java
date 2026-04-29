package com.yourteam.blogservice.Repository;

import com.yourteam.blogservice.dto.CategoryPerformanceDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import com.yourteam.blogservice.entity.Article;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findByCategoryId(Long categoryId);
    List<Article> findByIsPublishedTrue();

    // Requête JPQL avancée pour les statistiques globales
    @Query("SELECT new com.yourteam.blogservice.dto.CategoryPerformanceDTO(" +
            "c.name, " +
            "COUNT(a), " +
            "CAST(SUM(a.viewCount) AS long), " +
            "AVG(a.likeCount)) " +
            "FROM Article a " +
            "JOIN a.category c " +
            "GROUP BY c.name " +
            "ORDER BY SUM(a.viewCount) DESC")
    List<CategoryPerformanceDTO> getCategoryPerformanceReport();
}