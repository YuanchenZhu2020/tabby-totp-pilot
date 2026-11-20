import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    compilePattern,
    createEmptyRule,
    createRuleId,
    findDuplicateRuleIds,
    findMatchingRule,
    getRuleIdentityKey,
    hasGlobMeta,
    normalizeHost,
    normalizePort,
    normalizeRule,
    normalizeUsername,
    validateRule,
} from '../src/rules'
import { TotpPluginConfig, TotpRule } from '../src/types'

function makeRule (overrides: Partial<TotpRule>): TotpRule {
    return { ...createEmptyRule(), ...overrides }
}

function makeConfig (rules: TotpRule[], enabled = true): TotpPluginConfig {
    return { enabled, rules }
}

test('createRuleId returns unique ids', () => {
    assert.notEqual(createRuleId(), createRuleId())
})

test('createEmptyRule defaults to enabled, port 22, empty host and username', () => {
    const rule = createEmptyRule()
    assert.equal(rule.enabled, true)
    assert.equal(rule.port, 22)
    assert.equal(rule.host, '')
    assert.equal(rule.username, '')
})

test('normalizeHost trims, lowercases and strips IPv6 brackets', () => {
    assert.equal(normalizeHost('  Example.COM '), 'example.com')
    assert.equal(normalizeHost('[::1]'), '::1')
    assert.equal(normalizeHost('server.example.com'), 'server.example.com')
})

test('normalizePort defaults empty values to 22 and validates range', () => {
    assert.equal(normalizePort(null), 22)
    assert.equal(normalizePort(undefined), 22)
    assert.equal(normalizePort(''), 22)
    assert.equal(normalizePort('2222'), 2222)
    assert.equal(normalizePort(2022), 2022)
    assert.throws(() => normalizePort(0))
    assert.throws(() => normalizePort(70000))
    assert.throws(() => normalizePort(22.5))
    assert.throws(() => normalizePort('abc'))
})

test('normalizeUsername trims whitespace only', () => {
    assert.equal(normalizeUsername('  xjc '), 'xjc')
    assert.equal(normalizeUsername('root@10.0.0.1@xjc'), 'root@10.0.0.1@xjc')
})

test('normalizeRule fills TOTP parameter defaults and validates values', () => {
    const normalized = normalizeRule(makeRule({ host: 'h', username: 'u' }))
    assert.equal(normalized.algorithm, 'SHA1')
    assert.equal(normalized.digits, 6)
    assert.equal(normalized.periodSeconds, 30)

    const custom = normalizeRule({
        ...makeRule({ host: 'h', username: 'u' }),
        algorithm: 'sha256',
        digits: '8',
        periodSeconds: '60',
    } as unknown as TotpRule)
    assert.deepEqual({ algorithm: custom.algorithm, digits: custom.digits, periodSeconds: custom.periodSeconds }, {
        algorithm: 'SHA256',
        digits: 8,
        periodSeconds: 60,
    })

    assert.throws(() => normalizeRule({ ...makeRule({ host: 'h', username: 'u' }), algorithm: 'MD5' } as unknown as TotpRule), /Unsupported TOTP algorithm/)
    assert.throws(() => normalizeRule(makeRule({ host: 'h', username: 'u', digits: 7 })), /6 or 8 digits/)
    assert.throws(() => normalizeRule(makeRule({ host: 'h', username: 'u', periodSeconds: 0 })), /period/)
})

test('validateRule accepts rules with valid TOTP parameters', () => {
    assert.doesNotThrow(() => validateRule(makeRule({ host: 'h', username: 'u', algorithm: 'SHA512', digits: 8, periodSeconds: 90 })))
})

test('normalizeRule folds legacy pattern fields back into the primary fields', () => {
    const legacy = {
        id: 'a',
        enabled: true,
        host: '',
        hostPattern: ' jump* ',
        port: 22,
        username: '',
        usernamePattern: '*@xjc',
    } as TotpRule
    const normalized = normalizeRule(legacy)
    assert.equal(normalized.host, 'jump*')
    assert.equal(normalized.username, '*@xjc')
    assert.equal('hostPattern' in normalized, false)
    assert.equal('usernamePattern' in normalized, false)
})

test('normalizeRule trims host and username', () => {
    const normalized = normalizeRule(makeRule({ host: 'JUMP.CORP.COM', username: ' xjc ' }))
    assert.equal(normalized.host, 'jump.corp.com')
    assert.equal(normalized.username, 'xjc')
})

test('hasGlobMeta detects wildcards', () => {
    assert.equal(hasGlobMeta('jump*.corp.com'), true)
    assert.equal(hasGlobMeta('root@10.0.0.?@xjc'), true)
    assert.equal(hasGlobMeta('server.example.com'), false)
    assert.equal(hasGlobMeta(''), false)
})

