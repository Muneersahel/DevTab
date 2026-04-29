import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NgxSonnerToaster, toast } from 'ngx-sonner';
import { WakaTimeCredentialInput } from './core/models/credential.model';
import { DEFAULT_UI_PREFERENCES, type DevTabUiPreferences } from './core/models/ui-prefs.model';
import { DashboardStoreService } from './core/services/dashboard-store.service';
import { StorageService } from './core/services/storage.service';
import { DashboardPageComponent } from './features/dashboard/dashboard.page';
import { SettingsPanelComponent } from './features/settings/settings-panel.component';

@Component({
  selector: 'dt-root',
  imports: [DashboardPageComponent, SettingsPanelComponent, NgxSonnerToaster],
  template: `
    <dt-dashboard-page
      [state]="store.state()"
      [fetching]="store.fetching()"
      [autoRefreshIntervalMs]="uiPrefs().autoRefreshIntervalMs"
      (refreshRequested)="refresh()"
      (settingsRequested)="settingsOpen.set(true)"
    />

    @if (settingsOpen()) {
      <dt-settings-panel
        [credential]="store.credential()"
        [uiPreferences]="uiPrefs()"
        (closed)="settingsOpen.set(false)"
        (saveRequested)="saveCredential($event)"
        (clearRequested)="clearCredential()"
        (preferencesSaved)="saveUiPreferences($event)"
      />
    }

    <ngx-sonner-toaster
      theme="dark"
      position="bottom-right"
      [richColors]="true"
      [closeButton]="true"
      [duration]="4200"
      offset="5.5rem"
    />
  `,
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  protected readonly store = inject(DashboardStoreService);
  protected readonly storage = inject(StorageService);
  protected readonly settingsOpen = signal(false);
  protected readonly uiPrefs = signal<DevTabUiPreferences>(DEFAULT_UI_PREFERENCES);

  ngOnInit(): void {
    void this.store.initialize();
    void this.storage.getUiPreferences().then((p) => {
      this.uiPrefs.set(p);
      this.store.setAutoRefreshIntervalMs(p.autoRefreshIntervalMs);
    });
  }

  protected refresh(): void {
    void this.store.refresh();
  }

  protected saveCredential(credential: WakaTimeCredentialInput): void {
    void this.store.saveCredential(credential).then(
      () => {
        this.settingsOpen.set(false);
        toast.success('WakaTime credential saved. Your dashboard is updating.');
      },
      () => {
        toast.error('Could not verify that credential. Check the token and try again.');
      },
    );
  }

  protected clearCredential(): void {
    void this.store.clearCredential().then(() => {
      this.settingsOpen.set(false);
      toast.success('WakaTime credential removed from this browser.');
    });
  }

  protected saveUiPreferences(prefs: DevTabUiPreferences): void {
    void this.storage.saveUiPreferences(prefs).then(() => {
      this.uiPrefs.set(prefs);
      this.store.setAutoRefreshIntervalMs(prefs.autoRefreshIntervalMs);
      this.settingsOpen.set(false);
      toast.success('Preferences saved.');
    });
  }
}
