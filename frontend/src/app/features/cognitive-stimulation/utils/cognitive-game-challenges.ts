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
    case 'association mémoire visuelle':
      return {
        intro: 'Memorisez les elements ci-dessous pendant quelques secondes, puis retrouvez chaque paire.',
        memoryPreview: ['Pomme', 'Cle', 'Livre', 'Montre'],
        memoryDeck: ['Pomme', 'Cle', 'Livre', 'Montre'],
        prompt: 'Retournez les cartes et reconstituez toutes les paires memorisees.',
        options: [],
        correctAnswer: 'Match all pairs',
        explanation: 'Vous avez reconstitue la serie memorisee en retrouvant toutes les paires.',
      };
    case 'souvenirs du quotidien':
      return {
        intro: 'Retrouvez les paires d objets du quotidien.',
        memoryPreview: ['Brosse', 'Tasse', 'Cle', 'Savon'],
        memoryDeck: ['Brosse', 'Tasse', 'Cle', 'Savon'],
        prompt: 'Associez les cartes identiques pour reconstruire la routine du quotidien.',
        options: [],
        correctAnswer: 'Match all pairs',
        explanation: 'Les objets familiers renforcent les reperes de la vie quotidienne.',
      };
    case 'liste à retenir':
    case 'liste a retenir':
      return {
        intro: 'Memorisez la liste avant de retourner les cartes.',
        memoryPreview: ['Pain', 'Lait', 'Orange', 'Journal'],
        memoryDeck: ['Pain', 'Lait', 'Orange', 'Journal'],
        prompt: 'Retrouvez chaque mot de la liste en formant les bonnes paires.',
        options: [],
        correctAnswer: 'Match all pairs',
        explanation: 'Chaque paire retrouvee confirme un element bien retenu.',
      };
    case 'mot manquant':
      return {
        intro: 'Choisissez le mot qui complete correctement la phrase.',
        prompt: 'Chaque matin, je bois une tasse de ____.',
        options: ['Cafe', 'Chaussure', 'Fenetre', 'Musique'],
        correctAnswer: 'Cafe',
        explanation: 'La phrase correcte est: je bois une tasse de cafe.',
      };
    case 'catégories de mots':
    case 'categories de mots':
      return {
        intro: 'Identifiez l element qui ne va pas avec les autres.',
        prompt: 'Quel mot ne fait pas partie de la categorie fruits ?',
        options: ['Pomme', 'Banane', 'Carotte', 'Orange'],
        correctAnswer: 'Carotte',
        explanation: 'Carotte est un legume, pas un fruit.',
      };
    case 'compréhension d’instructions':
    case 'comprehension d instructions':
      return {
        intro: 'Lisez ou ecoutez la consigne puis choisissez la bonne action.',
        prompt: 'Quelle action correspond a la consigne prends le verre puis montre la porte ?',
        options: [
          'Montrer la porte puis prendre le verre',
          'Prendre le verre puis montrer la porte',
          'Prendre la porte puis montrer le verre',
          'Ne rien faire'
        ],
        correctAnswer: 'Prendre le verre puis montrer la porte',
        explanation: 'L ordre de la consigne doit etre respecte.',
      };
    case 'suite logique d’images':
    case 'suite logique d images':
      return {
        intro: 'Reperez la logique de la serie proposee.',
        prompt: 'Quelle valeur complete la suite 2 - 4 - 6 - 8 - ?',
        options: ['9', '10', '12', '14'],
        correctAnswer: '10',
        explanation: 'La suite augmente de 2 a chaque etape.',
      };
    case 'classement du plus petit au plus grand':
      return {
        intro: 'Choisissez l ordre logique demande.',
        prompt: 'Quel est le bon ordre du plus petit au plus grand ?',
        options: [
          'Mouche -> Chat -> Elephant',
          'Elephant -> Chat -> Mouche',
          'Chat -> Mouche -> Elephant',
          'Mouche -> Elephant -> Chat'
        ],
        correctAnswer: 'Mouche -> Chat -> Elephant',
        explanation: 'La mouche est la plus petite, puis le chat, puis l elephant.',
      };
    case 'repérage de symbole':
    case 'reperage de symbole':
      return {
        intro: 'Comptez les symboles cibles dans la ligne.',
        prompt: 'Combien de triangles apparaissent dans la suite: ▲ ● ▲ ■ ▲ ● ?',
        options: ['2', '3', '4', '5'],
        correctAnswer: '3',
        explanation: 'On compte trois triangles dans la serie.',
      };
    case 'double consigne attentionnelle':
      return {
        intro: 'Restez concentre sur la regle donnee.',
        prompt: 'Dans quel cas faut-il taper une fois ?',
        options: [
          'Quand vous entendez un fruit',
          'Quand vous entendez une couleur',
          'Quand vous entendez un chiffre',
          'A chaque mot'
        ],
        correctAnswer: 'Quand vous entendez un fruit',
        explanation: 'La consigne cible uniquement les fruits.',
      };
    case 'gestes du quotidien':
      return {
        intro: 'Choisissez le geste le plus coherent avec la situation.',
        prompt: 'Quel geste correspond le mieux a l action se brosser les cheveux ?',
        options: ['Faire semblant d ecrire', 'Faire semblant de se coiffer', 'Faire semblant de boire', 'Faire semblant de dormir'],
        correctAnswer: 'Faire semblant de se coiffer',
        explanation: 'Le geste de coiffage correspond a l action demandee.',
      };
    case 'reconnaissance d’objets familiers':
    case 'reconnaissance d objets familiers':
      return {
        intro: 'Identifiez l objet a partir de sa description.',
        prompt: 'Quel objet utilise-t-on pour connaitre l heure ?',
        options: ['Montre', 'Oreiller', 'Bouteille', 'Casserole'],
        correctAnswer: 'Montre',
        explanation: 'Une montre sert a lire l heure.',
      };
    default:
      return fallbackChallenge(game);
  }
}

