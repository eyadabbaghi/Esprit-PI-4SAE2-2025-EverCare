export interface RecentPatient {
  id: string;
  name: string;
  photo: string;
  lastVisit: Date;
  nextVisit: Date;
  alzheimerStage: 'LEGER' | 'MODERE' | 'AVANCE';
}
