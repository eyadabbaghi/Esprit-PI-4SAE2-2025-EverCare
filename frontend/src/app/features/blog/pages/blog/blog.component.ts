import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BlogService } from './services/blog.service';
import { Article, Category } from '../../models/blog.model';
import { AuthService } from '../../../front-office/pages/login/auth.service';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit, OnDestroy {
  @ViewChild('articleContent') articleContent!: ElementRef;

  articles: Article[] = [];
  categories: Category[] = [];
  filteredArticles: Article[] = [];
  selectedCategoryId: number | null = null;
  searchQuery: string = '';
  selectedArticle: Article | null = null;

  // --- Configuration des Moods ---
  selectedMoodId: string | null = null;
  moodOptions = [
    {
      id: 'stressed',
      label: 'Stressed',
      svgPath: 'M13 10V3L4 14h7v7l9-11h-7z',
      activeClass: 'bg-orange-50 border-orange-200 text-orange-600 shadow-xl shadow-orange-100'
    },
    {
      id: 'lost',
      label: 'Lost',
      svgPath: 'M12 21a9 9 0 100-18 9 9 0 000 18zm0-11l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z',
      activeClass: 'bg-blue-50 border-blue-200 text-blue-600 shadow-xl shadow-blue-100'
    },
    {
      id: 'calm',
      label: 'Calm',
      svgPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      activeClass: 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xl shadow-emerald-100'
    },
    {
      id: 'lonely',
      label: 'Lonely',
      svgPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      activeClass: 'bg-purple-50 border-purple-200 text-purple-600 shadow-xl shadow-purple-100'
    }
  ];

  likedArticles: number[] = [];
  viewedArticles: number[] = [];

  private readonly LIKE_KEY = 'evercare_user_likes';
  private readonly VIEW_KEY = 'evercare_user_views';

  isLiking: boolean = false;
  isExporting: boolean = false;
  isSpeaking: boolean = false;

  easyReadMode = false;
  summaryMap = new Map<number, string>();
  originalContentMap = new Map<number, string>();

  private utterance: SpeechSynthesisUtterance | null = null;
  currentWordRange = { start: 0, end: 0 };
  cleanContentForAudio: string = '';

  private pollingSubscription?: Subscription;
  private userSubscription?: Subscription;


  
  constructor(
    private blogService: BlogService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (isBrowser) {
      this.userSubscription = this.authService.currentUser$.subscribe(() => {
        this.loadStorageData();
      });
      this.startRealTimeUpdate();
    }
    this.loadCategories();
    this.loadArticles();
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) this.pollingSubscription.unsubscribe();
    if (this.userSubscription) this.userSubscription.unsubscribe();
    if (isPlatformBrowser(this.platformId)) {
      window.speechSynthesis.cancel();
    }
  }

  loadArticles(): void {
    this.blogService.getAllArticles().subscribe(data => {
      this.articles = data;
      this.applyFilters();
    });
  }

  loadCategories(): void {
    this.blogService.getAllCategories().subscribe(data => this.categories = data);
  }

  applyFilters(): void {
    let results = [...this.articles];

    if (this.selectedCategoryId) {
      results = results.filter(a => a.category?.id === this.selectedCategoryId);
    }

    if (this.selectedMoodId) {
      results = results.filter(a => {
        const moodsValue: any = a.moods;
        if (!moodsValue) return false;

        let moodsList: string[] = [];
        if (typeof moodsValue === 'string') {
          moodsList = moodsValue.toLowerCase().split(',').map(m => m.trim());
        } else if (Array.isArray(moodsValue)) {
          moodsList = moodsValue.map(m => String(m).toLowerCase().trim());
        }
        return moodsList.includes(this.selectedMoodId!.toLowerCase());
      });
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      results = results.filter(a =>
        a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
      );
    }

    this.filteredArticles = results;
    this.cdr.detectChanges();
  }

  filterByCategory(id: number | null): void {
    this.selectedCategoryId = id;
    this.applyFilters();
  }

  filterByMood(moodId: string | null): void {
    this.selectedMoodId = (this.selectedMoodId === moodId) ? null : moodId;
    this.applyFilters();
  }

  onSearch(): void {
    this.applyFilters();
  }

  toggleAudio(content: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentWordRange = { start: 0, end: 0 };
      this.cdr.detectChanges();
      return;
    }

    this.cleanContentForAudio = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    this.utterance = new SpeechSynthesisUtterance(this.cleanContentForAudio);
    this.utterance.lang = 'en-US';
    this.utterance.rate = 0.85;

    this.utterance.onboundary = (event: any) => {
      if (event.name === 'word') {
        this.currentWordRange = {
          start: event.charIndex,
          end: event.charIndex + event.charLength
        };
        this.cdr.detectChanges();
      }
    };

    this.utterance.onend = () => {
      this.isSpeaking = false;
      this.currentWordRange = { start: 0, end: 0 };
      this.cdr.detectChanges();
    };

    this.isSpeaking = true;
    window.speechSynthesis.speak(this.utterance);
  }

  highlightText(): string {
    const text = this.cleanContentForAudio;
    if (!this.isSpeaking || !this.currentWordRange.end || !text) {
      return text || (this.selectedArticle?.content || '');
    }
    const before = text.substring(0, this.currentWordRange.start);
    const word = text.substring(this.currentWordRange.start, this.currentWordRange.end);
    const after = text.substring(this.currentWordRange.end);
    return `${before}<b class="text-[#7C3AED] underline decoration-2 bg-purple-50">${word}</b>${after}`;
  }

  // MODIFICATION : utiliser l'email au lieu du userId
  private getUniqueLikeKey(email: string | undefined): string {
    return email ? `${this.LIKE_KEY}_${email}` : this.LIKE_KEY;
  }

  private loadStorageData(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (user && user.email) {
        const uniqueKey = this.getUniqueLikeKey(user.email);
        const savedLikes = localStorage.getItem(uniqueKey);
        try { this.likedArticles = savedLikes ? JSON.parse(savedLikes) : []; } catch (e) { this.likedArticles = []; }
      } else { this.likedArticles = []; }
      const savedViews = localStorage.getItem(this.VIEW_KEY);
      try { this.viewedArticles = savedViews ? JSON.parse(savedViews) : []; } catch (e) { this.viewedArticles = []; }
    });
  }

  private saveLikesToStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.authService.currentUser$.pipe(take(1)).subscribe(user => {
        if (user && user.email) {
          const uniqueKey = this.getUniqueLikeKey(user.email);
          localStorage.setItem(uniqueKey, JSON.stringify(this.likedArticles));
        }
      });
    }
  }

  onLike(event: Event, article: Article): void {
    event.stopPropagation();
    if (!article.id || this.isLiking) return;

    // Vérifier que l'utilisateur est connecté (token présent)
    if (!this.authService.getToken()) {
      alert("Please login to like this article.");
      return;
    }

    this.isLiking = true;
    const isCurrentlyLiked = this.isArticleLiked(article.id);
    const request = isCurrentlyLiked
      ? this.blogService.dislikeArticle(article.id!)
      : this.blogService.likeArticle(article.id!);

    request.subscribe({
      next: (updated) => {
        article.likeCount = updated.likeCount;
        if (isCurrentlyLiked) {
          this.likedArticles = this.likedArticles.filter(id => id !== article.id);
        } else {
          this.likedArticles.push(article.id!);
        }
        this.saveLikesToStorage();
        this.isLiking = false;
      },
      error: (err) => {
        console.error(err);
        this.isLiking = false;
        alert("Failed to update like. Please try again.");
      }
    });
  }

  isArticleLiked(articleId: number | undefined): boolean {
    return articleId ? this.likedArticles.includes(articleId) : false;
  }

  startRealTimeUpdate(): void {
    this.pollingSubscription = interval(5000).subscribe(() => {
      this.blogService.getAllArticles().subscribe({
        next: (serverData: Article[]) => this.syncData(serverData)
      });
    });
  }

  private syncData(serverData: Article[]): void {
    serverData.forEach(serverArt => {
      const localArt = this.articles.find(a => a.id === serverArt.id);
      if (localArt) {
        localArt.likeCount = serverArt.likeCount;
        localArt.viewCount = serverArt.viewCount;
        localArt.moods = serverArt.moods;
      }
    });
    this.applyFilters();
  }

  openDetail(article: Article): void {
    this.selectedArticle = article;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
      if (article.id && !this.viewedArticles.includes(article.id)) {
        this.viewedArticles.push(article.id);
        localStorage.setItem(this.VIEW_KEY, JSON.stringify(this.viewedArticles));
        this.blogService.incrementViews(article.id).subscribe({ next: (updated) => article.viewCount = updated.viewCount });
      }
    }
  }

  closeDetail(): void {
    this.selectedArticle = null;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'auto';
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentWordRange = { start: 0, end: 0 };
      this.cdr.detectChanges();
    }
  }

  getArticlesCountByCategory(id: number): number {
    return this.articles.filter(a => a.category?.id === id).length;
  }

  getCategoryPercentage(count: number): number {
    return this.articles.length ? (count / this.articles.length) * 100 : 0;
  }

  exportToPDF(): void {
    if (!isPlatformBrowser(this.platformId) || !this.articleContent) return;
    this.isExporting = true;
    // Solution : utiliser 'as any' pour éviter l'erreur de typage
    html2canvas(this.articleContent.nativeElement, { scale: 2, useCORS: true } as any).then((canvas: HTMLCanvasElement) => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 208, (canvas.height * 208) / canvas.width);
      pdf.save(`EverCare_Article_${this.selectedArticle?.id}.pdf`);
      this.isExporting = false;
    });
  }

  toggleEasyRead(article: Article) {
    const id = article.id!;
    if (!this.easyReadMode) {
      // Activer le mode facile
      if (this.summaryMap.has(id)) {
        this.switchToEasyMode(article, this.summaryMap.get(id)!);
      } else {
        this.blogService.getArticleSummary(id).subscribe({
          next: (summary) => {
            this.summaryMap.set(id, summary);
            this.switchToEasyMode(article, summary);
          },
          error: (err) => {
            console.error('Erreur chargement résumé', err);
            alert('Impossible de charger le résumé. Veuillez réessayer.');
          }
        });
      }
    } else {
      // Désactiver : restaurer le contenu original
      const original = this.originalContentMap.get(id) || article.content;
      article.content = original;
      this.easyReadMode = false;
      this.cdr.detectChanges();
    }
  }

  private switchToEasyMode(article: Article, summary: string) {
    if (!this.originalContentMap.has(article.id!)) {
      this.originalContentMap.set(article.id!, article.content);
    }
    article.content = summary;
    this.easyReadMode = true;
    this.cdr.detectChanges();
  }

  shareArticle(platform: string): void {
    if (!this.selectedArticle || !isPlatformBrowser(this.platformId)) return;

    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(this.selectedArticle.title);
    const text = encodeURIComponent(`I found this helpful article on EverCare: ${this.selectedArticle.title}`);

    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${text}%20${url}`;
        break;
      case 'native':
        if (navigator.share) {
          navigator.share({
            title: this.selectedArticle.title,
            text: `Check out this health article: ${this.selectedArticle.title}`,
            url: window.location.href
          }).catch(console.error);
          return;
        }
        break;
    }

    if (shareUrl) {
      const width = 600;
      const height = 450;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      window.open(
        shareUrl,
        'shareWindow',
        `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`
      );
    }
  }
} 
