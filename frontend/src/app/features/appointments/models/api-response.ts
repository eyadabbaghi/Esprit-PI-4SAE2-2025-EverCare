export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  status: number;
  timestamp: Date;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
