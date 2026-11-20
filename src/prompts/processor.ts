import { findOtpPromptIndex } from './classifier'
import { generateTotp, getTotpTimeStep, resolveTotpParameters } from '../totp/generator'
import { KeyboardInteractivePromptLike, TotpRule } from '../types'

export type PromptProcessingStatus = 'loading'|'filled'|'submitted'|'ignored'

export interface PromptProcessingResult {
    status: PromptProcessingStatus
    reason?: 'incompatible'|'not-otp'|'missing-secret'|'duplicate-step'|'processing-error'|'waiting-for-responses'
    retryAfterMs?: number
}

interface PromptState {
    status: PromptProcessingStatus
    ruleId: string
    otpIndex?: number
    filledStep?: number
    retryAt?: number
    retryCount?: number
}

const PROCESSING_RETRY_BASE_MS = 3000
const PROCESSING_RETRY_MAX_MS = 30_000

export interface PromptProcessorOptions {
    loadSecret: (ruleId: string) => Promise<string|null>
    now?: () => number
}

export function isCompatiblePrompt (value: unknown): value is KeyboardInteractivePromptLike {
    if (!value || typeof value !== 'object') {
        return false
    }
    const prompt = value as Partial<KeyboardInteractivePromptLike>
    return typeof prompt.name === 'string'
        && typeof prompt.instruction === 'string'
        && Array.isArray(prompt.prompts)
        && Array.isArray(prompt.responses)
        && prompt.prompts.length === prompt.responses.length
        && typeof prompt.respond === 'function'
}

export class TotpPromptProcessor {
    private states = new WeakMap<KeyboardInteractivePromptLike, PromptState>()
    private lastSubmittedStepByTab = new WeakMap<object, Map<string, number>>()
    private now: () => number

    constructor (private options: PromptProcessorOptions) {
        this.now = options.now ?? Date.now
    }

    async process (tab: object, rule: TotpRule, value: unknown): Promise<PromptProcessingResult> {
        if (!isCompatiblePrompt(value)) {
            return { status: 'ignored', reason: 'incompatible' }
        }

        const existingState = this.states.get(value)
        if (existingState) {
            if (existingState.retryAt !== undefined && this.now() >= existingState.retryAt) {
                this.states.delete(value)
            } else if (existingState.status === 'filled') {
                return this.refreshAndSubmit(tab, rule, value, existingState)
            } else {
                return { status: existingState.status }
            }
        }

        const retryCount = existingState?.retryCount ?? 0
        const otpIndex = findOtpPromptIndex(value)
        if (otpIndex === null) {
            this.states.set(value, { status: 'ignored', ruleId: rule.id })
            return { status: 'ignored', reason: 'not-otp' }
        }

        this.states.set(value, { status: 'loading', ruleId: rule.id })
        try {
            const secret = await this.options.loadSecret(rule.id)
            if (!secret) {
                this.states.set(value, { status: 'ignored', ruleId: rule.id })
                return { status: 'ignored', reason: 'missing-secret' }
            }

            const parameters = resolveTotpParameters(rule)
            const now = this.now()
            value.responses[otpIndex] = generateTotp(secret, now, parameters)
            this.states.set(value, {
                status: 'filled',
                ruleId: rule.id,
                otpIndex,
                filledStep: getTotpTimeStep(now, parameters.periodSeconds),
            })
            return this.trySubmit(tab, rule, value)
        } catch {
            // 瞬时故障（如 Vault 未解锁）不应永久放弃该提示：按指数退避安排重试
            const delay = Math.min(PROCESSING_RETRY_BASE_MS * 2 ** retryCount, PROCESSING_RETRY_MAX_MS)
            this.states.set(value, {
                status: 'ignored',
                ruleId: rule.id,
                retryAt: this.now() + delay,
                retryCount: retryCount + 1,
            })
            return { status: 'ignored', reason: 'processing-error', retryAfterMs: delay }
        }
    }

    private async refreshAndSubmit (tab: object, rule: TotpRule, prompt: KeyboardInteractivePromptLike, state: PromptState): Promise<PromptProcessingResult> {
        const otpIndex = state.otpIndex
        const periodSeconds = resolveTotpParameters(rule).periodSeconds
        const currentStep = getTotpTimeStep(this.now(), periodSeconds)
        if (otpIndex !== undefined && state.filledStep !== undefined && currentStep !== state.filledStep && prompt.responses[otpIndex]) {
            try {
                const secret = await this.options.loadSecret(rule.id)
                if (secret) {
                    const now = this.now()
                    prompt.responses[otpIndex] = generateTotp(secret, now, resolveTotpParameters(rule))
                    state.filledStep = getTotpTimeStep(now, periodSeconds)
                }
            } catch {
                // 刷新失败保留旧验证码继续提交，提交结果由服务器裁决
            }
        }
        return this.trySubmit(tab, rule, prompt)
    }

    private trySubmit (tab: object, rule: TotpRule, prompt: KeyboardInteractivePromptLike): PromptProcessingResult {
        if (prompt.responses.some(response => !response)) {
            return { status: 'filled', reason: 'waiting-for-responses' }
        }

        const timeStep = getTotpTimeStep(this.now(), resolveTotpParameters(rule).periodSeconds)
        let submittedSteps = this.lastSubmittedStepByTab.get(tab)
        if (!submittedSteps) {
            submittedSteps = new Map<string, number>()
            this.lastSubmittedStepByTab.set(tab, submittedSteps)
        }
        if (submittedSteps.get(rule.id) === timeStep) {
            this.states.set(prompt, { status: 'ignored', ruleId: rule.id })
            return { status: 'ignored', reason: 'duplicate-step' }
        }

        prompt.respond()
        submittedSteps.set(rule.id, timeStep)
        this.states.set(prompt, { status: 'submitted', ruleId: rule.id })
        return { status: 'submitted' }
    }
}
