package com.yourteam.blogservice.controller;

import com.yourteam.blogservice.dto.CategoryPerformanceDTO;
import com.yourteam.blogservice.dto.CreateArticleRequest;
import com.yourteam.blogservice.entity.Article;
import com.yourteam.blogservice.services.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blog")
@RequiredArgsConstructor
public class ArticleController {

    private final ArticleService articleService;

    @GetMapping("/articles")
    public ResponseEntity<List<Article>> getAllArticles() {
        return ResponseEntity.ok(articleService.getAllArticles());
    }

    @PostMapping("/articles")
    public ResponseEntity<Article> createArticle(@RequestBody CreateArticleRequest request) {
        String authorEmail = "anonymous";
        return ResponseEntity.ok(articleService.createArticle(request, authorEmail));
    }

    @GetMapping("/articles/category/{categoryId}")
    public ResponseEntity<List<Article>> getArticlesByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(articleService.getArticlesByCategory(categoryId));
    }

    @PutMapping("/articles/{id}")
    public ResponseEntity<Article> updateArticle(@PathVariable Long id,
                                              @RequestBody Article article) {
        String userEmail = "anonymous";
        boolean admin = true;
        return ResponseEntity.ok(articleService.updateArticle(id, article, userEmail, admin));
    }

    @DeleteMapping("/articles/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id) {
        String userEmail = "anonymous";
        boolean admin = true;
        articleService.deleteArticle(id, userEmail, admin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/articles/{id}/like")
    public ResponseEntity<Article> likeArticle(@PathVariable Long id) {
        String userEmail = "anonymous";
        return ResponseEntity.ok(articleService.likeArticle(id, userEmail));
    }

    @PostMapping("/articles/{id}/dislike")
    public ResponseEntity<Article> dislikeArticle(@PathVariable Long id) {
        String userEmail = "anonymous";
        return ResponseEntity.ok(articleService.dislikeArticle(id, userEmail));
    }

    @PostMapping("/articles/{id}/view")
    public ResponseEntity<Article> incrementViews(@PathVariable Long id) {
        return ResponseEntity.ok(articleService.incrementViews(id));
    }

    @GetMapping("/stats/categories")
    public ResponseEntity<List<CategoryPerformanceDTO>> getCategoryStats() {
        return ResponseEntity.ok(articleService.getCategoryStats());
    }

    @GetMapping("/articles/{id}/summary")
    public ResponseEntity<String> getArticleSummary(@PathVariable Long id) {
        String summary = articleService.getOrGenerateSummary(id);
        return ResponseEntity.ok(summary);
    }
}