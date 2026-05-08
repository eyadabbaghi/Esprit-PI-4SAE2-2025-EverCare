package com.yourteam.blogservice.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CategoryPerformanceDTO {

    private String categoryName;
    private Long articleCount;
    private Long totalViews;
    private Double averageLikes;
    private Double engagementRate; // Calculé algorithmiquement

    /**
     * Le constructeur doit correspondre EXACTEMENT à l'ordre de la requête JPQL :
     * 1. a.category.name (String)
     * 2. COUNT(a) (Long)
     * 3. SUM(a.viewCount) (Long)
     * 4. AVG(a.likeCount) (Double)
     */
    public CategoryPerformanceDTO(String categoryName, Long articleCount, Long totalViews, Double averageLikes) {
        this.categoryName = categoryName;
        this.articleCount = articleCount;
        this.totalViews = (totalViews != null) ? totalViews : 0L;
        this.averageLikes = (averageLikes != null) ? averageLikes : 0.0;

        // LOGIQUE ALGORITHMIQUE : Calcul du taux d'engagement
        // On multiplie l'engagement par article pour obtenir une tendance sur la catégorie
        if (this.totalViews > 0) {
            // Formule : (Total estimé des likes / Total des vues) * 100
            this.engagementRate = ((this.averageLikes * this.articleCount) / this.totalViews) * 100;
        } else {
            this.engagementRate = 0.0;
        }
    }

    // Constructeur vide nécessaire pour la déserialization JSON
    public CategoryPerformanceDTO() {
    }
}