export type Locale = 'zh' | 'en'

export interface I18nStrings {
    // 页面结构
    title: string
    intro: string
    footnote: string
    diagnosticsTitle: string

    // 全局开关
    enableAutofill: string
    enableAutofillDescription: string

    // 规则卡片
    enableThisRule: string
    wildcardBadge: string
    deleteRule: string
    hostLabel: string
    hostPlaceholder: string
    portLabel: string
    usernameLabel: string
    usernamePlaceholder: string
    algorithmLabel: string
    digitsLabel: string
    digits6: string
    digits8: string
    periodLabel: string
    secretLabel: string
    secretStoredBadge: string
    secretNotStoredBadge: string
    secretPlaceholder: string
    addRule: string
    saving: string
    saveSettings: string

    // 保存 / 删除消息
    duplicateRulesError: string
    savedMessage: string
    saveFailedFallback: string
    unnamedUser: string
    unnamedHost: string
    confirmDeleteRule: (username: string, host: string) => string
    ruleDeletedNotice: string
    deleteFailedFallback: string

    // 运行状态徽标
    stateMatched: string
    stateFilled: string
    stateSubmitted: string
    stateRetrying: string

    // 运行状态详情（terminal-decorator 的 result.reason）
    detailDuplicateStep: string
    detailMissingSecret: string
    detailProcessingError: string
    detailIncompatible: string
    detailNotOtp: string

    // 顶部 tab
    tabTotp: string
    tabStatus: string
    tabChangelog: string
    tabUpdates: string

    // 高级设置折叠
    showAdvanced: string
    hideAdvanced: string

    // 运行状态面板
    statusEmpty: string

    // CHANGELOG 面板
    changelogVersionHeader: string
    changelogDateHeader: string
    changelogChangesHeader: string
    changelogCurrentBadge: string

    // UPDATES 面板
    updatesSectionTitle: string
    updatesCurrentVersionLabel: string
    updatesCheckButton: string
    updatesChecking: string
    updatesInstalling: string
    updatesUpToDate: string
    updatesAvailable: (version: string) => string
    updatesInstallButton: (version: string) => string
    updatesReleaseNotes: string
    updatesRollbackTitle: string
    updatesRollbackDescription: string
    updatesRollbackVersionHeader: string
    updatesRollbackDateHeader: string
    updatesRollbackActionHeader: string
    updatesRollbackButton: string
    updatesRollbackCurrentBadge: string
    updatesRollbackLoading: string
    updatesRollbackEmpty: string
    updatesInstallConfirm: (version: string) => string
    updatesInstallConfirmOk: string
    updatesInstallConfirmCancel: string
    updatesInstallSuccess: string
    updatesInstallFailed: string
    updatesCheckFailed: string

    // 校验与运行时错误（LocalizedError）
    portInvalid: string
    unsupportedAlgorithm: (algorithm: string) => string
    digitsInvalid: string
    periodInvalid: string
    hostPatternTooLong: (max: number) => string
    usernamePatternTooLong: (max: number) => string
    ruleIdEmpty: string
    ruleIdChars: string
    hostEmpty: string
    usernameEmpty: string
    secretNotBase32: string
    otpauthInvalidFormat: string
    otpauthNotTotp: string
    otpauthMissingSecret: string
    otpauthDuplicateParam: (name: string) => string
    otpauthSecretEncoding: string
    configNodeUnavailable: string
    invalidRuleIdFormat: string
}

