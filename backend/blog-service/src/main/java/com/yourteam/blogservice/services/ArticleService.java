package com.yourteam.blogservice.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.yourteam.blogservice.entity.Article;
import com.yourteam.blogservice.entity.Category;
import com.yourteam.blogservice.Repository.ArticleRepository;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ArticleService {
    private final ArticleRepository articleRepository;
    private final CategoryService categoryService;

    public Article createArticle(Article article, Long categoryId) {
        Category category = categoryService.getCategoryById(categoryId);
        article.setCategory(category);
        article.setCreatedAt(LocalDateTime.now());

        // Mise à jour de la catégorie
        category.setTotalArticles(category.getTotalArticles() + 1);
        categoryService.createCategory(category);

        return articleRepository.save(article);
    }

    public List<Article> getArticlesByCategory(Long categoryId) {
        return articleRepository.findByCategoryId(categoryId);
    }

    public List<Article> getAllArticles() {
        return articleRepository.findAll();
    }

    public Article updateArticle(Long id, Article updatedArticle) {
        Article existingArticle = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Article introuvable"));
        existingArticle.setTitle(updatedArticle.getTitle());
        existingArticle.setContent(updatedArticle.getContent());
        existingArticle.setIsPublished(updatedArticle.getIsPublished());
        existingArticle.setLastUpdated(LocalDateTime.now());
        return articleRepository.save(existingArticle);
    }

    public void deleteArticle(Long id) {
        articleRepository.deleteById(id);
    }
}