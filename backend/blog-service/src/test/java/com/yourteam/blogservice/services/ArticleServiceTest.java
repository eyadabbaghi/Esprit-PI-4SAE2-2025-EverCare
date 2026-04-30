package com.yourteam.blogservice.services;

import com.yourteam.blogservice.Repository.ArticleLikeRepository;
import com.yourteam.blogservice.Repository.ArticleRepository;
import com.yourteam.blogservice.Repository.CategoryRepository;
import com.yourteam.blogservice.dto.CreateArticleRequest;
import com.yourteam.blogservice.entity.Article;
import com.yourteam.blogservice.entity.Category;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleServiceTest {

    @Mock
    private ArticleRepository articleRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ArticleLikeRepository likeRepository;

    @InjectMocks
    private ArticleService articleService;

    private Category sampleCategory;
    private Article sampleArticle;
    private CreateArticleRequest sampleRequest;
    private final String authorEmail = "alice@example.com";

    @BeforeEach
    void setUp() {
        sampleCategory = Category.builder()
                .id(1L)
                .name("Health")
                .totalArticles(0)
                .build();

        sampleArticle = Article.builder()
                .id(100L)
                .title("Understanding Alzheimer's")
                .content("Memory loss is a key symptom.")
                .viewCount(0)
                .likeCount(0)
                .build();

        sampleRequest = CreateArticleRequest.builder()
                .title("Understanding Alzheimer's")
                .content("Memory loss is a key symptom.")
                .categoryId(1L)
                .isPublished(true)
                .language("en")
                .readingTime(5)
                .build();
    }

    @Test
    @DisplayName("Création d'article : mood 'lost' et incrémentation du compteur catégorie")
    void createArticle_ShouldSetMoodAndIncrementCategoryCount() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(sampleCategory));
        when(articleRepository.save(any(Article.class))).thenAnswer(i -> i.getArguments()[0]);

        Article created = articleService.createArticle(sampleRequest, authorEmail);

        assertThat(created).isNotNull();
        assertThat(created.getMoods()).contains("lost");
        assertThat(created.getAuthorEmail()).isEqualTo(authorEmail);
        assertThat(sampleCategory.getTotalArticles()).isEqualTo(1);
        verify(categoryRepository).save(sampleCategory);
        verify(articleRepository).save(any(Article.class));
    }

    @Test
    @DisplayName("Like : n'incrémente pas si l'utilisateur a déjà liké")
    void likeArticle_ShouldNotIncrementIfAlreadyLiked() {
        when(articleRepository.findById(100L)).thenReturn(Optional.of(sampleArticle));
        when(likeRepository.existsByArticleIdAndUserEmail(100L, authorEmail)).thenReturn(true);
        when(articleRepository.save(any(Article.class))).thenReturn(sampleArticle);

        Article result = articleService.likeArticle(100L, authorEmail);

        assertThat(result.getLikeCount()).isZero();
        verify(likeRepository, never()).save(any());
        verify(articleRepository).save(sampleArticle);
    }

    @Test
    @DisplayName("Like : incrémente si l'utilisateur n'a pas encore liké")
    void likeArticle_ShouldIncrementWhenNotLiked() {
        when(articleRepository.findById(100L)).thenReturn(Optional.of(sampleArticle));
        when(likeRepository.existsByArticleIdAndUserEmail(100L, authorEmail)).thenReturn(false);
        when(articleRepository.save(any(Article.class))).thenReturn(sampleArticle);

        Article result = articleService.likeArticle(100L, authorEmail);

        assertThat(result.getLikeCount()).isEqualTo(1);
        verify(likeRepository).save(any());
        verify(articleRepository).save(sampleArticle);
    }

    @Test
    @DisplayName("Incrémentation des vues")
    void incrementViews_ShouldIncreaseCount() {
        when(articleRepository.findById(100L)).thenReturn(Optional.of(sampleArticle));
        when(articleRepository.save(any(Article.class))).thenAnswer(i -> i.getArguments()[0]);

        Article result = articleService.incrementViews(100L);

        assertThat(result.getViewCount()).isEqualTo(1);
        verify(articleRepository).save(any(Article.class));
    }

    @Test
    @DisplayName("Exception si la catégorie n'existe pas")
    void createArticle_ShouldThrowException_WhenCategoryNotFound() {
        CreateArticleRequest badRequest = CreateArticleRequest.builder()
                .title("Test")
                .content("Content")
                .categoryId(99L)
                .build();
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                articleService.createArticle(badRequest, authorEmail)
        );
        assertThat(exception.getMessage()).contains("Category not found");
    }

    @Test
    @DisplayName("Modification d'article : refusée si l'utilisateur n'est ni l'auteur ni admin")
    void updateArticle_ShouldThrowIfNotAuthorNorAdmin() {
        sampleArticle.setAuthorEmail("author@example.com");
        when(articleRepository.findById(100L)).thenReturn(Optional.of(sampleArticle));

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                articleService.updateArticle(100L, sampleArticle, "other@example.com", false)
        );
        assertThat(exception.getMessage()).contains("not allowed to modify");
    }

    @Test
    @DisplayName("Modification d'article : autorisée si l'utilisateur est l'auteur")
    void updateArticle_ShouldSucceedIfAuthor() {
        sampleArticle.setAuthorEmail("author@example.com");
        when(articleRepository.findById(100L)).thenReturn(Optional.of(sampleArticle));
        when(articleRepository.save(any(Article.class))).thenAnswer(i -> i.getArguments()[0]);

        Article updated = articleService.updateArticle(100L, sampleArticle, "author@example.com", false);

        assertThat(updated).isNotNull();
        verify(articleRepository).save(any(Article.class));
    }
}