const zh: I18nStrings = {
    title: 'SSH TOTP 自动填充',
    intro: '匹配主机、端口和用户名，为 SSH 连接自动提交标准 TOTP 验证码。支持 SHA1/SHA256/SHA512 算法、6 或 8 位验证码和自定义周期。主机与用户名可直接使用 * / ? 通配符，同一堡垒机下共用一把密钥的资产，一条规则即可覆盖。密钥保存到 Tabby Vault。',
    footnote: '同时命中多条规则时，按列表顺序取第一条。',
    diagnosticsTitle: '运行状态',

    enableAutofill: '启用自动填充',
    enableAutofillDescription: '关闭后保留规则和密钥，但不会自动填充 TOTP 验证码。',

    enableThisRule: '启用此规则',
    wildcardBadge: '通配符',
    deleteRule: '删除',
    hostLabel: '主机 / IP',
    hostPlaceholder: 'example.com 或 jump*.com（支持 * 和 ?）',
    portLabel: '端口',
    usernameLabel: '用户名',
    usernamePlaceholder: 'username 或 username@*（支持 * 和 ?）',
    algorithmLabel: '算法',
    digitsLabel: '位数',
    digits6: '6 位',
    digits8: '8 位',
    periodLabel: '周期（秒）',
    secretLabel: 'TOTP 密钥或 otpauth URI',
    secretStoredBadge: '已安全保存',
    secretNotStoredBadge: '尚未保存',
    secretPlaceholder: '密钥 (ABC1DE2FGHIJK3LM) 或 otpauth URI (otpauth://totp/Example:alice@example.com?secret=ABC1DE2FGHIJK3LM&issuer=Example&algorithm=SHA1&digits=6&period=30)',
    addRule: '添加规则',
    saving: '保存中…',
    saveSettings: '保存设置',

    duplicateRulesError: '存在主机、端口和用户名完全相同的重复规则',
    savedMessage: 'SSH TOTP 设置已保存',
    saveFailedFallback: '保存 SSH TOTP 设置失败',
    unnamedUser: '未命名用户',
    unnamedHost: '未命名主机',
    confirmDeleteRule: (username, host) => `确认删除 ${username}@${host} 的 TOTP 规则和已保存密钥？`,
    ruleDeletedNotice: 'SSH TOTP 规则已删除',
    deleteFailedFallback: '删除 SSH TOTP 规则失败',

    stateMatched: '已匹配规则',
    stateFilled: '已填入验证码',
    stateSubmitted: '已提交',
    stateRetrying: '重试中',

    detailDuplicateStep: '同一时间步已提交过验证码',
    detailMissingSecret: '规则尚未保存密钥',
    detailProcessingError: '处理出错，已安排重试',
    detailIncompatible: 'Tabby 认证提示结构不兼容',
    detailNotOtp: '提示未识别为 OTP 输入',

    tabTotp: 'TOTP 设置',
    tabStatus: '运行状态',
    tabChangelog: '更新日志',
    tabUpdates: '插件更新',

    showAdvanced: '高级设置',
    hideAdvanced: '收起高级设置',

    statusEmpty: '暂无运行状态。插件在 SSH 连接触发认证提示时记录每个标签页的处理结果。',

    changelogVersionHeader: '版本',
    changelogDateHeader: '日期',
    changelogChangesHeader: '变更',
    changelogCurrentBadge: '当前',

    updatesSectionTitle: '插件更新',
    updatesCurrentVersionLabel: '当前版本',
    updatesCheckButton: '检查更新',
    updatesChecking: '检查中…',
    updatesInstalling: '安装中…',
    updatesUpToDate: '已是最新版本',
    updatesAvailable: version => `发现新版本 ${version}`,
    updatesInstallButton: version => `更新到 ${version}`,
    updatesReleaseNotes: '查看更新说明',
    updatesRollbackTitle: '版本回退',
    updatesRollbackDescription: '回退到已发布的旧版本，安装完成后需要重启 Tabby 生效。',
    updatesRollbackVersionHeader: '版本',
    updatesRollbackDateHeader: '发布日期',
    updatesRollbackActionHeader: '操作',
    updatesRollbackButton: '回退',
    updatesRollbackCurrentBadge: '当前版本',
    updatesRollbackLoading: '正在获取版本列表…',
    updatesRollbackEmpty: '没有可回退的版本',
    updatesInstallConfirm: version => `确认安装 tabby-totp-pilot ${version}？安装完成后需要重启 Tabby 生效。`,
    updatesInstallConfirmOk: '安装',
    updatesInstallConfirmCancel: '取消',
    updatesInstallSuccess: '插件已安装，重启 Tabby 后生效',
    updatesInstallFailed: '插件安装失败，请检查网络后重试',
    updatesCheckFailed: '检查更新失败，请稍后重试',

    portInvalid: '端口必须是 1 到 65535 之间的整数',
    unsupportedAlgorithm: algorithm => `不支持的 TOTP 算法：${algorithm}`,
    digitsInvalid: 'TOTP 位数仅支持 6 或 8',
    periodInvalid: 'TOTP 周期必须是 1 到 3600 秒的整数',
    hostPatternTooLong: max => `主机过长，最多 ${max} 个字符`,
    usernamePatternTooLong: max => `用户名过长，最多 ${max} 个字符`,
    ruleIdEmpty: '规则 ID 不能为空',
    ruleIdChars: '规则 ID 只能包含小写字母、数字和连字符',
    hostEmpty: '主机或 IP 不能为空',
    usernameEmpty: '用户名不能为空',
    secretNotBase32: 'TOTP 密钥必须是有效的 Base32 字符串',
    otpauthInvalidFormat: 'otpauth URI 格式无效',
    otpauthNotTotp: '仅支持 otpauth://totp 类型的 TOTP URI',
    otpauthMissingSecret: 'otpauth URI 缺少 secret 参数',
    otpauthDuplicateParam: name => `otpauth URI 的 ${name} 参数重复且不一致`,
    otpauthSecretEncoding: 'otpauth URI 的 secret 参数编码无效',
    configNodeUnavailable: 'SSH TOTP 配置节点不可用，请重启 Tabby 后重试',
    invalidRuleIdFormat: '规则 ID 格式无效',
}

