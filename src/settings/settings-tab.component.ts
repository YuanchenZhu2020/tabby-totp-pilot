import { Component } from '@angular/core'
import { LocaleService } from 'tabby-core'
import { TotpLocalizedComponent } from './localized-component'

@Component({
    selector: 'totp-pilot-settings-tab',
    template: `
        <div class="content-box totp-pilot-settings">
            <h3>{{ t.title }}</h3>
            <p class="text-muted">{{ t.intro }}</p>

            <ul ngbNav #nav="ngbNav" class="nav-tabs totp-pilot-nav">
                <li ngbNavItem>
                    <a ngbNavLink>{{ t.tabTotp }}</a>
                    <ng-template ngbNavContent>
                        <totp-pilot-totp-panel></totp-pilot-totp-panel>
                    </ng-template>
                </li>
                <li ngbNavItem>
                    <a ngbNavLink>{{ t.tabStatus }}</a>
                    <ng-template ngbNavContent>
                        <totp-pilot-status-panel></totp-pilot-status-panel>
                    </ng-template>
                </li>
                <li ngbNavItem>
                    <a ngbNavLink>{{ t.tabChangelog }}</a>
                    <ng-template ngbNavContent>
                        <totp-pilot-changelog-panel></totp-pilot-changelog-panel>
                    </ng-template>
                </li>
                <li ngbNavItem>
                    <a ngbNavLink>{{ t.tabUpdates }}</a>
                    <ng-template ngbNavContent>
                        <totp-pilot-updates-panel></totp-pilot-updates-panel>
                    </ng-template>
                </li>
            </ul>
            <div [ngbNavOutlet]="nav"></div>
        </div>
    `,
    styles: [`
        .totp-pilot-settings { max-width: 760px; }
        .totp-pilot-nav { margin-top: 16px; }
    `],
})
export class TotpSettingsTabComponent extends TotpLocalizedComponent {
    constructor (localeService: LocaleService) {
        super(localeService)
    }
}
