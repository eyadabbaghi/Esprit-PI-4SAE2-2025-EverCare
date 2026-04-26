package com.yourteam.blogservice.controller;

import com.yourteam.blogservice.entity.Article;
import com.yourteam.blogservice.services.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blog/articles")
@RequiredArgsConstructor
@CrossOrigin("*")
public class ArticleController {

    private final ArticleService articleService;

    @PostMapping("/category/{categoryId}")
    public ResponseEntity<Article> createArticle(@RequestBody Article article, @PathVariable Long categoryId) {
        return ResponseEntity.ok(articleService.createArticle(article, categoryId));
    }

    @GetMapping
    public ResponseEntity<List<Article>> getAllArticles() {
        return ResponseEntity.ok(articleService.getAllArticles());
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<Article>> getArticlesByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(articleService.getArticlesByCategory(categoryId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Article> updateArticle(@PathVariable Long id, @RequestBody Article article) {
        return ResponseEntity.ok(articleService.updateArticle(id, article));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id) {
        articleService.deleteArticle(id);
        return ResponseEntity.noContent().build();
    }
}
