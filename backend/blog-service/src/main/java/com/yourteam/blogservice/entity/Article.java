package com.yourteam.blogservice.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Article {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    @Column(columnDefinition = "TEXT")
    private String content;
    private String coverImageUrl;
    private String language;
    private Integer readingTime;
    private Integer viewCount = 0;
    private Integer likeCount = 0;
    private Boolean isPublished = false;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime lastUpdated;

    @ManyToOne
    @JoinColumn(name = "category_id")
    @JsonBackReference // Évite les boucles infinies lors de la conversion JSON
    private Category category;
}