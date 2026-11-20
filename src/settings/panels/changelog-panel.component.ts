import { Component } from '@angular/core'
import { LocaleService } from 'tabby-core'
import { TotpLocalizedComponent } from '../localized-component'
import { CHANGELOG_ENTRIES, ChangelogEntry } from '../changelog-data'
import { PluginUpdateService } from '../../services/plugin-update.service'

@Component({
    selector: 'totp-pilot-changelog-panel',
    template: `
        <div class="totp-pilot-changelog">
            <table class="table table-striped table-hover table-sm">
                <thead>
                    <tr>
                        <th class="text-nowrap">{{ t.changelogVersionHeader }}</th>
                        <th class="text-nowrap">{{ t.changelogDateHeader }}</th>
                        <th>{{ t.changelogChangesHeader }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let entry of entries">
                        <td class="text-nowrap">
                            {{ entry.version }}
                            <span class="badge bg-primary" *ngIf="entry.version === currentVersion">
                                {{ t.changelogCurrentBadge }}
                            </span>
                        </td>
                        <td class="text-nowrap">{{ entry.date }}</td>
                        <td>
                            <ul class="changelog-changes">
                                <li *ngFor="let item of entry.changes[locale]">{{ item }}</li>
                            </ul>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
    styles: [`
        .changelog-changes { margin: 0; padding-left: 18px; }
        .changelog-changes li { margin: 2px 0; }
    `],
})
export class TotpChangelogPanelComponent extends TotpLocalizedComponent {
    entries: ChangelogEntry[] = CHANGELOG_ENTRIES
    currentVersion: string

    constructor (
        pluginUpdate: PluginUpdateService,
        localeService: LocaleService,
    ) {
        super(localeService)
        this.currentVersion = pluginUpdate.getCurrentVersion()
    }
}
