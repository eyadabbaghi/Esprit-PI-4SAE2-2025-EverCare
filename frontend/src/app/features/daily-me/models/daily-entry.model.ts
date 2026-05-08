export interface DailyEntry {
  id?: number;
  patientId: string;
  entryDate: string;
  dailyEmotion: string;
  notes?: string;

  // ✅ new field
  entryDateTime?: string;
}