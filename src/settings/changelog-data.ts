// 设置页 CHANGELOG 面板的精简条目，与 CHANGELOG.md（详细版）保持同步；新增版本时在此追加。
export interface ChangelogEntry {
    version: string
    date: string
    changes: { zh: string[], en: string[] }
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
    {
        version: '1.0.1',
        date: '2026-11-20',
        changes: {
            zh: [
                'README 兼容徽标更新：Tabby 1.0.238',
            ],
            en: [
                'README compatibility badge updated to Tabby 1.0.238',
            ],
        },
    },
    {
        version: '1.0.0',
        date: '2026-11-20',
        changes: {
            zh: [
                '首个正式版本：为 SSH 连接自动生成并提交 TOTP 验证码，全程无需手动读码输入',
                '通配符规则匹配，SHA1/SHA256/SHA512、6/8 位、1–3600 秒周期可配置',
                '访问器挂钩零延迟接管认证提示，处理失败指数退避重试',
                '密钥存入凭据管理器/Vault，不进普通配置、不回显、不进日志',
                '设置页四面板：TOTP 设置 / 运行状态 / 更新日志 / 插件更新',
                '插件更新与版本回退，npm registry 为单一版本来源',
                '设置页中英双语，跟随 Tabby 语言实时切换',
                'README 提供中英双语：英文为主文档，中文见 README.zh-CN.md',
            ],
            en: [
                'First stable release: auto-fills and submits TOTP codes for SSH logins',
                'Wildcard rule matching; SHA1/SHA256/SHA512, 6/8 digits, 1-3600s periods',
                'Zero-delay accessor-hook prompt intake with exponential-backoff retry',
                'Secrets stored in Credential Manager/Vault; never in plain config, logs or UI',
                'Settings page with TOTP / Status / Changelog / Updates panels',
                'Plugin updates and version rollback, sourced from the npm registry',
                'Bilingual settings UI (zh/en) following the Tabby locale',
                'Bilingual README: English as the primary document, Chinese in README.zh-CN.md',
            ],
        },
    },
]
