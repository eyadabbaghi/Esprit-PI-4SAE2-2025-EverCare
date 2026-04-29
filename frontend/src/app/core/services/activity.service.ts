import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Activity (global)
export interface Activity {
  id: string;
  name: string;
  type: string; // e.g., "Relaxation"
  duration: number;
  scheduledTime?: string;
  description: string;
  imageUrl: string;
  rating: number;
  totalRatings: number;
  doctorSuggested: boolean;
  location?: string;
  startTime?: string;
  monitoredBy?: string;
}

// ActivityDetails (per activity details)
export interface ActivityDetails {
  id: string;
  activityId: string;
  instructions: string[];
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  recommendedStage: ('Early' | 'Moderate' | 'Advanced')[];
  frequency: string;
  supervision: string;
  benefits: string[];
  precautions: string[];
}

// Combined for front-office
// ... after ActivityDetails interface

export interface ActivityWithUserData {
  // Activity fields
  id: string;
  name: string;
  type: string;
  duration: number;
  scheduledTime?: string;
  description: string;
  imageUrl: string;
  rating: number;
  totalRatings: number;
  doctorSuggested: boolean;
  location?: string;
  startTime?: string;
  monitoredBy?: string;
  detailsId?: string;   
  recommendedByDoctor?: boolean;    
  doctorName?: string;
  doctorPicture?: string;     // <-- add this


  // Detail fields
  instructions: string[];
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  recommendedStage: ('Early' | 'Moderate' | 'Advanced')[];
  frequency: string;
  supervision: string;
  benefits: string[];
  precautions: string[];

  // User-specific
  completed: boolean;
  favorite: boolean;
  userRating: number | null;
  completedAt?: string;
}

// Requests
export interface CreateActivityRequest {
  name: string;
  type: string;
  duration: number;
  scheduledTime?: string;
  description: string;
  imageUrl: string;
  doctorSuggested: boolean;
  location?: string;
  startTime?: string;
  monitoredBy?: string;
}

export interface UpdateActivityRequest {
  name?: string;
  type?: string;
  duration?: number;
  scheduledTime?: string;
  description?: string;
  imageUrl?: string;
  doctorSuggested?: boolean;
  location?: string;
  startTime?: string;
  monitoredBy?: string;
}

export interface CreateActivityDetailsRequest {
  activityId: string;
  instructions: string[];
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  recommendedStage: ('Early' | 'Moderate' | 'Advanced')[];
  frequency: string;
  supervision: string;
  benefits: string[];
  precautions: string[];
}

export interface UpdateActivityDetailsRequest {
  instructions?: string[];
  difficulty?: 'Easy' | 'Moderate' | 'Challenging';
  recommendedStage?: ('Early' | 'Moderate' | 'Advanced')[];
  frequency?: string;
  supervision?: string;
  benefits?: string[];
  precautions?: string[];
}
export interface ActivityWithDetails extends Activity {
  instructions: string[];
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  recommendedStage: ('Early' | 'Moderate' | 'Advanced')[];
  frequency: string;
  supervision: string;
  benefits: string[];
  precautions: string[];
  detailsId?: string;                      // <-- add this

}
@Injectable({
  providedIn: 'root'
})
export class ActivityService {
 // private apiUrl = 'http://localhost:8092/EverCare'; // direct to microservice
  // New gateway URL
  public apiUrl = 'http://localhost:8089/EverCare';

  constructor(private http: HttpClient) {}

  // ----- Activity CRUD -----
  getAllActivities(): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.apiUrl}/admin/activities`);
  }

  getActivityById(id: string): Observable<Activity> {
    return this.http.get<Activity>(`${this.apiUrl}/admin/activities/${id}`);
  }

  createActivity(activity: CreateActivityRequest): Observable<Activity> {
    return this.http.post<Activity>(`${this.apiUrl}/admin/activities`, activity);
  }

  updateActivity(id: string, activity: UpdateActivityRequest): Observable<Activity> {
    return this.http.put<Activity>(`${this.apiUrl}/admin/activities/${id}`, activity);
  }

  deleteActivity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/activities/${id}`);
  }

  // ----- ActivityDetails CRUD -----
  getDetailsByActivityId(activityId: string): Observable<ActivityDetails[]> {
    return this.http.get<ActivityDetails[]>(`${this.apiUrl}/admin/activity-details/activity/${activityId}`);
  }

  getDetailsById(id: string): Observable<ActivityDetails> {
    return this.http.get<ActivityDetails>(`${this.apiUrl}/admin/activity-details/${id}`);
  }

  createDetails(details: CreateActivityDetailsRequest): Observable<ActivityDetails> {
    return this.http.post<ActivityDetails>(`${this.apiUrl}/admin/activity-details`, details);
  }

  updateDetails(id: string, details: UpdateActivityDetailsRequest): Observable<ActivityDetails> {
    return this.http.put<ActivityDetails>(`${this.apiUrl}/admin/activity-details/${id}`, details);
  }

  deleteDetails(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/activity-details/${id}`);
  }

  // ----- Front-office -----
  getActivitiesForUser(userId: string): Observable<ActivityWithUserData[]> {
    return this.http.get<ActivityWithUserData[]>(`${this.apiUrl}/activities/user/${userId}`);
  }

  getActivityForUser(userId: string, activityId: string): Observable<ActivityWithUserData> {
    return this.http.get<ActivityWithUserData>(`${this.apiUrl}/activities/user/${userId}/activity/${activityId}`);
  }

  markCompleted(userId: string, activityId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/activities/user/${userId}/activity/${activityId}/complete`, {});
  }

  toggleFavorite(userId: string, activityId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/activities/user/${userId}/activity/${activityId}/favorite`, {});
  }

  rateActivity(userId: string, activityId: string, rating: number): Observable<Activity> {
    return this.http.post<Activity>(`${this.apiUrl}/activities/user/${userId}/activity/${activityId}/rate?rating=${rating}`, {});
  }

  // In activity.service.ts

uploadImage(file: File): Observable<string> {
  const formData = new FormData();
  formData.append('file', file);
  return this.http.post<string>(`${this.apiUrl}/admin/uploads/image`, formData, {
    responseType: 'text' as 'json'  // Because server returns plain text URL
  });
}



// Translate an activity (returns translated fields)
translateActivity(activityId: string, targetLang: string = 'fr'): Observable<any> {
  return this.http.post(`${this.apiUrl}/activities/translate/${activityId}`, { targetLang });
}

// Summarize an activity (returns plain text)
summarizeActivity(activityId: string): Observable<string> {
  return this.http.get(`${this.apiUrl}/activities/summarize/${activityId}`, { responseType: 'text' });
}

recommendActivity(doctorId: string, patientId: string, activityId: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/activities/recommend`, { doctorId, patientId, activityId });
}
}