test('compilePattern supports * and ? and treats other characters literally', () => {
    assert.ok(compilePattern('a*b').test('axxb'))
    assert.ok(compilePattern('a*b').test('ab'))
    assert.ok(!compilePattern('a*b').test('axxbxc'))
    assert.ok(compilePattern('a?c').test('abc'))
    assert.ok(!compilePattern('a?c').test('ac'))
    assert.ok(compilePattern('a.c').test('a.c'))
    assert.ok(!compilePattern('a.c').test('abc'))
    assert.ok(compilePattern('[a-z]').test('[a-z]'))
    assert.ok(!compilePattern('[a-z]').test('a'))
    assert.ok(compilePattern('root@*@xjc').test('root@10.0.0.1@xjc'))
})

test('validateRule requires id, host and username', () => {
    assert.throws(() => validateRule(makeRule({ id: '  ' })), /Rule ID cannot be empty/)
    assert.throws(() => validateRule(makeRule({ host: '' })), /Host or IP cannot be empty/)
    assert.throws(() => validateRule(makeRule({ username: '', host: 'h' })), /Username cannot be empty/)
    assert.doesNotThrow(() => validateRule(makeRule({ host: 'jump*.corp.com', username: 'xjc' })))
    assert.doesNotThrow(() => validateRule(makeRule({ host: 'jump.corp.com', username: '*@xjc' })))
})

test('validateRule rejects ids outside the storage-key alphabet', () => {
    assert.throws(() => validateRule(makeRule({ id: 'has space' })), /Rule ID can only contain/)
    assert.throws(() => validateRule(makeRule({ id: 'has_underscore' })), /Rule ID can only contain/)
    assert.throws(() => validateRule(makeRule({ id: 'has@at' })), /Rule ID can only contain/)
    assert.doesNotThrow(() => validateRule(makeRule({ id: 'Rule-01', host: 'h', username: 'u' })))
})

test('validateRule rejects glob values longer than 256 characters', () => {
    assert.throws(() => validateRule(makeRule({ host: '*'.repeat(257), username: 'u' })), /Host pattern is too long/)
    assert.throws(() => validateRule(makeRule({ host: 'h', username: '*'.repeat(257) })), /Username pattern is too long/)
    assert.doesNotThrow(() => validateRule(makeRule({ host: 'a'.repeat(253), username: 'u' })))
})

test('getRuleIdentityKey uses the merged field values', () => {
    const key = getRuleIdentityKey(makeRule({ id: 'a', host: 'jump*', port: 2222, username: '*@xjc' }))
    assert.equal(key, 'jump*\n2222\n*@xjc')
})

test('findDuplicateRuleIds marks all rules sharing an identity', () => {
    const a = makeRule({ id: 'a', host: 'h', username: 'u' })
    const b = makeRule({ id: 'b', host: 'H', username: ' u ' })
    const c = makeRule({ id: 'c', host: 'h', port: 2222, username: 'u' })
    const duplicates = findDuplicateRuleIds([a, b, c])
    assert.deepEqual([...duplicates].sort(), ['a', 'b'])
    assert.equal(findDuplicateRuleIds([a, c]).size, 0)
})

test('findDuplicateRuleIds detects identical glob rules', () => {
    const a = makeRule({ id: 'a', host: 'jump*', username: '*@xjc' })
    const b = makeRule({ id: 'b', host: 'jump*', username: '*@xjc' })
    assert.deepEqual([...findDuplicateRuleIds([a, b])].sort(), ['a', 'b'])
})

test('findDuplicateRuleIds treats empty ids as duplicate participants', () => {
    const a = makeRule({ id: '', host: 'h', username: 'u' })
    const b = makeRule({ id: 'b', host: 'h', username: 'u' })
    assert.deepEqual([...findDuplicateRuleIds([a, b])].sort(), ['', 'b'])
})

function matchedRule (config: TotpPluginConfig, options: { host?: string, port?: number, user?: string, jumpHost?: string|null }): TotpRule|null {
    return findMatchingRule(config, { type: 'ssh', options })
}

test('findMatchingRule matches exact host, port and username', () => {
    const rule = makeRule({ id: 'a', host: 'server.example.com', port: 22, username: 'xjc' })
    const matched = matchedRule(makeConfig([rule]), { host: 'Server.Example.Com', user: ' xjc ' })
    assert.equal(matched?.id, 'a')
})

test('findMatchingRule skips disabled rules, disabled config and jump-host profiles', () => {
    const rule = makeRule({ id: 'a', host: 'h', username: 'u', enabled: false })
    assert.equal(matchedRule(makeConfig([rule]), { host: 'h', user: 'u' }), null)
    assert.equal(matchedRule(makeConfig([makeRule({ id: 'b', host: 'h', username: 'u' })], false), { host: 'h', user: 'u' }), null)
    assert.equal(matchedRule(makeConfig([makeRule({ id: 'c', host: 'h', username: 'u' })]), { host: 'h', user: 'u', jumpHost: 'jump-host-profile' }), null)
})

