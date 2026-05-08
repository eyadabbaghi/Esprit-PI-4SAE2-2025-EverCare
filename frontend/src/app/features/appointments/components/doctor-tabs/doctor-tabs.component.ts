import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TabType = 'dashboard' | 'availability' | 'consultation-types';

@Component({
  selector: 'app-doctor-tabs',
  templateUrl: './doctor-tabs.component.html',
})
export class DoctorTabsComponent {
  @Input() activeTab: TabType = 'dashboard';
  @Output() tabChange = new EventEmitter<TabType>();

  tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: 'chart' },
    { id: 'availability' as TabType, label: 'Availability', icon: 'clock' },
    { id: 'consultation-types' as TabType, label: 'Consultation Types', icon: 'list' }
  ];

  onTabChange(tabId: TabType): void {
    this.activeTab = tabId;
    this.tabChange.emit(tabId);
  }
}
