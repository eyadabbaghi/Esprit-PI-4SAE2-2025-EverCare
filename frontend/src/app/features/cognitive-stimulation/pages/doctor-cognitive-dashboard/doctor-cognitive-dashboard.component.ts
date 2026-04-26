import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import Chart from 'chart.js/auto';

interface CognitiveScore {
  month: string;
  memory: number;
  attention: number;
  spatial: number;
}

@Component({
  selector: 'app-doctor-cognitive-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <header>
        <h2>Dashboard Cognitive - Progression</h2>
        <button (click)="exportPdf()">📄 PDF Export</button>
      </header>

      <div class="charts-grid">
        <div class="chart-card">
          <h3>Progression 6 Mois</h3>
          <canvas #progressionChart></canvas>
        </div>

        <div class="chart-card">
          <h3>Heatmap Faiblesses</h3>
          <div class="heatmap">
            <div *ngFor="let domain of domains; let i = index" 
                 class="heatmap-cell" 
                 [style.background]="getHeatmapColor(domain.avgScore)"
                 [style.--domain]="domain.name">
              <strong>{{ domain.avgScore | number:'1.0-0' }}%</strong>
              <small>{{ domain.name }}</small>
            </div>
          </div>
        </div>

        <div class="prediction-card">
          <h3>Prédiction Déclin</h3>
          <div class="prediction-metric">
            <span class="label">Risque 6 mois:</span>
            <span class="value {{ prediction.riskLevel }}">{{ prediction.risk }}%</span>
          </div>
          <div class="prediction-trend">
            <span>Tendance: {{ prediction.trend }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .chart-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    canvas {
      max-height: 300px;
    }
    .heatmap {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .heatmap-cell {
      aspect-ratio: 1;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    .heatmap-cell[style*="#28a745"] { --domain: 'Mémoire'; }
    .heatmap-cell[style*="#ffc107"] { --domain: 'Attention'; }
    .heatmap-cell[style*="#dc3545"] { --domain: 'Spatial'; }
    .prediction-card {
      grid-column: span 2;
    }
    .prediction-metric {
      font-size: 2rem;
      margin-bottom: 12px;
    }
    .value.low { color: #28a745; }
    .value.medium { color: #ffc107; }
    .value.high { color: #dc3545; }
    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DoctorCognitiveDashboardComponent implements OnInit {
  patientId = '';
  scores: CognitiveScore[] = [];
  domains = [
    { name: 'Mémoire', avgScore: 82 },
    { name: 'Attention', avgScore: 68 },
    { name: 'Spatial', avgScore: 91 }
  ];
  prediction = { risk: 23, riskLevel: 'low', trend: '+2.1%' };

  private charts: any[] = [];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.patientId = this.route.snapshot.paramMap.get('patientId') || '';
    this.mockData();
    this.initCharts();
  }

  private mockData() {
    this.scores = [
      { month: 'Jan', memory: 85, attention: 72, spatial: 91 },
      { month: 'Fév', memory: 82, attention: 68, spatial: 89 },
      { month: 'Mar', memory: 78, attention: 65, spatial: 87 },
      { month: 'Avr', memory: 76, attention: 64, spatial: 85 },
      { month: 'Mai', memory: 74, attention: 62, spatial: 84 },
      { month: 'Juin', memory: 72, attention: 60, spatial: 82 }
    ];
  }

  private initCharts() {
    const ctx = (document.getElementById('progressionChart') as HTMLCanvasElement)?.getContext('2d');
    if (ctx) {
      this.charts.push(new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.scores.map(s => s.month),
          datasets: [
            { label: 'Mémoire', data: this.scores.map(s => s.memory), borderColor: '#28a745', tension: 0.4 },
            { label: 'Attention', data: this.scores.map(s => s.attention), borderColor: '#ffc107', tension: 0.4 },
            { label: 'Spatial', data: this.scores.map(s => s.spatial), borderColor: '#17a2b8', tension: 0.4 }
          ]
        },
        options: {
          responsive: true,
          scales: { y: { min: 50, max: 100 } }
        }
      }));
    }
  }

  getHeatmapColor(score: number): string {
    if (score > 80) return '#28a745';
    if (score > 65) return '#ffc107';
    return '#dc3545';
  }

  exportPdf() {
    // jsPDF implementation
    window.print(); // Simple print to PDF for demo
  }
}