test('findMatchingRule supports glob host matching case-insensitively', () => {
    const rule = makeRule({ id: 'a', host: 'JUMP*.CORP.COM', username: 'xjc' })
    assert.equal(matchedRule(makeConfig([rule]), { host: 'jump01.corp.com', user: 'xjc' })?.id, 'a')
    assert.equal(matchedRule(makeConfig([rule]), { host: 'mail.corp.com', user: 'xjc' }), null)
})

test('findMatchingRule supports glob username matching for bastion asset logins', () => {
    const rule = makeRule({ id: 'a', host: 'jump.corp.com', username: '*@xjc' })
    assert.equal(matchedRule(makeConfig([rule]), { host: 'jump.corp.com', user: 'root@10.0.0.1@xjc' })?.id, 'a')
    assert.equal(matchedRule(makeConfig([rule]), { host: 'jump.corp.com', user: 'root@10.0.0.1@XJC' }), null)
    assert.equal(matchedRule(makeConfig([rule]), { host: 'other.corp.com', user: 'root@10.0.0.1@xjc' }), null)
})

test('findMatchingRule returns the first matching rule in list order', () => {
    const glob = makeRule({ id: 'glob', host: 'jump*', username: '*@xjc' })
    const exact = makeRule({ id: 'exact', host: 'jump01.corp.com', username: 'root@10.0.0.1@xjc' })
    assert.equal(matchedRule(makeConfig([glob, exact]), { host: 'jump01.corp.com', user: 'root@10.0.0.1@xjc' })?.id, 'glob')
    assert.equal(matchedRule(makeConfig([exact, glob]), { host: 'jump01.corp.com', user: 'root@10.0.0.1@xjc' })?.id, 'exact')
})

test('findMatchingRule keeps exact matching for values without wildcards', () => {
    const rule = makeRule({ id: 'a', host: 'h', username: 'u' })
    assert.equal(matchedRule(makeConfig([rule]), { host: 'hx', user: 'u' }), null)
    assert.equal(matchedRule(makeConfig([rule]), { host: 'h', user: 'ux' }), null)
})

test('findMatchingRule skips overlong glob rules without throwing', () => {
    const longGlob = makeRule({ id: 'long', host: `*${'a'.repeat(300)}`, username: 'u' })
    assert.equal(matchedRule(makeConfig([longGlob]), { host: `x${'a'.repeat(300)}`, user: 'u' }), null)
    const good = makeRule({ id: 'good', host: 'h', username: 'u' })
    assert.equal(matchedRule(makeConfig([good]), { host: 'h', user: 'u' })?.id, 'good')
})

test('findMatchingRule skips rules with invalid fields instead of failing the whole match', () => {
    const broken = makeRule({ id: 'broken', host: 'h', port: 99_999, username: 'u' })
    const good = makeRule({ id: 'good', host: 'h2', username: 'u' })
    assert.equal(matchedRule(makeConfig([broken, good]), { host: 'h2', user: 'u' })?.id, 'good')
    assert.equal(matchedRule(makeConfig([broken]), { host: 'h', user: 'u' }), null)
})

test('findMatchingRule skips rules with invalid TOTP parameters and returns normalized rules', () => {
    const brokenParams = { ...makeRule({ id: 'broken-params', host: 'h', username: 'u' }), algorithm: 'MD5' } as unknown as TotpRule
    assert.equal(matchedRule(makeConfig([brokenParams]), { host: 'h', user: 'u' }), null)

    const unnormalized = { id: 'raw', enabled: true, host: ' H ', port: '22', username: ' u ', algorithm: 'sha512', digits: '8', periodSeconds: '60' } as unknown as TotpRule
    const matched = matchedRule(makeConfig([unnormalized]), { host: 'h', user: 'u' })
    assert.equal(matched?.id, 'raw')
    assert.equal(matched?.host, 'h')
    assert.equal(matched?.port, 22)
    assert.equal(matched?.username, 'u')
    assert.equal(matched?.algorithm, 'SHA512')
    assert.equal(matched?.digits, 8)
    assert.equal(matched?.periodSeconds, 60)
})

test('findMatchingRule stays correct across repeated calls with the same config', () => {
    const config = makeConfig([
        makeRule({ id: 'glob', host: 'jump*', username: '*@xjc' }),
        makeRule({ id: 'exact', host: 'jump01.corp.com', username: 'root@10.0.0.1@xjc' }),
    ])
    for (let index = 0; index < 3; index++) {
        assert.equal(matchedRule(config, { host: 'jump01.corp.com', user: 'root@10.0.0.1@xjc' })?.id, 'glob')
        assert.equal(matchedRule(config, { host: 'other.corp.com', user: 'root@10.0.0.1@xjc' }), null)
    }
})
