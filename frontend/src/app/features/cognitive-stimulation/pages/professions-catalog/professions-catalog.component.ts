import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Profession, ADVANCED_PROFESSIONS } from '../../models/profession.model';
import { RouterModule } from '@angular/router';
import { CognitiveStimulationService } from '../../services/cognitive-stimulation.service';

@Component({
  selector: 'app-professions-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="professions-catalog">
      <header class="catalog-header">
        <h2>🎯 Métiers Avancés - Stimulation Cognitive</h2>
        <p>Personnalisez votre approche professionnelle</p>
      </header>

      <div class="filter-bar">
        <button class="filter-btn active" (click)="setLevelFilter('all')">Tous</button>
        <button class="filter-btn" (click)="setLevelFilter('advanced')">Avancés</button>
        <button class="filter-btn" (click)="setLevelFilter('intermediate')">Intermédiaires</button>
      </div>


      <div class="professions-grid">
        <div *ngFor="let profession of filteredProfessions" 
             class="profession-card"
             [ngClass]="profession.level"
             [style.--card-color]="profession.color">
          <div class="card-icon">{{ profession.icon }}</div>
          <div class="card-content">
            <h3>{{ profession.name }}</h3>
            <p class="level-badge">{{ getLevelLabel(profession.level) }}</p>
            <p class="description">{{ profession.description }}</p>
            <div class="domains">
              <span *ngFor="let domain of profession.specializedDomains | slice:0:3" class="domain-tag">
                {{ getDomainLabel(domain) }}
              </span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn-primary" (click)="selectProfession(profession)">
              {{ profession.recommendedGames.length }} Jeux Recommandés
            </button>
            <a [routerLink]="['/cognitive-games-catalog', profession.id]" class="btn-secondary">
              Explorer
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .professions-catalog {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    .catalog-header {
      text-align: center;
      margin-bottom: 40px;
    }
    .filter-bar {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 8px 20px;
      border: 2px solid #ddd;
      background: white;
      border-radius: 25px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .filter-btn.active, .filter-btn:hover {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }
    .professions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }
    .profession-card {
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      transition: transform 0.3s, box-shadow 0.3s;
      border: 1px solid #e9ecef;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .profession-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 48px rgba(0,0,0,0.15);
    }
    .profession-card.advanced {
      border-left: 6px solid var(--card-color);
    }
    .card-icon {
      font-size: 3rem;
      margin-bottom: 16px;
      text-align: center;
    }
    .card-content h3 {
      margin: 0 0 8px 0;
      color: var(--card-color);
    }
    .level-badge {
      display: inline-block;
      padding: 4px 12px;
      background: var(--card-color);
      color: white;
      border-radius: 20px;
      font-size: 0.8em;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .description {
      color: #666;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .domains {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 20px;
    }
    .domain-tag {
      background: #f8f9fa;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      color: #495057;
    }
    .card-actions {
      margin-top: auto;
      display: flex;
      gap: 12px;
    }
    .btn-primary, .btn-secondary {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
      text-align: center;
    }
    .btn-primary {
      background: var(--card-color);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .btn-secondary {
      background: transparent;
      color: var(--card-color);
      border: 2px solid var(--card-color);
    }
    .btn-secondary:hover {
      background: var(--card-color);
      color: white;
    }
    @media (max-width: 768px) {
      .professions-grid {
        grid-template-columns: 1fr;
      }
      .card-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ProfessionsCatalogComponent implements OnInit {
  professions = ADVANCED_PROFESSIONS;
  filteredProfessions: Profession[] = [];
  currentFilter = 'advanced';

  constructor(private cognitiveService: CognitiveStimulationService) {}

  ngOnInit() {
    this.applyFilter('advanced');
  }

  setLevelFilter(level: 'all' | 'advanced' | 'intermediate') {
    this.currentFilter = level;
    this.applyFilter(level);
  }

  private applyFilter(level: 'all' | 'advanced' | 'intermediate') {
    if (level === 'all') {
      this.filteredProfessions = this.professions;
    } else {
      this.filteredProfessions = this.professions.filter(p => p.level === level);
    }
  }

  getLevelLabel(level: Profession['level']): string {
    const labels = {
      beginner: 'Débutant',
      intermediate: 'Intermédiaire', 
      advanced: 'Avancé'
    };
    return labels[level];
  }

  getDomainLabel(domain: string): string {
    const labels = {
      memory: 'Mémoire',
      attention: 'Attention',
      executive: 'Exécutif',
      spatial: 'Spatial',
      language: 'Langage'
    };
    return labels[domain as keyof typeof labels] || domain;
  }

  selectProfession(profession: Profession) {
    // Save to localStorage for session
    localStorage.setItem('currentProfession', JSON.stringify(profession));
    // Navigate to recommended games
    window.location.href = `/cognitive-games-catalog/${profession.id}`;
  }
}


