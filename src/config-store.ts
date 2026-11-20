import { LocalizedError } from './i18n'
import { CONFIG_KEY, TotpPluginConfig } from './types'

export function updatePluginConfigStore (store: Record<string, unknown>, next: TotpPluginConfig): void {
    const current = store[CONFIG_KEY] as TotpPluginConfig|undefined
    if (!current) {
        throw new LocalizedError('configNodeUnavailable')
    }

    current.enabled = next.enabled
    current.rules = next.rules.map(rule => ({ ...rule }))
}
