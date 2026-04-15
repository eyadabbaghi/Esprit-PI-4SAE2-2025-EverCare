package com.yourteam.blogservice.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.yourteam.blogservice.entity.Article;
import java.util.List;

public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findByCategoryId(Long categoryId);
    List<Article> findByIsPublishedTrue();
}