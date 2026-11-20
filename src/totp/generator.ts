import { createHmac } from 'crypto'
import { DEFAULT_TOTP_PARAMETERS, TotpAlgorithm, TotpParameters, TOTP_PERIOD_SECONDS, TotpRule } from '../types'
import { decodeBase32 } from './secret-input'

const HMAC_ALGORITHMS: Record<TotpAlgorithm, 'sha1'|'sha256'|'sha512'> = {
    SHA1: 'sha1',
    SHA256: 'sha256',
    SHA512: 'sha512',
}

export function resolveTotpParameters (rule: Pick<TotpRule, 'algorithm'|'digits'|'periodSeconds'>): TotpParameters {
    return {
        algorithm: rule.algorithm ?? DEFAULT_TOTP_PARAMETERS.algorithm,
        digits: rule.digits ?? DEFAULT_TOTP_PARAMETERS.digits,
        periodSeconds: rule.periodSeconds ?? DEFAULT_TOTP_PARAMETERS.periodSeconds,
    }
}

export function getTotpTimeStep (timestampMs = Date.now(), periodSeconds = TOTP_PERIOD_SECONDS): number {
    return Math.floor(timestampMs / 1000 / periodSeconds)
}

export function getMillisecondsUntilNextTotpStep (timestampMs = Date.now(), periodSeconds = TOTP_PERIOD_SECONDS): number {
    const periodMs = periodSeconds * 1000
    return periodMs - (timestampMs % periodMs)
}

export function generateTotp (secret: string, timestampMs = Date.now(), parameters: TotpParameters = DEFAULT_TOTP_PARAMETERS): string {
    const counter = getTotpTimeStep(timestampMs, parameters.periodSeconds)
    const counterBuffer = Buffer.alloc(8)
    counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
    counterBuffer.writeUInt32BE(counter >>> 0, 4)

    const digest = createHmac(HMAC_ALGORITHMS[parameters.algorithm], decodeBase32(secret)).update(counterBuffer).digest()
    const offset = digest[digest.length - 1] & 0x0f
    const binary = (
        ((digest[offset] & 0x7f) << 24)
        | ((digest[offset + 1] & 0xff) << 16)
        | ((digest[offset + 2] & 0xff) << 8)
        | (digest[offset + 3] & 0xff)
    ) >>> 0

    return (binary % 10 ** parameters.digits).toString().padStart(parameters.digits, '0')
}
