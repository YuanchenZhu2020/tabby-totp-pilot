import { randomUUID } from 'crypto'
import { LocalizedError } from './i18n'
import { isValidRuleId } from './storage-key'
import { DEFAULT_SSH_PORT, DEFAULT_TOTP_PARAMETERS, SshProfileLike, TotpAlgorithm, TotpPluginConfig, TotpRule, TOTP_ALGORITHMS } from './types'

const MAX_PATTERN_LENGTH = 256
const REGEX_META = /[.*+?^${}()|[\]\\]/g

export function createRuleId (): string {
    return randomUUID()
}

export function createEmptyRule (): TotpRule {
    return {
        id: createRuleId(),
        enabled: true,
        host: '',
        port: DEFAULT_SSH_PORT,
        username: '',
        algorithm: DEFAULT_TOTP_PARAMETERS.algorithm,
        digits: DEFAULT_TOTP_PARAMETERS.digits,
        periodSeconds: DEFAULT_TOTP_PARAMETERS.periodSeconds,
    }
}

export function normalizeHost (host: string): string {
    const normalized = host.trim().toLowerCase()
    if (normalized.startsWith('[') && normalized.endsWith(']')) {
        return normalized.slice(1, -1)
    }
    return normalized
}

export function normalizePort (port: number|string|null|undefined): number {
    if (port === null || port === undefined || port === '') {
        return DEFAULT_SSH_PORT
    }
    const normalized = Number(port)
    if (!Number.isInteger(normalized) || normalized < 1 || normalized > 65535) {
        throw new LocalizedError('portInvalid')
    }
    return normalized
}

export function normalizeUsername (username: string): string {
    return username.trim()
}

export function normalizeAlgorithm (algorithm: TotpAlgorithm|string|undefined|null): TotpAlgorithm {
    const normalized = (algorithm ?? '').trim().toUpperCase()
    if (!normalized) {
        return DEFAULT_TOTP_PARAMETERS.algorithm
    }
    if (!(TOTP_ALGORITHMS as readonly string[]).includes(normalized)) {
        throw new LocalizedError('unsupportedAlgorithm', [algorithm])
    }
    return normalized as TotpAlgorithm
}

export function normalizeDigits (digits: number|string|undefined|null): number {
    if (digits === null || digits === undefined || digits === '') {
        return DEFAULT_TOTP_PARAMETERS.digits
    }
    const normalized = Number(digits)
    if (normalized !== 6 && normalized !== 8) {
        throw new LocalizedError('digitsInvalid')
    }
    return normalized
}

export function normalizePeriodSeconds (periodSeconds: number|string|undefined|null): number {
    if (periodSeconds === null || periodSeconds === undefined || periodSeconds === '') {
        return DEFAULT_TOTP_PARAMETERS.periodSeconds
    }
    const normalized = Number(periodSeconds)
    if (!Number.isInteger(normalized) || normalized < 1 || normalized > 3600) {
        throw new LocalizedError('periodInvalid')
    }
    return normalized
}

export function hasGlobMeta (value: string): boolean {
    return value.includes('*') || value.includes('?')
}

const patternCache = new Map<string, RegExp>()

export function compilePattern (pattern: string): RegExp {
    const cached = patternCache.get(pattern)
    if (cached) {
        return cached
    }

    let source = ''
    for (const character of pattern) {
        if (character === '*') {
            source += '.*'
        } else if (character === '?') {
            source += '.'
        } else {
            source += character.replace(REGEX_META, '\\$&')
        }
    }
    const compiled = new RegExp(`^${source}$`)
    patternCache.set(pattern, compiled)
    return compiled
}

export function validateGlobLength (value: string, field: 'host' | 'username'): void {
    if (value.length > MAX_PATTERN_LENGTH) {
        throw new LocalizedError(field === 'host' ? 'hostPatternTooLong' : 'usernamePatternTooLong', [MAX_PATTERN_LENGTH])
    }
}

