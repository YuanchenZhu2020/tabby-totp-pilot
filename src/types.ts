export const CONFIG_KEY = 'totpPilot'
export const DEFAULT_SSH_PORT = 22
export const TOTP_PERIOD_SECONDS = 30

export type TotpAlgorithm = 'SHA1'|'SHA256'|'SHA512'
export const TOTP_ALGORITHMS: readonly TotpAlgorithm[] = ['SHA1', 'SHA256', 'SHA512']

export interface TotpParameters {
    algorithm: TotpAlgorithm
    digits: number
    periodSeconds: number
}

export const DEFAULT_TOTP_PARAMETERS: TotpParameters = {
    algorithm: 'SHA1',
    digits: 6,
    periodSeconds: TOTP_PERIOD_SECONDS,
}

export interface TotpRule {
    id: string
    enabled: boolean
    host: string
    port: number
    username: string
    algorithm?: TotpAlgorithm
    digits?: number
    periodSeconds?: number
}

export interface TotpPluginConfig {
    enabled: boolean
    rules: TotpRule[]
}

export interface SshProfileOptionsLike {
    host?: string
    port?: number|null
    user?: string
    jumpHost?: string|null
}

export interface SshProfileLike {
    type?: string
    options?: SshProfileOptionsLike
}

export interface KeyboardInteractiveFieldLike {
    prompt: string
    echo?: boolean
}

export interface KeyboardInteractivePromptLike {
    name: string
    instruction: string
    prompts: KeyboardInteractiveFieldLike[]
    responses: string[]
    respond: () => void
}
