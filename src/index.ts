import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import TabbyCoreModule, { ConfigProvider } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import { TerminalDecorator } from 'tabby-terminal'
import { TotpConfigProvider } from './config'
import { TotpSettingsTabComponent } from './settings/settings-tab.component'
import { TotpConfigPanelComponent } from './settings/panels/totp-panel.component'
import { TotpStatusPanelComponent } from './settings/panels/status-panel.component'
import { TotpChangelogPanelComponent } from './settings/panels/changelog-panel.component'
import { TotpUpdatesPanelComponent } from './settings/panels/updates-panel.component'
import { TotpSettingsTabProvider } from './settings/settings-tab-provider'
import { TotpTerminalDecorator } from './terminal-decorator'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        NgbModule,
        TabbyCoreModule,
    ],
    declarations: [
        TotpSettingsTabComponent,
        TotpConfigPanelComponent,
        TotpStatusPanelComponent,
        TotpChangelogPanelComponent,
        TotpUpdatesPanelComponent,
    ],
    providers: [
        { provide: ConfigProvider, useClass: TotpConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: TotpSettingsTabProvider, multi: true },
        { provide: TerminalDecorator, useClass: TotpTerminalDecorator, multi: true },
    ],
})
export default class TabbyTotpPilotModule { }

export * from './types'