export function normalizeRule (rule: TotpRule): TotpRule {
    const source = rule as TotpRule & { hostPattern?: string|null, usernamePattern?: string|null }
    const host = source.hostPattern || rule.host
    const username = source.usernamePattern || rule.username
    return {
        id: rule.id.trim(),
        enabled: rule.enabled,
        host: normalizeHost(host ?? ''),
        port: normalizePort(rule.port),
        username: normalizeUsername(username ?? ''),
        algorithm: normalizeAlgorithm(rule.algorithm),
        digits: normalizeDigits(rule.digits),
        periodSeconds: normalizePeriodSeconds(rule.periodSeconds),
    }
}

export function getRuleIdentityKey (rule: TotpRule): string {
    const normalized = normalizeRule(rule)
    return `${normalized.host}\n${normalized.port}\n${normalized.username}`
}

export function findDuplicateRuleIds (rules: TotpRule[]): Set<string> {
    const firstIdByKey = new Map<string, string>()
    const duplicateIds = new Set<string>()

    for (const rule of rules) {
        const key = getRuleIdentityKey(rule)
        const firstId = firstIdByKey.get(key)
        if (firstId !== undefined) {
            duplicateIds.add(firstId)
            duplicateIds.add(rule.id)
        } else {
            firstIdByKey.set(key, rule.id)
        }
    }

    return duplicateIds
}

export function validateRule (rule: TotpRule): void {
    const normalized = normalizeRule(rule)
    if (!normalized.id) {
        throw new LocalizedError('ruleIdEmpty')
    }
    if (!isValidRuleId(normalized.id)) {
        throw new LocalizedError('ruleIdChars')
    }
    if (!normalized.host) {
        throw new LocalizedError('hostEmpty')
    }
    if (!normalized.username) {
        throw new LocalizedError('usernameEmpty')
    }
    if (hasGlobMeta(normalized.host)) {
        validateGlobLength(normalized.host, 'host')
    }
    if (hasGlobMeta(normalized.username)) {
        validateGlobLength(normalized.username, 'username')
    }
}

export function createPersistedConfig (enabled: boolean, rules: TotpRule[]): TotpPluginConfig {
    return {
        enabled,
        rules: rules.map(rule => normalizeRule(rule)),
    }
}

interface CompiledRule {
    rule: TotpRule
    hostMatcher: ((value: string) => boolean)|null
    usernameMatcher: ((value: string) => boolean)|null
}

// 以规则数组身份为缓存键：设置页每次保存都会生成新数组，手工编辑配置也会替换节点，
// 因此数组身份不变即可认为内容未变
const compiledRulesCache = new WeakMap<TotpRule[], CompiledRule[]>()

function compileFieldMatcher (pattern: string): ((value: string) => boolean)|null {
    if (!hasGlobMeta(pattern)) {
        return value => value === pattern
    }
    // 超长通配符直接不匹配：设置页保存时已拒绝，这里兜底手工编辑的配置，避免热路径正则回溯失控
    if (pattern.length > MAX_PATTERN_LENGTH) {
        return null
    }
    const compiled = compilePattern(pattern)
    return value => compiled.test(value)
}

function getCompiledRules (rules: TotpRule[]): CompiledRule[] {
    let compiled = compiledRulesCache.get(rules)
    if (!compiled) {
        compiled = rules.map(rule => {
            let normalized: TotpRule
            try {
                normalized = normalizeRule(rule)
            } catch {
                // 单条手工配置的字段非法（如端口越界、算法未知）时跳过该规则，不让整条匹配链路反复抛错
                return { rule, hostMatcher: null, usernameMatcher: null }
            }
            return {
                rule: normalized,
                hostMatcher: compileFieldMatcher(normalized.host),
                usernameMatcher: compileFieldMatcher(normalized.username),
            }
        })
        compiledRulesCache.set(rules, compiled)
    }
    return compiled
}

export function findMatchingRule (config: TotpPluginConfig, profile: SshProfileLike): TotpRule|null {
    if (!config.enabled || profile.options?.jumpHost) {
        return null
    }

    const host = normalizeHost(profile.options?.host ?? '')
    const port = normalizePort(profile.options?.port)
    const username = normalizeUsername(profile.options?.user ?? '')

    for (const compiled of getCompiledRules(config.rules)) {
        const rule = compiled.rule
        if (!rule.enabled || rule.port !== port) {
            continue
        }
        if (!compiled.hostMatcher?.(host) || !compiled.usernameMatcher?.(username)) {
            continue
        }
        return rule
    }
    return null
}
