package com.yourteam.blogservice.services;

import com.yourteam.blogservice.Repository.ArticleLikeRepository;
import com.yourteam.blogservice.dto.CategoryPerformanceDTO;
import com.yourteam.blogservice.dto.CreateArticleRequest;
import com.yourteam.blogservice.dto.NotificationRequest;
import com.yourteam.blogservice.entity.ArticleLike;
import com.yourteam.blogservice.entity.Article;
import com.yourteam.blogservice.entity.Category;
import com.yourteam.blogservice.Repository.ArticleRepository;
import com.yourteam.blogservice.Repository.CategoryRepository;
import com.yourteam.blogservice.client.NotificationServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final CategoryRepository categoryRepository;
    private final ArticleLikeRepository likeRepository;
    private final SummaryService summaryService;
    private final NotificationServiceClient notificationServiceClient;

    private String performAutoTagging(String title, String content) {
        List<String> moods = new ArrayList<>();
        String text = (title + " " + content).toLowerCase();
        if (text.contains("memory") || text.contains("alzheimer") || text.contains("thinking") ||
                text.contains("confusion") || text.contains("cognitive") || text.contains("skills")) {
            moods.add("lost");
        }
        if (text.contains("agitation") || text.contains("behavior") || text.contains("decline") ||
                text.contains("disrupts") || text.contains("challenges") || text.contains("trouble")) {
            moods.add("stressed");
        }
        if (text.contains("sleep") || text.contains("diet") || text.contains("peaceful") ||
                text.contains("wellness") || text.contains("health") || text.contains("food") || text.contains("vegetables")) {
            moods.add("calm");
        }
        if (text.contains("caregiver") || text.contains("support") || text.contains("person") ||
                text.contains("social") || text.contains("community")) {
            moods.add("lonely");
        }
        return moods.isEmpty() ? "calm" : String.join(",", moods);
    }

    @Transactional
    public Article createArticle(CreateArticleRequest request, String authorEmail) {
        Long categoryId = request.getCategoryId();
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found with ID: " + categoryId));
        
        Article article = Article.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .coverImageUrl(request.getCoverImageUrl())
                .language(request.getLanguage())
                .readingTime(request.getReadingTime())
                .isPublished(request.getIsPublished() != null ? request.getIsPublished() : true)
                .build();
        
        category.setTotalArticles((category.getTotalArticles() == null ? 0 : category.getTotalArticles()) + 1);
        categoryRepository.save(category);
        article.setMoods(performAutoTagging(article.getTitle(), article.getContent()));
        article.setCategory(category);
        article.setAuthorEmail(authorEmail);
        article.setLastModifiedByEmail(authorEmail);
        Article savedArticle = articleRepository.save(article);

        // Send an explicit blog notification so the frontend can route it correctly.
        try {
            NotificationRequest notif = new NotificationRequest();
            notif.setActivityId(String.valueOf(savedArticle.getId()));
            notif.setAction("BLOG_CREATED");
            notif.setDetails("New blog article: " + savedArticle.getTitle());
            // notif.setTargetUserIds(null); // null = tous les utilisateurs
            notificationServiceClient.sendNotification(notif);
            log.info("Notification in-app envoyée pour l'article ID {}", savedArticle.getId());
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de la notification in-app : {}", e.getMessage());
        }

        return savedArticle;
    }

    public List<Article> getArticlesByCategory(Long categoryId) {
        return articleRepository.findByCategoryId(categoryId);
    }

    public List<Article> getAllArticles() {
        return articleRepository.findAll();
    }

    @Transactional
    public Article updateArticle(Long id, Article updatedArticle, String currentUserEmail, boolean isAdmin) {
        Article existingArticle = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Article not found"));
        // Vérification des droits
        if (!existingArticle.getAuthorEmail().equals(currentUserEmail) && !isAdmin) {
            throw new RuntimeException("You are not allowed to modify this article");
        }
        existingArticle.setTitle(updatedArticle.getTitle());
        existingArticle.setContent(updatedArticle.getContent());
        existingArticle.setCoverImageUrl(updatedArticle.getCoverImageUrl());
        existingArticle.setIsPublished(updatedArticle.getIsPublished());
        existingArticle.setLastUpdated(LocalDateTime.now());
        existingArticle.setLastModifiedByEmail(currentUserEmail);
        existingArticle.setMoods(performAutoTagging(updatedArticle.getTitle(), updatedArticle.getContent()));
        if (updatedArticle.getCategory() != null &&
                (existingArticle.getCategory() == null || !existingArticle.getCategory().getId().equals(updatedArticle.getCategory().getId()))) {
            if (existingArticle.getCategory() != null) {
                Category oldCat = existingArticle.getCategory();
                oldCat.setTotalArticles(Math.max(0, (oldCat.getTotalArticles() == null ? 0 : oldCat.getTotalArticles()) - 1));
                categoryRepository.save(oldCat);
            }
            Category newCat = categoryRepository.findById(updatedArticle.getCategory().getId())
                    .orElseThrow(() -> new RuntimeException("New category not found"));
            newCat.setTotalArticles((newCat.getTotalArticles() == null ? 0 : newCat.getTotalArticles()) + 1);
            categoryRepository.save(newCat);
            existingArticle.setCategory(newCat);
        }
        return articleRepository.save(existingArticle);
    }

    @Transactional
    public void deleteArticle(Long id, String currentUserEmail, boolean isAdmin) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Article not found"));
        if (!article.getAuthorEmail().equals(currentUserEmail) && !isAdmin) {
            throw new RuntimeException("You are not allowed to delete this article");
        }
        likeRepository.deleteByArticleId(id);
        if (article.getCategory() != null) {
            Category cat = article.getCategory();
            cat.setTotalArticles(Math.max(0, (cat.getTotalArticles() == null ? 0 : cat.getTotalArticles()) - 1));
            categoryRepository.save(cat);
        }
        articleRepository.delete(article);
    }

    @Transactional
    public Article likeArticle(Long articleId, String userEmail) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new RuntimeException("Article not found"));
        if (!likeRepository.existsByArticleIdAndUserEmail(articleId, userEmail)) {
            ArticleLike like = ArticleLike.builder()
                    .article(article)
                    .userEmail(userEmail)
                    .build();
            likeRepository.save(like);
            article.setLikeCount((article.getLikeCount() == null ? 0 : article.getLikeCount()) + 1);
        }
        return articleRepository.save(article);
    }

    @Transactional
    public Article dislikeArticle(Long articleId, String userEmail) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new RuntimeException("Article not found"));
        likeRepository.findByArticleIdAndUserEmail(articleId, userEmail).ifPresent(like -> {
            likeRepository.delete(like);
            article.setLikeCount(Math.max(0, (article.getLikeCount() == null ? 0 : article.getLikeCount()) - 1));
        });
        return articleRepository.save(article);
    }

    @Transactional
    public Article incrementViews(Long id) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Article not found"));
        article.setViewCount((article.getViewCount() == null ? 0 : article.getViewCount()) + 1);
        return articleRepository.save(article);
    }

    public List<CategoryPerformanceDTO> getCategoryStats() {
        return articleRepository.getCategoryPerformanceReport();
    }

    @Transactional
    public String getOrGenerateSummary(Long articleId) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new RuntimeException("Article not found with id: " + articleId));
        if (article.getEasySummary() != null && !article.getEasySummary().isEmpty()) {
            return article.getEasySummary();
        }
        String summary = summaryService.generateSummary(article.getContent());
        if (summary != null && !summary.isEmpty()) {
            article.setEasySummary(summary);
            articleRepository.save(article);
            return summary;
        }
        return "Summary temporarily unavailable. Please try again later.";
    }
}
