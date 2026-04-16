import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BlogService } from '../../../blog/pages/blog/services/blog.service';
import { Article, Category, CategoryPerformance } from '../../../blog/models/blog.model';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-blog-admin',
  templateUrl: './blog-admin.component.html'
})
export class BlogAdminComponent implements OnInit, OnDestroy {
  articles: Article[] = [];
  categories: Category[] = [];
  categoryStats: CategoryPerformance[] = [];

  newCatName: string = '';
  showCatInput: boolean = false;
  showModal: boolean = false;
  isEditMode: boolean = false;
  currentArticleId: number | null = null;
  newArticle: any = this.initEmptyArticle();

  private pollingSubscription?: Subscription;

  constructor(
    private blogService: BlogService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.refreshData();
    if (isPlatformBrowser(this.platformId)) {
      this.startRealTimeUpdate();
    }
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) this.pollingSubscription.unsubscribe();
  }

  startRealTimeUpdate(): void {
    this.pollingSubscription = interval(10000).subscribe(() => {
      this.blogService.getAllArticles().subscribe(data => this.syncCounters(data));
      this.blogService.getCategoryPerformance().subscribe(stats => this.categoryStats = stats);
    });
  }

  private syncCounters(serverArticles: Article[]): void {
    serverArticles.forEach(serverArt => {
      const localArt = this.articles.find(a => a.id === serverArt.id);
      if (localArt) {
        localArt.likeCount = serverArt.likeCount;
        localArt.viewCount = serverArt.viewCount;
      }
    });
  }

  refreshData() {
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
    return this.articles.filter(a => a.category?.id === categoryId).length;
  }

  deleteArticle(id: number | undefined) {
    if (!id) return;
    if (confirm("Voulez-vous vraiment supprimer cet article ? Cette action supprimera également tous les likes associés.")) {
      this.blogService.deleteArticle(id).subscribe({
        next: () => {
          // Mise à jour locale immédiate pour la fluidité
          this.articles = this.articles.filter(a => a.id !== id);
          // Rafraîchissement global des compteurs et stats
          this.refreshData();
        },
        error: (err) => {
          console.error("Erreur suppression:", err);
          alert("Impossible de supprimer l'article. Vérifiez les logs serveurs.");
        }
      });
    }
  }

  // --- CRUD Catégories ---
  addCategory() {
    if (!this.newCatName.trim()) return;
    this.blogService.addCategory({ name: this.newCatName } as Category).subscribe(() => {
      this.refreshData();
      this.newCatName = '';
      this.showCatInput = false;
    });
  }

  deleteCategory(id: number) {
    if (confirm("Supprimer cette catégorie ?")) {
      this.blogService.deleteCategory(id).subscribe(() => this.refreshData());
    }
  }

  // --- Modal Logic ---
  private initEmptyArticle() {
    return { title: '', content: '', coverImageUrl: '', language: 'fr', readingTime: 5, categoryId: null, isPublished: true };
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentArticleId = null;
    this.newArticle = this.initEmptyArticle();
    this.showModal = true;
  }

  openEditModal(article: Article) {
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

  handleSave() {
    if (!this.newArticle.categoryId) return alert("Veuillez choisir une catégorie");
    const obs = this.isEditMode && this.currentArticleId
      ? this.blogService.updateArticle(this.currentArticleId, this.newArticle)
      : this.blogService.createArticle(this.newArticle, this.newArticle.categoryId);

    obs.subscribe(() => {
      this.refreshData();
      this.showModal = false;
    });
  }
}
