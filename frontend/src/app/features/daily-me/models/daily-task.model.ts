export interface DailyTask {
  id?: number;
  patientId: string;
  title: string;
  taskType: string;
  scheduledTime: string;
  notes?: string;
  completed: boolean;

  // ✅ new from backend
  archived?: boolean;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}