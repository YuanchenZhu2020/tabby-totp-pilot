import { Component, OnInit } from '@angular/core'
import { ConfigService, LocaleService, NotificationsService, PlatformService } from 'tabby-core'
import { compareVersions } from '../../utils/version'
import { PluginRelease, PluginUpdateService } from '../../services/plugin-update.service'
import { TotpLocalizedComponent } from '../localized-component'

@Component({
    selector: 'totp-pilot-updates-panel',
    template: `
        <div class="totp-pilot-updates">
            <div class="form-line update-line">
                <div class="header">
                    <div class="title">{{ t.updatesSectionTitle }}</div>
                    <div class="description">
                        {{ t.updatesCurrentVersionLabel }}: <strong>{{ currentVersion }}</strong>
                    </div>
                </div>
                <button class="btn btn-primary" type="button" [disabled]="checking || installing" (click)="checkForUpdate()">
                    {{ checking ? t.updatesChecking : t.updatesCheckButton }}
                </button>
            </div>

            <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

            <div class="alert alert-info" *ngIf="upToDate">{{ t.updatesUpToDate }}</div>

            <div class="update-available" *ngIf="latestRelease">
                <span class="badge bg-success">{{ t.updatesAvailable(latestRelease.version) }}</span>
                <button class="btn btn-primary btn-sm" type="button" [disabled]="checking || installing" (click)="install(latestRelease.version)">
                    {{ installing ? t.updatesInstalling : t.updatesInstallButton(latestRelease.version) }}
                </button>
                <a href="#" class="release-link" *ngIf="latestRelease.url" (click)="openRelease($event, latestRelease.url)">
                    {{ t.updatesReleaseNotes }}
                </a>
            </div>

            <hr>

            <h5>{{ t.updatesRollbackTitle }}</h5>
            <p class="text-muted">{{ t.updatesRollbackDescription }}</p>

            <div class="alert alert-info" *ngIf="rollbackLoading">{{ t.updatesRollbackLoading }}</div>
            <div class="alert alert-info" *ngIf="!rollbackLoading && !rollbackVersions.length">{{ t.updatesRollbackEmpty }}</div>

            <table class="table table-striped table-hover table-sm" *ngIf="rollbackVersions.length">
                <thead>
                    <tr>
                        <th class="text-nowrap">{{ t.updatesRollbackVersionHeader }}</th>
                        <th class="text-nowrap">{{ t.updatesRollbackDateHeader }}</th>
                        <th class="text-nowrap">{{ t.updatesRollbackActionHeader }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let release of rollbackVersions">
                        <td>
                            {{ release.version }}
                            <span class="badge bg-primary" *ngIf="release.version === currentVersion">
                                {{ t.updatesRollbackCurrentBadge }}
                            </span>
                        </td>
                        <td>{{ release.date ?? '—' }}</td>
                        <td>
                            <button class="btn btn-outline-warning btn-sm" type="button"
                                [disabled]="installing || release.version === currentVersion"
                                (click)="install(release.version)">
                                {{ t.updatesRollbackButton }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
    styles: [`
        .update-line { align-items: center; }
        .update-available { display: flex; align-items: center; gap: 12px; margin: 12px 0; }
        .update-available .badge { margin: 0; }
        .release-link { cursor: pointer; }
    `],
})
export class TotpUpdatesPanelComponent extends TotpLocalizedComponent implements OnInit {
    currentVersion: string
    checking = false
    installing = false
    error = ''
    upToDate = false
    latestRelease: PluginRelease|null = null
    rollbackLoading = true
    rollbackVersions: PluginRelease[] = []

    constructor (
        private pluginUpdate: PluginUpdateService,
        private platform: PlatformService,
        private config: ConfigService,
        private notifications: NotificationsService,
        localeService: LocaleService,
    ) {
        super(localeService)
        this.currentVersion = pluginUpdate.getCurrentVersion()
    }

    ngOnInit (): void {
        void this.loadRollbackVersions()
    }

    async checkForUpdate (): Promise<void> {
        if (this.checking || this.installing) {
            return
        }
        this.error = ''
        this.upToDate = false
        this.latestRelease = null
        this.checking = true
        try {
            const latest = await this.pluginUpdate.fetchLatestRelease()
            if (latest && compareVersions(latest.version, this.currentVersion) > 0) {
                this.latestRelease = latest
            } else {
                this.upToDate = true
            }
        } catch {
            this.error = this.t.updatesCheckFailed
        } finally {
            this.checking = false
        }
    }

    async install (version: string): Promise<void> {
        if (this.checking || this.installing) {
            return
        }
        this.error = ''
        const { response } = await this.platform.showMessageBox({
            type: 'warning',
            message: this.t.updatesInstallConfirm(version),
            buttons: [this.t.updatesInstallConfirmOk, this.t.updatesInstallConfirmCancel],
            defaultId: 0,
            cancelId: 1,
        })
        if (response !== 0) {
            return
        }

        this.installing = true
        try {
            await this.pluginUpdate.installVersion(version)
            this.notifications.notice(this.t.updatesInstallSuccess)
            this.config.requestRestart()
        } catch {
            this.error = this.t.updatesInstallFailed
        } finally {
            this.installing = false
        }
    }

    openRelease (event: MouseEvent, url: string): void {
        event.preventDefault()
        this.platform.openExternal(url)
    }

    private async loadRollbackVersions (): Promise<void> {
        try {
            this.rollbackVersions = await this.pluginUpdate.listRollbackVersions()
        } catch {
            this.rollbackVersions = []
        } finally {
            this.rollbackLoading = false
        }
    }
}
