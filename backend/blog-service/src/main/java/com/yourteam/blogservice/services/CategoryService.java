package com.yourteam.blogservice.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.yourteam.blogservice.entity.Category;
import com.yourteam.blogservice.Repository.CategoryRepository;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;

    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie introuvable avec l'ID : " + id));
    }

    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }
}