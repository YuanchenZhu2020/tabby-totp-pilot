import { LocalizedError } from './i18n'

export const SECRET_STORAGE_ACCOUNT = 'totp-secret'
export const RULE_ID_PATTERN = /^[a-z0-9-]+$/
const STORAGE_HOST_PREFIX = 'tabby-totp-pilot-'

export interface SecretStorageProfileLike {
    type: 'ssh'
    name: string
    options: {
        host: string
        user: string
    }
}

export function isValidRuleId (ruleId: string): boolean {
    return RULE_ID_PATTERN.test(ruleId.trim().toLowerCase())
}

export function createSecretStorageProfile (ruleId: string): SecretStorageProfileLike {
    const normalizedId = ruleId.trim().toLowerCase()
    if (!isValidRuleId(normalizedId)) {
        throw new LocalizedError('invalidRuleIdFormat')
    }

    return {
        type: 'ssh',
        name: 'Tabby TOTP Pilot secret',
        options: {
            host: `${STORAGE_HOST_PREFIX}${normalizedId}`,
            user: SECRET_STORAGE_ACCOUNT,
        },
    }
}
