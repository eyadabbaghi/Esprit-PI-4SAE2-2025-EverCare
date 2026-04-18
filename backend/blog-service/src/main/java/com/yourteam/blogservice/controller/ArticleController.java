package com.yourteam.blogservice.controller;

import com.yourteam.blogservice.dto.CategoryPerformanceDTO;
import com.yourteam.blogservice.entity.Article;
import com.yourteam.blogservice.services.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/blog")
@RequiredArgsConstructor
public class ArticleController {

    private final ArticleService articleService;

    private boolean isAdmin(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess == null) return false;
        List<String> roles = (List<String>) realmAccess.get("roles");
        return roles != null && roles.contains("admin");
    }

    @GetMapping("/articles")
    public ResponseEntity<List<Article>> getAllArticles() {
        return ResponseEntity.ok(articleService.getAllArticles());
    }

    @PostMapping("/articles/category/{categoryId}")
    public ResponseEntity<Article> createArticle(@RequestBody Article article,
                                                 @PathVariable Long categoryId,
                                                 @AuthenticationPrincipal Jwt jwt) {
        String userEmail = jwt.getClaimAsString("email");
        return ResponseEntity.ok(articleService.createArticle(article, categoryId, userEmail));
    }

    @GetMapping("/articles/category/{categoryId}")
    public ResponseEntity<List<Article>> getArticlesByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(articleService.getArticlesByCategory(categoryId));
    }

    @PutMapping("/articles/{id}")
    public ResponseEntity<Article> updateArticle(@PathVariable Long id,
                                                 @RequestBody Article article,
                                                 @AuthenticationPrincipal Jwt jwt) {
        String userEmail = jwt.getClaimAsString("email");
        boolean admin = isAdmin(jwt);
        return ResponseEntity.ok(articleService.updateArticle(id, article, userEmail, admin));
    }

    @DeleteMapping("/articles/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id,
                                              @AuthenticationPrincipal Jwt jwt) {
        String userEmail = jwt.getClaimAsString("email");
        boolean admin = isAdmin(jwt);
        articleService.deleteArticle(id, userEmail, admin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/articles/{id}/like")
    public ResponseEntity<Article> likeArticle(@PathVariable Long id,
                                               @AuthenticationPrincipal Jwt jwt) {
        String userEmail = jwt.getClaimAsString("email");
        return ResponseEntity.ok(articleService.likeArticle(id, userEmail));
    }

    @PostMapping("/articles/{id}/dislike")
    public ResponseEntity<Article> dislikeArticle(@PathVariable Long id,
                                                  @AuthenticationPrincipal Jwt jwt) {
        String userEmail = jwt.getClaimAsString("email");
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