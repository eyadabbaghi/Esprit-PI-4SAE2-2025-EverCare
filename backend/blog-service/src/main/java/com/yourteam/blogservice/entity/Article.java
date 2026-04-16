package com.yourteam.blogservice.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    private String moods;

    @Builder.Default
    private Integer viewCount = 0;

    @Builder.Default
    private Integer likeCount = 0;

    @Builder.Default
    private Boolean isPublished = true;

    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime lastUpdated;

    @Column(columnDefinition = "TEXT")
    private String easySummary;

    // NOUVEAU : email de l'utilisateur qui a créé l'article
    private String authorEmail;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties("articles")
    private Category category;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.viewCount == null) this.viewCount = 0;
        if (this.likeCount == null) this.likeCount = 0;
        if (this.isPublished == null) this.isPublished = true;
    }
}