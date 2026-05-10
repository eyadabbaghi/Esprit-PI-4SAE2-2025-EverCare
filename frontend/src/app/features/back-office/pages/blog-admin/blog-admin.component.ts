import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';
import { Article, Category, CategoryPerformance } from '../../../blog/models/blog.model';
import { BlogService } from '../../../blog/pages/blog/services/blog.service';

@Component({
  selector: 'app-blog-admin',
  templateUrl: './blog-admin.component.html'
})
export class BlogAdminComponent implements OnInit, OnDestroy {
  articles: Article[] = [];
  categories: Category[] = [];
  categoryStats: CategoryPerformance[] = [];

  newCatName = '';
  showCatInput = false;
  showModal = false;
  isEditMode = false;
  currentArticleId: number | null = null;
  newArticle: any = this.initEmptyArticle();

  private pollingSubscription?: Subscription;

  constructor(
    private blogService: BlogService,
    private feedback: AppFeedbackService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.refreshData();
    if (isPlatformBrowser(this.platformId)) {
      this.startRealTimeUpdate();
    }
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  startRealTimeUpdate(): void {
    this.pollingSubscription = interval(10000).subscribe(() => {
      this.blogService.getAllArticles().subscribe(data => this.syncCounters(data));
      this.blogService.getCategoryPerformance().subscribe(stats => this.categoryStats = stats);
    });
  }

  refreshData(): void {
    this.blogService.getAllArticles().subscribe(data => {
      this.articles = data;
    });
    this.blogService.getAllCategories().subscribe(data => {
      this.categories = data;
    });
    this.blogService.getCategoryPerformance().subscribe(stats => {
      this.categoryStats = stats;
    });
  }

  getArticlesCountByCategory(categoryId: number): number {
    return this.articles.filter(article => article.category?.id === categoryId).length;
  }

  async deleteArticle(id: number | undefined): Promise<void> {
    if (!id) {
      return;
    }

    const confirmed = await this.feedback.confirm({
      title: 'Delete article?',
      message: 'This will also remove the likes associated with this article.',
      confirmText: 'Delete article',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.blogService.deleteArticle(id).subscribe({
      next: () => {
        this.articles = this.articles.filter(article => article.id !== id);
        this.refreshData();
        this.feedback.success('Article deleted successfully.', 'Blog updated');
      },
      error: (err) => {
        console.error('Article deletion failed:', err);
        this.feedback.error('Unable to delete this article right now.', 'Delete failed');
      }
    });
  }

  addCategory(): void {
    if (!this.newCatName.trim()) {
      return;
    }

    this.blogService.addCategory({ name: this.newCatName } as Category).subscribe(() => {
      this.refreshData();
      this.newCatName = '';
      this.showCatInput = false;
      this.feedback.success('Category added successfully.', 'Blog updated');
    });
  }

  async deleteCategory(id: number): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Delete category?',
      message: 'Articles assigned to this category may need to be reviewed after deletion.',
      confirmText: 'Delete category',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.blogService.deleteCategory(id).subscribe(() => {
      this.refreshData();
      this.feedback.success('Category deleted successfully.', 'Blog updated');
    });
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.currentArticleId = null;
    this.newArticle = this.initEmptyArticle();
    this.showModal = true;
  }

  openEditModal(article: Article): void {
    this.isEditMode = true;
    this.currentArticleId = article.id || null;
    this.newArticle = {
      title: article.title,
      content: article.content,
      coverImageUrl: article.coverImageUrl,
      language: article.language,
      readingTime: article.readingTime,
      categoryId: article.category?.id,
      isPublished: article.isPublished
    };
    this.showModal = true;
  }

  handleSave(): void {
    if (!this.newArticle.categoryId) {
      this.feedback.warning('Please choose a category before saving the article.', 'Category required');
      return;
    }

    const wasEdit = this.isEditMode && !!this.currentArticleId;
    const request = this.isEditMode && this.currentArticleId
      ? this.blogService.updateArticle(this.currentArticleId, this.newArticle)
      : this.blogService.createArticle(this.newArticle, this.newArticle.categoryId);

    request.subscribe(() => {
      this.refreshData();
      this.showModal = false;
      this.feedback.success(
        `"${this.newArticle.title}" was ${wasEdit ? 'updated' : 'created'} successfully.`,
        wasEdit ? 'Article updated' : 'Article created'
      );
    });
  }

  private syncCounters(serverArticles: Article[]): void {
    serverArticles.forEach(serverArticle => {
      const localArticle = this.articles.find(article => article.id === serverArticle.id);
      if (localArticle) {
        localArticle.likeCount = serverArticle.likeCount;
        localArticle.viewCount = serverArticle.viewCount;
      }
    });
  }

  private initEmptyArticle() {
    return {
      title: '',
      content: '',
      coverImageUrl: '',
      language: 'fr',
      readingTime: 5,
      categoryId: null,
      isPublished: true
    };
  }
}
