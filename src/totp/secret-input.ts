import { LocalizedError } from '../i18n'
import { DEFAULT_TOTP_PARAMETERS, TOTP_ALGORITHMS, TotpParameters } from '../types'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

const OTPAUTH_PREFIX = /^otpauth:\/\//i
const OTPAUTH_SHORTHAND = /^otpauth:\/\/secret=([^&#/?]+)$/i

export interface ParsedTotpSecretInput {
    secret: string
    parameters: TotpParameters
}

export function normalizeBase32Secret (input: string): string {
    const compact = input.trim().replace(/\s+/g, '').toUpperCase()
    const unpadded = compact.replace(/=+$/, '')

    if (!unpadded || unpadded.includes('=') || !/^[A-Z2-7]+$/.test(unpadded)) {
        throw new LocalizedError('secretNotBase32')
    }

    return unpadded
}

export function normalizeTotpSecretInput (input: string): ParsedTotpSecretInput {
    const trimmed = input.trim()
    if (!OTPAUTH_PREFIX.test(trimmed)) {
        return { secret: normalizeBase32Secret(trimmed), parameters: { ...DEFAULT_TOTP_PARAMETERS } }
    }

    const shorthandMatch = OTPAUTH_SHORTHAND.exec(trimmed)
    if (shorthandMatch) {
        return {
            secret: normalizeBase32Secret(decodeSecretParameter(shorthandMatch[1])),
            parameters: { ...DEFAULT_TOTP_PARAMETERS },
        }
    }

    let uri: URL
    try {
        uri = new URL(trimmed)
    } catch {
        throw new LocalizedError('otpauthInvalidFormat')
    }

    if (uri.protocol.toLowerCase() !== 'otpauth:' || uri.hostname.toLowerCase() !== 'totp') {
        throw new LocalizedError('otpauthNotTotp')
    }

    const parameters = parseTotpUriParameters(uri)
    const secret = uri.searchParams.get('secret')
    if (!secret) {
        throw new LocalizedError('otpauthMissingSecret')
    }

    return { secret: normalizeBase32Secret(secret), parameters }
}

function parseTotpUriParameters (uri: URL): TotpParameters {
    const algorithms = uri.searchParams.getAll('algorithm').map(value => value.toUpperCase())
    const digits = uri.searchParams.getAll('digits')
    const periods = uri.searchParams.getAll('period')

    requireConsistentParameters(algorithms, 'algorithm')
    requireConsistentParameters(digits, 'digits')
    requireConsistentParameters(periods, 'period')

    const invalidAlgorithm = algorithms.find(value => !(TOTP_ALGORITHMS as readonly string[]).includes(value))
    if (invalidAlgorithm) {
        throw new LocalizedError('unsupportedAlgorithm', [invalidAlgorithm])
    }
    const invalidDigits = digits.find(value => value !== '6' && value !== '8')
    if (invalidDigits) {
        throw new LocalizedError('digitsInvalid')
    }
    const invalidPeriod = periods.find(value => !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 3600)
    if (invalidPeriod) {
        throw new LocalizedError('periodInvalid')
    }

    return {
        algorithm: algorithms[0] as TotpParameters['algorithm'] ?? DEFAULT_TOTP_PARAMETERS.algorithm,
        digits: digits.length ? Number(digits[0]) : DEFAULT_TOTP_PARAMETERS.digits,
        periodSeconds: periods.length ? Number(periods[0]) : DEFAULT_TOTP_PARAMETERS.periodSeconds,
    }
}

function requireConsistentParameters (values: string[], name: string): void {
    if (values.length > 1 && values.some(value => value !== values[0])) {
        throw new LocalizedError('otpauthDuplicateParam', [name])
    }
}

function decodeSecretParameter (value: string): string {
    try {
        return decodeURIComponent(value)
    } catch {
        throw new LocalizedError('otpauthSecretEncoding')
    }
}

const decodedCache = new Map<string, Buffer>()

export function decodeBase32 (input: string): Buffer {
    const normalized = normalizeBase32Secret(input)
    const cached = decodedCache.get(normalized)
    if (cached) {
        return cached
    }

    const bytes: number[] = []
    let value = 0
    let bits = 0

    for (const character of normalized) {
        const index = BASE32_ALPHABET.indexOf(character)
        value = (value << 5) | index
        bits += 5

        while (bits >= 8) {
            bits -= 8
            bytes.push((value >>> bits) & 0xff)
            value &= (1 << bits) - 1
        }
    }

    const buffer = Buffer.from(bytes)
    decodedCache.set(normalized, buffer)
    return buffer
}