const en: I18nStrings = {
    title: 'SSH TOTP Auto-Submit',
    intro: 'Match the host, port, and username, and automatically submit standard TOTP verification codes for SSH connections. Supports SHA1/SHA256/SHA512 algorithms, 6- or 8-digit verification codes, and custom periods. Hosts and usernames can directly use * / ? wildcards. Assets sharing the same key under the same bastion host can be saved to Tabby Vault with a single rule.',
    footnote: 'When multiple rules are matched, the first one in the list will be selected.',
    diagnosticsTitle: 'Status',

    enableAutofill: 'Enable auto-submit',
    enableAutofillDescription: 'Rules and keys will be retained, but the TOTP verification code will not be automatically filled in.',

    enableThisRule: 'Enable this rule',
    wildcardBadge: 'Wildcard',
    deleteRule: 'Delete',
    hostLabel: 'Host / IP',
    hostPlaceholder: 'example.com or jump*.com (* and ? supported)',
    portLabel: 'Port',
    usernameLabel: 'Username',
    usernamePlaceholder: 'username or username@* (* and ? supported)',
    algorithmLabel: 'Algorithm',
    digitsLabel: 'Digits',
    digits6: '6 digits',
    digits8: '8 digits',
    periodLabel: 'Period (seconds)',
    secretLabel: 'TOTP secret or otpauth URI',
    secretStoredBadge: 'Saved securely',
    secretNotStoredBadge: 'Not saved',
    secretPlaceholder: 'Key (ABC1DE2FGHIJK3LM) or OTPAuth URI (otpauth://totp/Example:alice@example.com?secret=ABC1DE2FGHIJK3LM&issuer=Example&algorithm=SHA1&digits=6&period=30)',
    addRule: 'Add rule',
    saving: 'Saving…',
    saveSettings: 'Save settings',

    duplicateRulesError: 'Duplicate rules with identical host, port and username',
    savedMessage: 'SSH TOTP settings saved',
    saveFailedFallback: 'Failed to save SSH TOTP settings',
    unnamedUser: 'unnamed user',
    unnamedHost: 'unnamed host',
    confirmDeleteRule: (username, host) => `Delete the TOTP rule and its stored secret for ${username}@${host}?`,
    ruleDeletedNotice: 'SSH TOTP rule deleted',
    deleteFailedFallback: 'Failed to delete SSH TOTP rule',

    stateMatched: 'Rule matched',
    stateFilled: 'Code filled',
    stateSubmitted: 'Submitted',
    stateRetrying: 'Retrying',

    detailDuplicateStep: 'A code was already submitted for this time step',
    detailMissingSecret: 'Rule has no stored secret',
    detailProcessingError: 'Processing error; retry scheduled',
    detailIncompatible: 'Incompatible Tabby prompt structure',
    detailNotOtp: 'Prompt not recognized as an OTP input',

    tabTotp: 'TOTP',
    tabStatus: 'Status',
    tabChangelog: 'Changelog',
    tabUpdates: 'Updates',

    showAdvanced: 'Advanced settings',
    hideAdvanced: 'Hide advanced settings',

    statusEmpty: 'No status yet. Tabby TOTP Pilot records per-tab results whenever an SSH session triggers an authentication prompt.',

    changelogVersionHeader: 'Version',
    changelogDateHeader: 'Date',
    changelogChangesHeader: 'Changes',
    changelogCurrentBadge: 'Current',

    updatesSectionTitle: 'Updates',
    updatesCurrentVersionLabel: 'Current version',
    updatesCheckButton: 'Check for updates',
    updatesChecking: 'Checking…',
    updatesInstalling: 'Installing…',
    updatesUpToDate: 'You are on the latest version',
    updatesAvailable: version => `Version ${version} is available`,
    updatesInstallButton: version => `Update to ${version}`,
    updatesReleaseNotes: 'View release notes',
    updatesRollbackTitle: 'Rollback',
    updatesRollbackDescription: 'Roll back to a previously released version. Restart Tabby after installation to apply it.',
    updatesRollbackVersionHeader: 'Version',
    updatesRollbackDateHeader: 'Release date',
    updatesRollbackActionHeader: 'Action',
    updatesRollbackButton: 'Roll back',
    updatesRollbackCurrentBadge: 'Current version',
    updatesRollbackLoading: 'Loading versions…',
    updatesRollbackEmpty: 'No versions available for rollback',
    updatesInstallConfirm: version => `Install tabby-totp-pilot ${version}? Restart Tabby afterwards to apply it.`,
    updatesInstallConfirmOk: 'Install',
    updatesInstallConfirmCancel: 'Cancel',
    updatesInstallSuccess: 'Plugin installed; restart Tabby to apply',
    updatesInstallFailed: 'Plugin installation failed; check your network and try again',
    updatesCheckFailed: 'Failed to check for updates; try again later',

    portInvalid: 'Port must be an integer between 1 and 65535',
    unsupportedAlgorithm: algorithm => `Unsupported TOTP algorithm: ${algorithm}`,
    digitsInvalid: 'TOTP only supports 6 or 8 digits',
    periodInvalid: 'TOTP period must be an integer between 1 and 3600 seconds',
    hostPatternTooLong: max => `Host pattern is too long (max ${max} characters)`,
    usernamePatternTooLong: max => `Username pattern is too long (max ${max} characters)`,
    ruleIdEmpty: 'Rule ID cannot be empty',
    ruleIdChars: 'Rule ID can only contain lowercase letters, digits and hyphens',
    hostEmpty: 'Host or IP cannot be empty',
    usernameEmpty: 'Username cannot be empty',
    secretNotBase32: 'TOTP secret must be a valid Base32 string',
    otpauthInvalidFormat: 'Invalid otpauth URI format',
    otpauthNotTotp: 'Only otpauth://totp URIs are supported',
    otpauthMissingSecret: 'otpauth URI is missing the secret parameter',
    otpauthDuplicateParam: name => `Conflicting duplicate ${name} parameter in otpauth URI`,
    otpauthSecretEncoding: 'Invalid secret encoding in otpauth URI',
    configNodeUnavailable: 'SSH TOTP config node unavailable; restart Tabby and try again',
    invalidRuleIdFormat: 'Invalid rule ID format',
}

export const I18N: Record<Locale, I18nStrings> = { zh, en }

export function resolveLocale (language: string): Locale {
    return language.startsWith('zh') ? 'zh' : 'en'
}

export type MessageKey = keyof I18nStrings

type MessageEntry = string | ((...args: unknown[]) => string)

function render (strings: I18nStrings, key: MessageKey, args?: unknown[]): string {
    const entry = strings[key] as unknown as MessageEntry
    return typeof entry === 'function' ? entry(...args ?? []) : entry
}

// error.message 固定为英文文案（便于日志检索），展示层按当前语言经 localize() 渲染
export class LocalizedError extends Error {
    constructor (
        public readonly key: MessageKey,
        public readonly args?: unknown[],
    ) {
        super(render(I18N.en, key, args))
    }
}

export function localize (strings: I18nStrings, error: unknown, fallback: string): string {
    if (error instanceof LocalizedError) {
        return render(strings, error.key, error.args)
    }
    return fallback
}
