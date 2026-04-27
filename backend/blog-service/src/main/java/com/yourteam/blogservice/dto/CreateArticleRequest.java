package com.yourteam.blogservice.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateArticleRequest {
    private String title;
    private String content;
    private String coverImageUrl;
    private String language;
    private Integer readingTime;
    private Boolean isPublished;
    private Long categoryId;
}