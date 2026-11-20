import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'
import { TotpSettingsTabComponent } from './settings-tab.component'

@Injectable()
export class TotpSettingsTabProvider extends SettingsTabProvider {
    id = 'totp-pilot'
    icon = 'user-lock'
    title = 'SSH TOTP'
    weight = 120

    getComponentType (): unknown {
        return TotpSettingsTabComponent
    }
}
