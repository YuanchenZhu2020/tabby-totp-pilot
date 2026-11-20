import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    decodeBase32,
    normalizeBase32Secret,
    normalizeTotpSecretInput,
} from '../src/totp/secret-input'
import {
    generateTotp,
    getMillisecondsUntilNextTotpStep,
    getTotpTimeStep,
} from '../src/totp/generator'
import { DEFAULT_TOTP_PARAMETERS, TotpParameters } from '../src/types'

function base32Of (input: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let bits = 0
    let value = 0
    let output = ''
    for (const byte of Buffer.from(input, 'ascii')) {
        value = (value << 8) | byte
        bits += 8
        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31]
            bits -= 5
        }
    }
    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31]
    }
    return output
}

test('base32Of round-trips through decodeBase32', () => {
    assert.equal(base32Of('Hello'), 'JBSWY3DP')
    assert.deepEqual(decodeBase32(base32Of('12345678901234567890')), Buffer.from('12345678901234567890'))
})

test('normalizeBase32Secret trims, uppercases, strips whitespace and padding', () => {
    assert.equal(normalizeBase32Secret(' jbsw y3dp== '), 'JBSWY3DP')
    assert.equal(normalizeBase32Secret('JBSWY3DP'), 'JBSWY3DP')
})

test('normalizeBase32Secret rejects invalid characters and inner padding', () => {
    assert.throws(() => normalizeBase32Secret(''), /Base32/)
    assert.throws(() => normalizeBase32Secret('JBSW=Y3DP'), /Base32/)
    assert.throws(() => normalizeBase32Secret('JBSWY3DP1'), /Base32/)
    assert.throws(() => normalizeBase32Secret('JBSWY3DP0'), /Base32/)
    assert.throws(() => normalizeBase32Secret('JBSWY3DP8'), /Base32/)
})

test('normalizeTotpSecretInput accepts plain Base32 with default parameters', () => {
    assert.deepEqual(normalizeTotpSecretInput('jbsw y3dp'), {
        secret: 'JBSWY3DP',
        parameters: { ...DEFAULT_TOTP_PARAMETERS },
    })
})

test('normalizeTotpSecretInput accepts the otpauth://secret= shorthand', () => {
    assert.deepEqual(normalizeTotpSecretInput('otpauth://secret=JBSWY3DP'), {
        secret: 'JBSWY3DP',
        parameters: { ...DEFAULT_TOTP_PARAMETERS },
    })
    assert.deepEqual(normalizeTotpSecretInput('otpauth://secret=%4ABSWY3DP'), {
        secret: 'JBSWY3DP',
        parameters: { ...DEFAULT_TOTP_PARAMETERS },
    })
    assert.throws(() => normalizeTotpSecretInput('otpauth://secret=%ZZ'), /Invalid secret encoding/)
})

test('normalizeTotpSecretInput rejects shorthand URIs with trailing parameters', () => {
    assert.throws(() => normalizeTotpSecretInput('otpauth://secret=JBSWY3DP&algorithm=SHA256'))
    assert.throws(() => normalizeTotpSecretInput('otpauth://secret=JBSWY3DP?digits=8'))
    assert.throws(() => normalizeTotpSecretInput('otpauth://secret=JBSWY3DP#frag'))
})

test('normalizeTotpSecretInput accepts standard otpauth://totp URIs', () => {
    const uri = 'otpauth://totp/Example:xjc?secret=JBSWY3DP&issuer=Example'
    assert.deepEqual(normalizeTotpSecretInput(uri), {
        secret: 'JBSWY3DP',
        parameters: { ...DEFAULT_TOTP_PARAMETERS },
    })
    assert.deepEqual(
        normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&algorithm=SHA1&digits=6&period=30'),
        { secret: 'JBSWY3DP', parameters: { algorithm: 'SHA1', digits: 6, periodSeconds: 30 } },
    )
})

test('normalizeTotpSecretInput parses non-default algorithm, digits and period', () => {
    assert.deepEqual(
        normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&algorithm=SHA256&digits=8&period=60'),
        { secret: 'JBSWY3DP', parameters: { algorithm: 'SHA256', digits: 8, periodSeconds: 60 } },
    )
    assert.deepEqual(
        normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&algorithm=sha512'),
        { secret: 'JBSWY3DP', parameters: { algorithm: 'SHA512', digits: 6, periodSeconds: 30 } },
    )
})

