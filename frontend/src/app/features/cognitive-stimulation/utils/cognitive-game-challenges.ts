import { CognitiveGame } from '../models/cognitive-stimulation.model';

export interface CognitiveChallenge {
  intro: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  memoryPreview?: string[];
  memoryDeck?: string[];
}

export function buildCognitiveChallenge(game: CognitiveGame): CognitiveChallenge {
  const title = game.title.trim().toLowerCase();

  switch (title) {
    case 'visual memory association':
      return {
        intro: 'Memorize the items below for a few seconds, then find each pair.',
        memoryPreview: ['Apple', 'Key', 'Book', 'Watch'],
        memoryDeck: ['Apple', 'Key', 'Book', 'Watch'],
        prompt: 'Turn over the cards and rebuild all memorized pairs.',
        options: [],
        correctAnswer: 'Match all pairs',
        explanation: 'You rebuilt the memorized set by finding every pair.',
      };
    case 'daily memories':
      return {
        intro: 'Find the pairs of everyday objects.',
        memoryPreview: ['Brush', 'Cup', 'Key', 'Soap'],
        memoryDeck: ['Brush', 'Cup', 'Key', 'Soap'],
        prompt: 'Match identical cards to rebuild the everyday routine.',
        options: [],
        correctAnswer: 'Match all pairs',
        explanation: 'Familiar objects reinforce everyday orientation.',
      };
    case 'list to remember':
      return {
        intro: 'Memorize the list before turning over the cards.',
        memoryPreview: ['Bread', 'Milk', 'Orange', 'Newspaper'],
        memoryDeck: ['Bread', 'Milk', 'Orange', 'Newspaper'],
        prompt: 'Find each word from the list by making the correct pairs.',
        options: [],
        correctAnswer: 'Match all pairs',
        explanation: 'Each recovered pair confirms a remembered item.',
      };
    case 'missing word':
      return {
        intro: 'Choose the word that correctly completes the sentence.',
        prompt: 'Every morning, I drink a cup of ____.',
        options: ['Coffee', 'Shoe', 'Window', 'Music'],
        correctAnswer: 'Coffee',
        explanation: 'The correct sentence is: I drink a cup of coffee.',
      };
    case 'word categories':
      return {
        intro: 'Identify the item that does not belong with the others.',
        prompt: 'Which word is not part of the fruit category?',
        options: ['Apple', 'Banana', 'Carrot', 'Orange'],
        correctAnswer: 'Carrot',
        explanation: 'Carrot is a vegetable, not a fruit.',
      };
    case 'instruction comprehension':
      return {
        intro: 'Read or listen to the instruction, then choose the correct action.',
        prompt: 'Which action matches the instruction: take the glass, then point to the door?',
        options: [
          'Point to the door, then take the glass',
          'Take the glass, then point to the door',
          'Take the door, then point to the glass',
          'Do nothing'
        ],
        correctAnswer: 'Take the glass, then point to the door',
        explanation: 'The order of the instruction must be respected.',
      };
    case 'logical image sequence':
      return {
        intro: 'Identify the logic in the proposed sequence.',
        prompt: 'Which value completes the sequence 2 - 4 - 6 - 8 - ?',
        options: ['9', '10', '12', '14'],
        correctAnswer: '10',
        explanation: 'The sequence increases by 2 at each step.',
      };
    case 'smallest to largest ordering':
      return {
        intro: 'Choose the requested logical order.',
        prompt: 'What is the correct order from smallest to largest?',
        options: [
          'Fly -> Cat -> Elephant',
          'Elephant -> Cat -> Fly',
          'Cat -> Fly -> Elephant',
          'Fly -> Elephant -> Cat'
        ],
        correctAnswer: 'Fly -> Cat -> Elephant',
        explanation: 'The fly is the smallest, then the cat, then the elephant.',
      };
    case 'symbol spotting':
      return {
        intro: 'Count the target symbols in the row.',
        prompt: 'How many triangles appear in the sequence: triangle circle triangle square triangle circle?',
        options: ['2', '3', '4', '5'],
        correctAnswer: '3',
        explanation: 'There are three triangles in the sequence.',
      };
    case 'dual attention instruction':
      return {
        intro: 'Stay focused on the given rule.',
        prompt: 'When should you tap once?',
        options: [
          'When you hear a fruit',
          'When you hear a color',
          'When you hear a number',
          'On every word'
        ],
        correctAnswer: 'When you hear a fruit',
        explanation: 'The instruction targets only fruit.',
      };
    case 'everyday gestures':
      return {
        intro: 'Choose the gesture that best matches the situation.',
        prompt: 'Which gesture best matches brushing your hair?',
        options: ['Pretend to write', 'Pretend to comb your hair', 'Pretend to drink', 'Pretend to sleep'],
        correctAnswer: 'Pretend to comb your hair',
        explanation: 'The combing gesture matches the requested action.',
      };
    case 'familiar object recognition':
      return {
        intro: 'Identify the object from its description.',
        prompt: 'Which object is used to tell the time?',
        options: ['Watch', 'Pillow', 'Bottle', 'Saucepan'],
        correctAnswer: 'Watch',
        explanation: 'A watch is used to tell the time.',
      };
    default:
      return fallbackChallenge(game);
  }
}

function fallbackChallenge(game: CognitiveGame): CognitiveChallenge {
  switch (game.gameType) {
    case 'MEMORY':
      return {
        intro: 'Memorize the displayed items, then find the hidden pairs.',
        memoryPreview: ['Flower', 'Pen', 'Moon', 'Bell'],
        memoryDeck: ['Flower', 'Pen', 'Moon', 'Bell'],
        prompt: 'Turn over the cards and find all memorized pairs.',
        options: [],
        correctAnswer: 'Match all pairs',
        explanation: 'Each recovered pair validates memorization of the items.',
      };
    case 'LANGUAGE':
      return {
        intro: 'Complete the sentence with the correct word.',
        prompt: 'In the evening, we turn on the ____ to see clearly.',
        options: ['Lamp', 'Chair', 'Door', 'Plate'],
        correctAnswer: 'Lamp',
        explanation: 'We turn on a lamp for light.',
      };
    case 'LOGIC':
      return {
        intro: 'Observe the number pattern.',
        prompt: 'Which number comes after 3 - 6 - 9 - ?',
        options: ['10', '11', '12', '13'],
        correctAnswer: '12',
        explanation: 'The sequence increases by 3 each time.',
      };
    case 'ATTENTION':
      return {
        intro: 'Precisely identify the requested information.',
        prompt: 'How many times does the letter A appear in BANANA?',
        options: ['2', '3', '4', '5'],
        correctAnswer: '3',
        explanation: 'The word BANANA contains three letters A.',
      };
    case 'PRAXIS':
      return {
        intro: 'Choose the gesture linked to the proposed action.',
        prompt: 'Which gesture matches opening a door?',
        options: ['Turn a handle', 'Write on a sheet of paper', 'Put on a shoe', 'Wash a cup'],
        correctAnswer: 'Turn a handle',
        explanation: 'You turn a handle to open a door.',
      };
    case 'GNOSIS':
      return {
        intro: 'Recognize the described object.',
        prompt: 'Which object is used to cut paper?',
        options: ['Scissors', 'Cup', 'Cushion', 'Comb'],
        correctAnswer: 'Scissors',
        explanation: 'Scissors are used to cut.',
      };
  }
}
