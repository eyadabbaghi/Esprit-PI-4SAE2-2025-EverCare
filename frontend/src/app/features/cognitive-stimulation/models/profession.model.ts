export interface Profession {
  id: string;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  specializedDomains: string[];
  requiredSkills: string[];
  recommendedGames: string[];
  color: string;
}

export const ADVANCED_PROFESSIONS: Profession[] = [
  {
    id: 'neuropsychologist',
    name: 'Neuropsychologue',
    description: 'Spécialiste évaluation cognitive avancée & suivi longitudinal',
    level: 'advanced',
    icon: '🧠',
    specializedDomains: ['memory', 'attention', 'executive', 'spatial'],
    requiredSkills: ['MMSE', 'MoCA', 'CDR', 'neuropsycho-battery'],
    recommendedGames: ['n-back-3', 'stroop-advanced', 'trail-making-b', 'clock-drawing'],
    color: '#8B008B'
  },
  {
    id: 'geriatrician',
    name: 'Gériatre',
    description: 'Gestion complète déclin cognitif multimorbide',
    level: 'advanced',
    icon: '👴',
    specializedDomains: ['memory', 'executive', 'global-cognition'],
    requiredSkills: ['FAST scale', 'NPI', 'pharmacovigilance', 'multidisciplinary'],
    recommendedGames: ['dual-task', 'inhibitory-control', 'working-memory-load'],
    color: '#4169E1'
  },
  {
    id: 'neurologist',
    name: 'Neurologue',
    description: 'Diagnostic différentiel & suivi neuropathologique',
    level: 'advanced',
    icon: '🧬',
    specializedDomains: ['executive', 'spatial', 'memory', 'language'],
    requiredSkills: ['IRM/MRI', 'EEG', 'biomarqueurs', 'lévy-body-diff'],
    recommendedGames: ['visuo-spatial-complex', 'semantic-fluency', 'phonemic-fluency'],
    color: '#FF4500'
  },
  {
    id: 'cognitive-therapist',
    name: 'Thérapeute Cognitif',
    description: 'Rééducation cognitive structurée & protocoles thérapeutiques',
    level: 'advanced',
    icon: '⚕️',
    specializedDomains: ['attention', 'memory', 'executive'],
    requiredSkills: ['CST', 'CT', 'errorless-learning', 'spaced-retrieval'],
    recommendedGames: ['adaptive-n-back', 'errorless-memory', 'spaced-repetition'],
    color: '#32CD32'
  }
];

export const ALL_PROFESSIONS = [
  ...ADVANCED_PROFESSIONS,
  {
    id: 'nurse',
    name: 'Infirmier/ère',
    description: 'Suivi quotidien & alerte détection',
    level: 'intermediate',
    icon: '👩‍⚕️',
    specializedDomains: ['global-cognition', 'attention'],
    requiredSkills: ['vital-signs', 'mood-tracking'],
    recommendedGames: ['simple-attention', 'memory-basics'],
    color: '#1E90FF'
  },
  {
    id: 'caregiver',
    name: 'Aidant Familial',
    description: 'Support quotidien & stimulation légère',
    level: 'beginner',
    icon: '❤️',
    specializedDomains: ['memory', 'mood'],
    requiredSkills: ['patience', 'observation'],
    recommendedGames: ['word-search', 'matching-colors'],
    color: '#FF69B4'
  }
];

