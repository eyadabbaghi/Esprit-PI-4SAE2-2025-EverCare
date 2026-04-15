package com.yourteam.blogservice.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.yourteam.blogservice.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {
}