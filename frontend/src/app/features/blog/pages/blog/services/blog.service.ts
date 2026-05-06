import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Article, Category, CategoryPerformance } from '../../../models/blog.model';
import { environment } from '../../../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class BlogService {
  // Appel via l'API Gateway (port 8089)
  private apiUrl = environment.apiUrl + '/blog-service/api/blog';

  constructor(private http: HttpClient) { }

  getCategoryPerformance(): Observable<CategoryPerformance[]> {
    return this.http.get<CategoryPerformance[]>(`${this.apiUrl}/stats/categories`).pipe(catchError(this.handleError));
  }

  getAllArticles(): Observable<Article[]> {
    return this.http.get<Article[]>(`${this.apiUrl}/articles`).pipe(catchError(this.handleError));
  }

  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`).pipe(catchError(this.handleError));
  }

  createArticle(article: Article, categoryId: number): Observable<Article> {
    const payload = {
      ...article,
      categoryId: categoryId
    };
    return this.http.post<Article>(`${this.apiUrl}/articles`, payload).pipe(catchError(this.handleError));
  }

  updateArticle(id: number, article: Article): Observable<Article> {
    return this.http.put<Article>(`${this.apiUrl}/articles/${id}`, article).pipe(catchError(this.handleError));
  }

  deleteArticle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/articles/${id}`).pipe(catchError(this.handleError));
  }

  addCategory(category: Category): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, category).pipe(catchError(this.handleError));
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categories/${id}`).pipe(catchError(this.handleError));
  }

  likeArticle(articleId: number): Observable<Article> {
    return this.http.post<Article>(`${this.apiUrl}/articles/${articleId}/like`, {});
  }

  dislikeArticle(articleId: number): Observable<Article> {
    return this.http.post<Article>(`${this.apiUrl}/articles/${articleId}/dislike`, {});
  }

  incrementViews(id: number): Observable<Article> {
    return this.http.post<Article>(`${this.apiUrl}/articles/${id}/view`, {});
  }

  getArticleSummary(articleId: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/articles/${articleId}/summary`, { responseType: 'text' }).pipe(catchError(this.handleError));
  }

  

  private handleError(error: any) {
    console.error('Blog Service Error:', error);
    return throwError(() => new Error('Erreur de communication avec le service Blog'));
  }
} 
