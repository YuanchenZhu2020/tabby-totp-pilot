import { Component, OnInit } from '@angular/core'
import { Subscription } from 'rxjs'
import { LocaleService } from 'tabby-core'
import { TotpLocalizedComponent } from '../localized-component'
import { TotpStatusService, TotpTabStatus } from '../../services/totp-status.service'

@Component({
    selector: 'totp-pilot-status-panel',
    template: `
        <div class="totp-pilot-status">
            <div class="alert alert-info" *ngIf="!tabStatuses.length">{{ t.statusEmpty }}</div>

            <div class="status-row" *ngFor="let status of tabStatuses">
                <span class="badge" [ngClass]="stateBadgeClass(status.state)">{{ stateLabel(status.state) }}</span>
                <span class="status-detail">
                    {{ status.tabLabel }}
                    <span class="text-muted" *ngIf="status.ruleSummary">→ {{ status.ruleSummary }}</span>
                    <span class="text-muted" *ngIf="status.detail">（{{ detailLabel(status.detail) }}）</span>
                </span>
            </div>
        </div>
    `,
    styles: [`
        .status-row { display: flex; align-items: baseline; gap: 8px; margin: 6px 0; }
        .status-detail { word-break: break-all; }
    `],
})
export class TotpStatusPanelComponent extends TotpLocalizedComponent implements OnInit {
    tabStatuses: TotpTabStatus[] = []

    private statusSubscription: Subscription|null = null

    constructor (
        private totpStatus: TotpStatusService,
        localeService: LocaleService,
    ) {
        super(localeService)
    }

    ngOnInit (): void {
        this.tabStatuses = this.totpStatus.list()
        this.statusSubscription = this.totpStatus.changed$.subscribe(() => {
            this.tabStatuses = this.totpStatus.list()
        })
    }

    override ngOnDestroy (): void {
        super.ngOnDestroy()
        this.statusSubscription?.unsubscribe()
    }

    stateLabel (state: TotpTabStatus['state']): string {
        const labels: Record<TotpTabStatus['state'], string> = {
            matched: this.t.stateMatched,
            filled: this.t.stateFilled,
            submitted: this.t.stateSubmitted,
            error: this.t.stateRetrying,
        }
        return labels[state]
    }

    // detail 存的是 result.reason 稳定键（terminal-decorator.ts），在此按当前语言渲染
    detailLabel (reason: string): string {
        const labels: Record<string, string> = {
            'duplicate-step': this.t.detailDuplicateStep,
            'missing-secret': this.t.detailMissingSecret,
            'processing-error': this.t.detailProcessingError,
            'incompatible': this.t.detailIncompatible,
            'not-otp': this.t.detailNotOtp,
        }
        return labels[reason] ?? reason
    }

    stateBadgeClass (state: TotpTabStatus['state']): string {
        const classes: Record<TotpTabStatus['state'], string> = {
            matched: 'bg-secondary',
            filled: 'bg-info',
            submitted: 'bg-success',
            error: 'bg-warning',
        }
        return classes[state]
    }
}