test('normalizeTotpSecretInput rejects unsupported parameters and shapes', () => {
    assert.throws(() => normalizeTotpSecretInput('otpauth://hotp/x?secret=JBSWY3DP'), /totp/)
    assert.throws(() => normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&algorithm=MD5'), /Unsupported TOTP algorithm/)
    assert.throws(() => normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&digits=7'), /6 or 8 digits/)
    assert.throws(() => normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&period=0'), /period/)
    assert.throws(() => normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&period=90.5'), /period/)
    assert.throws(() => normalizeTotpSecretInput('otpauth://totp/x?issuer=E'), /secret/)
    assert.throws(() => normalizeTotpSecretInput('otpauth://totp:x?secret=JBSWY3DP'), /Invalid otpauth URI format/)
})

test('normalizeTotpSecretInput rejects inconsistent repeated parameters', () => {
    assert.throws(() => normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&digits=6&digits=8'), /Conflicting duplicate/)
    assert.throws(() => normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&algorithm=SHA1&algorithm=SHA256'), /Conflicting duplicate/)
    assert.throws(() => normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&period=30&period=60'), /Conflicting duplicate/)
    assert.doesNotThrow(() => normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP&digits=6&digits=6'))
})

test('decodeBase32 converts Base32 to bytes', () => {
    assert.deepEqual(decodeBase32('JBSWY3DP'), Buffer.from('Hello'))
    assert.deepEqual(decodeBase32('GEZDGNBVGY3TQOJQ'), Buffer.from('1234567890'))
    assert.deepEqual(decodeBase32(normalizeTotpSecretInput('otpauth://totp/x?secret=JBSWY3DP').secret), Buffer.from('Hello'))
})

test('getTotpTimeStep and getMillisecondsUntilNextTotpStep follow the 30s window', () => {
    assert.equal(getTotpTimeStep(59_000), 1)
    assert.equal(getTotpTimeStep(59_999), 1)
    assert.equal(getTotpTimeStep(60_000), 2)
    assert.equal(getMillisecondsUntilNextTotpStep(59_000), 1000)
    assert.equal(getMillisecondsUntilNextTotpStep(60_000), 30_000)
})

test('time step helpers honor a custom period', () => {
    assert.equal(getTotpTimeStep(59_000, 60), 0)
    assert.equal(getTotpTimeStep(60_000, 60), 1)
    assert.equal(getTotpTimeStep(119_999, 60), 1)
    assert.equal(getMillisecondsUntilNextTotpStep(119_000, 60), 1000)
})

test('generateTotp matches RFC 6238 SHA-1 test vectors (6-digit truncation)', () => {
    const seed = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    const vectors: Array<[number, string]> = [
        [59, '287082'],
        [1_111_111_109, '081804'],
        [1_111_111_111, '050471'],
        [1_234_567_890, '005924'],
        [2_000_000_000, '279037'],
        [20_000_000_000, '353130'],
    ]
    for (const [seconds, expected] of vectors) {
        assert.equal(generateTotp(seed, seconds * 1000), expected, `T=${seconds}`)
    }
})

test('generateTotp matches RFC 6238 SHA-1 vector for 8 digits', () => {
    const seed = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    assert.equal(generateTotp(seed, 59_000, { algorithm: 'SHA1', digits: 8, periodSeconds: 30 }), '94287082')
})

test('generateTotp matches RFC 6238 SHA-256 and SHA-512 vectors (8-digit truncation)', () => {
    const sha256Seed = base32Of('12345678901234567890123456789012')
    const sha512Seed = base32Of('1234567890123456789012345678901234567890123456789012345678901234')
    const vectors: Array<[number, TotpParameters, string, string]> = [
        [59, { algorithm: 'SHA256', digits: 8, periodSeconds: 30 }, sha256Seed, '46119246'],
        [59, { algorithm: 'SHA512', digits: 8, periodSeconds: 30 }, sha512Seed, '90693936'],
        [1_111_111_109, { algorithm: 'SHA256', digits: 8, periodSeconds: 30 }, sha256Seed, '68084774'],
        [1_111_111_109, { algorithm: 'SHA512', digits: 8, periodSeconds: 30 }, sha512Seed, '25091201'],
        [1_234_567_890, { algorithm: 'SHA256', digits: 8, periodSeconds: 30 }, sha256Seed, '91819424'],
        [1_234_567_890, { algorithm: 'SHA512', digits: 8, periodSeconds: 30 }, sha512Seed, '93441116'],
    ]
    for (const [seconds, parameters, seed, expected] of vectors) {
        assert.equal(generateTotp(seed, seconds * 1000, parameters), expected, `T=${seconds} ${parameters.algorithm}`)
    }
})

test('generateTotp honors a custom period', () => {
    const seed = 'JBSWY3DP'
    const parameters: TotpParameters = { algorithm: 'SHA1', digits: 6, periodSeconds: 60 }
    const code = generateTotp(seed, 120_000, parameters)
    assert.equal(generateTotp(seed, 179_000, parameters), code)
    assert.notEqual(generateTotp(seed, 180_000, parameters), code)
})

test('generateTotp output matches the configured digit count', () => {
    assert.match(generateTotp('JBSWY3DP', 0), /^\d{6}$/)
    assert.match(generateTotp('JBSWY3DP', 0, { algorithm: 'SHA256', digits: 8, periodSeconds: 30 }), /^\d{8}$/)
})
