import { test } from 'node:test'
import assert from 'node:assert/strict'
import { updatePluginConfigStore } from '../src/config-store'
import { createPersistedConfig } from '../src/rules'
import { createSecretStorageProfile } from '../src/storage-key'
import { TotpPluginConfig, TotpRule } from '../src/types'

test('updatePluginConfigStore mutates the existing node in place and copies rules', () => {
    const node: TotpPluginConfig = { enabled: true, rules: [] }
    const store: Record<string, unknown> = { totpPilot: node }
    const next: TotpPluginConfig = {
        enabled: false,
        rules: [{ id: 'a', enabled: true, host: 'h', port: 22, username: 'u' }],
    }

    updatePluginConfigStore(store, next)

    assert.equal(store['totpPilot'], node)
    assert.equal(node.enabled, false)
    assert.deepEqual(node.rules, next.rules)

    next.rules[0].host = 'changed'
    assert.equal(node.rules[0].host, 'h')
})

test('updatePluginConfigStore throws when the config node is missing', () => {
    assert.throws(() => updatePluginConfigStore({}, { enabled: true, rules: [] }), /config node unavailable/)
})

test('createPersistedConfig keeps only structural rule fields (no secrets)', () => {
    const dirtyRule = {
        id: 'a',
        enabled: true,
        host: 'h',
        port: 22,
        username: 'u',
        secret: 'JBSWY3DP',
        totpSecret: 'JBSWY3DP',
        password: 'hunter2',
    } as TotpRule

    const persisted = createPersistedConfig(true, [dirtyRule])
    assert.deepEqual(Object.keys(persisted), ['enabled', 'rules'])
    for (const rule of persisted.rules) {
        assert.deepEqual(
            Object.keys(rule).sort(),
            ['algorithm', 'digits', 'enabled', 'host', 'id', 'periodSeconds', 'port', 'username'],
        )
    }

    const store: Record<string, unknown> = { totpPilot: { enabled: true, rules: [] } }
    updatePluginConfigStore(store, persisted)
    assert.ok(!JSON.stringify(store).includes('JBSWY3DP'))
    assert.ok(!JSON.stringify(store).includes('hunter2'))
})

test('createSecretStorageProfile derives isolated keys from the rule id', () => {
    const profile = createSecretStorageProfile('Rule-01')
    assert.equal(profile.type, 'ssh')
    assert.equal(profile.name, 'Tabby TOTP Pilot secret')
    assert.equal(profile.options.host, 'tabby-totp-pilot-rule-01')
    assert.equal(profile.options.user, 'totp-secret')

    const other = createSecretStorageProfile('rule-02')
    assert.notEqual(other.options.host, profile.options.host)
})

test('createSecretStorageProfile rejects malformed rule ids', () => {
    assert.throws(() => createSecretStorageProfile('has space'), /Invalid rule ID format/)
    assert.throws(() => createSecretStorageProfile('has@at'), /Invalid rule ID format/)
    assert.throws(() => createSecretStorageProfile('has_underscore'), /Invalid rule ID format/)
    assert.throws(() => createSecretStorageProfile('  '), /Invalid rule ID format/)
})
