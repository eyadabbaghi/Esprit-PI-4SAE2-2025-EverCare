package com.yourteam.blogservice.Repository;

import com.yourteam.blogservice.entity.ArticleLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface ArticleLikeRepository extends JpaRepository<ArticleLike, Long> {
    Optional<ArticleLike> findByArticleIdAndUserEmail(Long articleId, String userEmail);
    boolean existsByArticleIdAndUserEmail(Long articleId, String userEmail);
    @Transactional
    void deleteByArticleId(Long articleId);
}