import { CognitiveGame, CognitiveGameType } from '../models/cognitive-stimulation.model';

export interface GameMediaDescriptor {
  imageUrl: string;
  themeClass: string;
  spotlightLabel: string;
  helperText: string;
  supportTitle: string;
}

const MEDIA_BY_TYPE: Record<CognitiveGameType, GameMediaDescriptor> = {
  MEMORY: {
    imageUrl: '/cognitive-games/memory.svg',
    themeClass: 'memory-theme',
    spotlightLabel: 'Memory Focus',
    helperText: 'Gentle recall with familiar shapes and everyday anchors.',
    supportTitle: 'Short-term memory stimulation',
  },
  LANGUAGE: {
    imageUrl: '/cognitive-games/language.svg',
    themeClass: 'language-theme',
    spotlightLabel: 'Language Focus',
    helperText: 'Clear words, naming cues, and sentence recognition.',
    supportTitle: 'Verbal comprehension exercise',
  },
  LOGIC: {
    imageUrl: '/cognitive-games/logic.svg',
    themeClass: 'logic-theme',
    spotlightLabel: 'Logic Focus',
    helperText: 'Pattern recognition and simple reasoning pathways.',
    supportTitle: 'Structured reasoning activity',
  },
  ATTENTION: {
    imageUrl: '/cognitive-games/attention.svg',
    themeClass: 'attention-theme',
    spotlightLabel: 'Attention Focus',
    helperText: 'Visual concentration with calm, low-noise prompts.',
    supportTitle: 'Selective attention training',
  },
  PRAXIS: {
    imageUrl: '/cognitive-games/praxis.svg',
    themeClass: 'praxis-theme',
    spotlightLabel: 'Praxis Focus',
    helperText: 'Action sequencing inspired by everyday gestures.',
    supportTitle: 'Daily movement planning',
  },
  GNOSIS: {
    imageUrl: '/cognitive-games/gnosis.svg',
    themeClass: 'gnosis-theme',
    spotlightLabel: 'Recognition Focus',
    helperText: 'Identification of familiar objects and visual cues.',
    supportTitle: 'Object recognition support',
  },
};

export function getGameMedia(gameOrType: CognitiveGame | CognitiveGameType | null | undefined): GameMediaDescriptor {
  if (!gameOrType) {
    return MEDIA_BY_TYPE.MEMORY;
  }

  const type = typeof gameOrType === 'string' ? gameOrType : gameOrType.gameType;
  return MEDIA_BY_TYPE[type] ?? MEDIA_BY_TYPE.MEMORY;
}
