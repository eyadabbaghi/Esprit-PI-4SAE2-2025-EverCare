package com.yourteam.blogservice.services;



import com.yourteam.blogservice.Repository.CategoryRepository;
import com.yourteam.blogservice.entity.Category;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryService categoryService;

    private Category sampleCategory;

    @BeforeEach
    void setUp() {
        sampleCategory = Category.builder()
                .id(1L)
                .name("Health")
                .description("Health related articles")
                .totalArticles(0)
                .build();
    }

    @Test
    @DisplayName("Création d'une catégorie")
    void createCategory_ShouldSaveAndReturnCategory() {
        when(categoryRepository.save(any(Category.class))).thenReturn(sampleCategory);

        Category created = categoryService.createCategory(sampleCategory);

        assertThat(created).isNotNull();
        assertThat(created.getId()).isEqualTo(1L);
        assertThat(created.getName()).isEqualTo("Health");
        verify(categoryRepository).save(sampleCategory);
    }

    @Test
    @DisplayName("Récupération de toutes les catégories")
    void getAllCategories_ShouldReturnList() {
        when(categoryRepository.findAll()).thenReturn(List.of(sampleCategory));

        List<Category> categories = categoryService.getAllCategories();

        assertThat(categories).hasSize(1);
        assertThat(categories.get(0).getName()).isEqualTo("Health");
        verify(categoryRepository).findAll();
    }

    @Test
    @DisplayName("Récupération d'une catégorie par ID - succès")
    void getCategoryById_ShouldReturnCategory() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(sampleCategory));

        Category found = categoryService.getCategoryById(1L);

        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo(1L);
        verify(categoryRepository).findById(1L);
    }

    @Test
    @DisplayName("Récupération d'une catégorie par ID - introuvable")
    void getCategoryById_ShouldThrowExceptionWhenNotFound() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> categoryService.getCategoryById(99L));
        assertThat(exception.getMessage()).contains("Catégorie introuvable");
    }

    @Test
    @DisplayName("Suppression d'une catégorie")
    void deleteCategory_ShouldCallRepositoryDelete() {
        doNothing().when(categoryRepository).deleteById(1L);

        categoryService.deleteCategory(1L);

        verify(categoryRepository).deleteById(1L);
    }
}