function fallbackChallenge(game: CognitiveGame): CognitiveChallenge {
  switch (game.gameType) {
    case 'MEMORY':
      return {
        intro: 'Memorisez les elements affiches puis retrouvez les paires cachees.',
        memoryPreview: ['Fleur', 'Stylo', 'Lune', 'Cloche'],
        memoryDeck: ['Fleur', 'Stylo', 'Lune', 'Cloche'],
        prompt: 'Retournez les cartes et retrouvez toutes les paires memorisees.',
        options: [],
        correctAnswer: 'Match all pairs',
        explanation: 'Chaque paire retrouvee valide la memorisation des elements.',
      };
    case 'LANGUAGE':
      return {
        intro: 'Completez la phrase avec le bon mot.',
        prompt: 'Le soir, on allume la ____ pour voir plus clair.',
        options: ['Lampe', 'Chaise', 'Porte', 'Assiette'],
        correctAnswer: 'Lampe',
        explanation: 'On allume une lampe pour eclairer.',
      };
    case 'LOGIC':
      return {
        intro: 'Observez la logique numerique.',
        prompt: 'Quel nombre vient apres 3 - 6 - 9 - ?',
        options: ['10', '11', '12', '13'],
        correctAnswer: '12',
        explanation: 'La suite augmente de 3 en 3.',
      };
    case 'ATTENTION':
      return {
        intro: 'Reperez precisement l information demandee.',
        prompt: 'Combien de fois la lettre A apparait-elle dans BANANE ?',
        options: ['2', '3', '4', '5'],
        correctAnswer: '3',
        explanation: 'Le mot BANANE contient trois lettres A.',
      };
    case 'PRAXIS':
      return {
        intro: 'Choisissez le geste lie a l action proposee.',
        prompt: 'Quel geste correspond a ouvrir une porte ?',
        options: ['Tourner une poignee', 'Ecrire sur une feuille', 'Mettre une chaussure', 'Laver une tasse'],
        correctAnswer: 'Tourner une poignee',
        explanation: 'On tourne une poignee pour ouvrir une porte.',
      };
    case 'GNOSIS':
      return {
        intro: 'Reconnaissez l objet decrit.',
        prompt: 'Quel objet sert a couper le papier ?',
        options: ['Ciseaux', 'Tasse', 'Coussin', 'Peigne'],
        correctAnswer: 'Ciseaux',
        explanation: 'Les ciseaux servent a couper.',
      };
  }
}
