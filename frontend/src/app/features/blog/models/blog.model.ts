
export interface CategoryPerformance {
  categoryName: string;
  articleCount: number;
  totalViews: number;
  averageLikes: number;
  engagementRate: number;
}



export interface Category {
  id: number;
  name: string;
  description: string;
  totalArticles: number;
  viewCount: number;
  createdAt?: Date;

}

export interface Article {
  id?: number;
  title: string;
  content: string;
  coverImageUrl: string;
  language: string;
  readingTime: number;
  viewCount: number;
  likeCount: number;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt?: Date;
  lastUpdated?: Date;
  authorEmail?: string;
  lastModifiedByEmail?: string;
  category?: Category; // Pour la lecture
  categoryId?: number; // Pour la création (envoyé au backend)
  moods?: string[];
}
