package com.example.cognitivestimulationservice.config;

import com.example.cognitivestimulationservice.entity.CognitiveGame;
import com.example.cognitivestimulationservice.entity.CognitiveGameType;
import com.example.cognitivestimulationservice.repository.CognitiveGameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class CognitiveGameDataInitializer implements CommandLineRunner {

    private final CognitiveGameRepository cognitiveGameRepository;

    @Override
    public void run(String... args) {
        List<CognitiveGame> starterGames = List.of(
                game(
                        "Association mémoire visuelle",
                        "Retrouver les cartes identiques pour stimuler la mémoire visuelle à court terme.",
                        CognitiveGameType.MEMORY,
                        1,
                        5,
                        "Présentez quatre cartes, laissez le patient observer quelques secondes, retournez-les puis demandez-lui de reconstituer les paires."
                ),
                game(
                        "Souvenirs du quotidien",
                        "Associer des objets usuels à leur usage pour renforcer la mémoire sémantique.",
                        CognitiveGameType.MEMORY,
                        2,
                        8,
                        "Montrez une image d’objet du quotidien puis proposez trois usages. Le patient doit choisir la bonne réponse."
                ),
                game(
                        "Liste à retenir",
                        "Exercice simple de mémorisation de mots du quotidien.",
                        CognitiveGameType.MEMORY,
                        3,
                        10,
                        "Lisez une courte liste de mots, laissez une pause, puis demandez au patient de restituer le plus grand nombre d’éléments possible."
                ),
                game(
                        "Mot manquant",
                        "Compléter une phrase simple avec le mot le plus adapté pour travailler le lexique.",
                        CognitiveGameType.LANGUAGE,
                        2,
                        6,
                        "Affichez une phrase incomplète avec trois propositions. Le patient choisit le mot qui complète correctement la phrase."
                ),
                game(
                        "Catégories de mots",
                        "Classer des mots par thème pour renforcer l’organisation du langage.",
                        CognitiveGameType.LANGUAGE,
                        3,
                        8,
                        "Proposez plusieurs mots mélangés. Le patient doit regrouper ceux qui appartiennent à une même catégorie: aliments, vêtements, animaux, etc."
                ),
                game(
                        "Compréhension d’instructions",
                        "Suivre une consigne simple à deux étapes pour mobiliser langage et attention.",
                        CognitiveGameType.LANGUAGE,
                        4,
                        10,
                        "Lisez une consigne courte comme 'touche le carré bleu puis montre la tasse'. Demandez ensuite au patient d’exécuter l’action."
                ),
                game(
                        "Suite logique d’images",
                        "Identifier l’image qui complète une séquence logique.",
                        CognitiveGameType.LOGIC,
                        3,
                        9,
                        "Présentez trois images formant une suite et quatre propositions. Le patient doit choisir celle qui suit la logique."
                ),
                game(
                        "Classement du plus petit au plus grand",
                        "Ordonner des objets selon une propriété simple pour stimuler le raisonnement.",
                        CognitiveGameType.LOGIC,
                        2,
                        7,
                        "Montrez trois objets de tailles différentes et demandez au patient de les ranger du plus petit au plus grand."
                ),
                game(
                        "Repérage de symbole",
                        "Repérer rapidement un symbole cible au milieu de distracteurs.",
                        CognitiveGameType.ATTENTION,
                        1,
                        4,
                        "Affichez une grille de symboles et demandez au patient d’indiquer tous les symboles identiques au modèle."
                ),
                game(
                        "Double consigne attentionnelle",
                        "Réagir à une consigne précise et inhiber les mauvaises réponses.",
                        CognitiveGameType.ATTENTION,
                        4,
                        10,
                        "Dites au patient de taper une fois quand il entend un fruit et de ne rien faire pour les autres mots."
                ),
                game(
                        "Gestes du quotidien",
                        "Imiter des gestes simples de la vie courante pour travailler la praxie.",
                        CognitiveGameType.PRAXIS,
                        1,
                        5,
                        "Montrez un geste simple comme se coiffer, ouvrir une porte ou saluer, puis demandez au patient de l’imiter."
                ),
                game(
                        "Reconnaissance d’objets familiers",
                        "Identifier des objets connus à partir d’images ou de silhouettes.",
                        CognitiveGameType.GNOSIS,
                        2,
                        6,
                        "Présentez une série d’images ou de silhouettes d’objets familiers. Le patient doit nommer ou désigner le bon objet."
                )
        );

        List<CognitiveGame> missingGames = starterGames.stream()
                .filter(game -> !cognitiveGameRepository.existsByTitleIgnoreCase(game.getTitle()))
                .toList();

        if (!missingGames.isEmpty()) {
            cognitiveGameRepository.saveAll(missingGames);
        }
    }

    private CognitiveGame game(
            String title,
            String description,
            CognitiveGameType type,
            int difficultyLevel,
            int estimatedDuration,
            String instructions
    ) {
        return CognitiveGame.builder()
                .title(title)
                .description(description)
                .gameType(type)
                .difficultyLevel(difficultyLevel)
                .estimatedDuration(estimatedDuration)
                .instructions(instructions)
                .active(true)
                .build();
    }
}
