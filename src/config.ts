import { ConfigProvider } from 'tabby-core'
import { CONFIG_KEY, TotpPluginConfig } from './types'

export const DEFAULT_PLUGIN_CONFIG: TotpPluginConfig = {
    enabled: true,
    rules: [],
}

export class TotpConfigProvider extends ConfigProvider {
    // 每个实例给一份新对象：默认节点会被 config-store 就地改写，不能与模块级常量共享引用
    defaults = {
        [CONFIG_KEY]: { ...DEFAULT_PLUGIN_CONFIG, rules: [] },
    }
}
