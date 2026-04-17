import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { WakaTimeCredentialInput } from './core/models/credential.model';
import { DashboardStoreService } from './core/services/dashboard-store.service';
import { DashboardPageComponent } from './features/dashboard/dashboard.page';
import { SettingsPanelComponent } from './features/settings/settings-panel.component';

@Component({
  selector: 'dt-root',
  imports: [DashboardPageComponent, SettingsPanelComponent],
  template: `
    <dt-dashboard-page
      [state]="store.state()"
      [fetching]="store.fetching()"
      (refreshRequested)="refresh()"
      (settingsRequested)="settingsOpen.set(true)"
    />

    @if (settingsOpen()) {
      <dt-settings-panel
        [credential]="store.credential()"
        (closed)="settingsOpen.set(false)"
        (saveRequested)="saveCredential($event)"
        (clearRequested)="clearCredential()"
      />
    }
  `,
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  protected readonly store = inject(DashboardStoreService);
  protected readonly settingsOpen = signal(false);

  ngOnInit(): void {
    void this.store.initialize();
  }

  protected refresh(): void {
    void this.store.refresh();
  }

  protected saveCredential(credential: WakaTimeCredentialInput): void {
    void this.store.saveCredential(credential).then(() => {
      this.settingsOpen.set(false);
    });
  }

  protected clearCredential(): void {
    void this.store.clearCredential().then(() => {
      this.settingsOpen.set(false);
    });
  }
}
