import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findOtpPromptIndex } from '../src/prompts/classifier'
import {
    isCompatiblePrompt,
    PromptProcessingResult,
    TotpPromptProcessor,
} from '../src/prompts/processor'
import { KeyboardInteractivePromptLike, TotpRule } from '../src/types'

function makePrompt (overrides: Partial<KeyboardInteractivePromptLike>): KeyboardInteractivePromptLike {
    return {
        name: 'SSH login',
        instruction: '',
        prompts: [{ prompt: 'Password:' }],
        responses: [''],
        respond: () => undefined,
        ...overrides,
    }
}

const rule: TotpRule = { id: 'rule-1', enabled: true, host: 'h', port: 22, username: 'u' }

function makeProcessor (options: { secret?: string|null, now?: () => number, loadCalls?: number[] }): TotpPromptProcessor {
    const defaultSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    return new TotpPromptProcessor({
        loadSecret: () => {
            options.loadCalls?.push(1)
            return Promise.resolve(options.secret === undefined ? defaultSecret : options.secret)
        },
        now: options.now ?? (() => 1_700_000_000_000),
    })
}

test('findOtpPromptIndex matches explicit OTP signals and Chinese keywords', () => {
    assert.equal(findOtpPromptIndex(makePrompt({ prompts: [{ prompt: 'Verification code:' }] })), 0)
    assert.equal(findOtpPromptIndex(makePrompt({ prompts: [{ prompt: '请输入动态口令:' }] })), 0)
    assert.equal(findOtpPromptIndex(makePrompt({ prompts: [{ prompt: '2FA token:' }] })), 0)
    assert.equal(findOtpPromptIndex(makePrompt({ prompts: [{ prompt: 'One-time password:' }] })), 0)
    assert.equal(findOtpPromptIndex(makePrompt({ prompts: [{ prompt: 'TOTP:' }] })), 0)
    assert.equal(findOtpPromptIndex(makePrompt({ prompts: [{ prompt: 'MFA code:' }] })), 0)
    assert.equal(findOtpPromptIndex(makePrompt({ prompts: [{ prompt: 'Passcode:' }] })), 0)
})

test('findOtpPromptIndex never targets captcha fields', () => {
    assert.equal(findOtpPromptIndex(makePrompt({
        name: 'Login',
        prompts: [{ prompt: '图形验证码:' }],
    })), null)
    assert.equal(findOtpPromptIndex(makePrompt({
        name: 'Please enter the captcha',
        prompts: [{ prompt: 'Response:' }],
    })), null)
    assert.equal(findOtpPromptIndex(makePrompt({
        prompts: [{ prompt: '图形验证码:' }, { prompt: 'Verification code:' }],
        responses: ['', ''],
    })), 1)
})

test('findOtpPromptIndex uses context signals for single-field prompts', () => {
    assert.equal(findOtpPromptIndex(makePrompt({
        name: 'Two-Step Verification',
        prompts: [{ prompt: 'Response:' }],
    })), 0)
    assert.equal(findOtpPromptIndex(makePrompt({
        name: 'Two-Step Verification',
        prompts: [{ prompt: 'Password:' }],
    })), null)
})

test('findOtpPromptIndex rejects ambiguous and password-only prompts', () => {
    assert.equal(findOtpPromptIndex(makePrompt({
        prompts: [{ prompt: 'Password:' }, { prompt: 'Verification code:' }],
        responses: ['', ''],
    })), 1)
    assert.equal(findOtpPromptIndex(makePrompt({
        prompts: [{ prompt: 'OTP A:' }, { prompt: 'OTP B:' }],
        responses: ['', ''],
    })), null)
    assert.equal(findOtpPromptIndex(makePrompt({ prompts: [{ prompt: 'Password:' }] })), null)
})

test('isCompatiblePrompt checks structure and length alignment', () => {
    assert.equal(isCompatiblePrompt(null), false)
    assert.equal(isCompatiblePrompt('text'), false)
    assert.equal(isCompatiblePrompt({}), false)
    assert.equal(isCompatiblePrompt(makePrompt({})), true)
    assert.equal(isCompatiblePrompt(makePrompt({ responses: ['', ''] })), false)
    assert.equal(isCompatiblePrompt(makePrompt({ respond: undefined as never })), false)
})

test('processor ignores incompatible values and non-OTP prompts permanently', () => {
    const processor = makeProcessor({})
    const result = processor.process({}, rule, 'not a prompt') as Promise<PromptProcessingResult>
    return result.then(ignored => {
        assert.deepEqual(ignored, { status: 'ignored', reason: 'incompatible' })
        const prompt = makePrompt({})
        return processor.process({}, rule, prompt).then(first => {
            assert.deepEqual(first, { status: 'ignored', reason: 'not-otp' })
            return processor.process({}, rule, prompt).then(second => {
                assert.equal(second.status, 'ignored')
            })
        })
    })
})

test('processor reports missing secrets once per prompt', async () => {
    const loadCalls: number[] = []
    const processor = makeProcessor({ secret: null, loadCalls })
    const prompt = makePrompt({ prompts: [{ prompt: 'Verification code:' }] })

    const first = await processor.process({}, rule, prompt)
    assert.deepEqual(first, { status: 'ignored', reason: 'missing-secret' })
    const second = await processor.process({}, rule, prompt)
    assert.equal(second.status, 'ignored')
    assert.equal(loadCalls.length, 1)
})

test('processor fills the code and submits when all fields are ready', async () => {
    let responded = 0
    const processor = makeProcessor({})
    const prompt = makePrompt({
        prompts: [{ prompt: 'Verification code:' }],
        respond: () => { responded++ },
    })

    const result = await processor.process({}, rule, prompt)
    assert.equal(result.status, 'submitted')
    assert.equal(responded, 1)
    assert.match(prompt.responses[0], /^\d{6}$/)

    const again = await processor.process({}, rule, prompt)
    assert.equal(again.status, 'submitted')
    assert.equal(responded, 1)
})

test('processor waits for other fields before submitting', async () => {
    let responded = 0
    const processor = makeProcessor({})
    const prompt = makePrompt({
        prompts: [{ prompt: 'Password:' }, { prompt: 'Verification code:' }],
        responses: ['', ''],
        respond: () => { responded++ },
    })

    const waiting = await processor.process({}, rule, prompt)
    assert.deepEqual(waiting, { status: 'filled', reason: 'waiting-for-responses' })
    assert.equal(responded, 0)
    assert.match(prompt.responses[1], /^\d{6}$/)

    prompt.responses[0] = 'manual-password'
    const submitted = await processor.process({}, rule, prompt)
    assert.equal(submitted.status, 'submitted')
    assert.equal(responded, 1)
})

test('processor refuses a second submission within the same time step', async () => {
    let responded = 0
    const processor = makeProcessor({})
    const tab = {}

    const first = makePrompt({ prompts: [{ prompt: 'Verification code:' }], respond: () => { responded++ } })
    assert.equal((await processor.process(tab, rule, first)).status, 'submitted')

    const second = makePrompt({ prompts: [{ prompt: 'Verification code:' }], respond: () => { responded++ } })
    const result = await processor.process(tab, rule, second)
    assert.deepEqual(result, { status: 'ignored', reason: 'duplicate-step' })
    assert.equal(responded, 1)
    assert.match(second.responses[0], /^\d{6}$/)
})

test('processor allows submissions in later time steps and other tabs', async () => {
    let now = 1_700_000_000_000
    const processor = makeProcessor({ now: () => now })
    const promptOne = makePrompt({ prompts: [{ prompt: 'Verification code:' }] })
    assert.equal((await processor.process({}, rule, promptOne)).status, 'submitted')

    now += 30_000
    const promptTwo = makePrompt({ prompts: [{ prompt: 'Verification code:' }] })
    assert.equal((await processor.process({}, rule, promptTwo)).status, 'submitted')
    assert.equal((await processor.process({}, rule, makePrompt({ prompts: [{ prompt: 'Verification code:' }] }))).status, 'submitted')
})

test('processor retries processing errors with backoff and recovers', async () => {
    let now = 1_700_000_000_000
    let secret: string|null = '!!!not-base32!!!'
    const loadCalls: number[] = []
    const processor = new TotpPromptProcessor({
        loadSecret: () => {
            loadCalls.push(1)
            return Promise.resolve(secret)
        },
        now: () => now,
    })
    const prompt = makePrompt({ prompts: [{ prompt: 'Verification code:' }] })

    assert.deepEqual(await processor.process({}, rule, prompt), {
        status: 'ignored',
        reason: 'processing-error',
        retryAfterMs: 3000,
    })

    assert.equal((await processor.process({}, rule, prompt)).status, 'ignored')
    assert.equal(loadCalls.length, 1)

    now += 3000
    secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    assert.equal((await processor.process({}, rule, prompt)).status, 'submitted')
    assert.equal(loadCalls.length, 2)
})

test('processor honors rule-specific algorithm, digits and period', async () => {
    let responded = 0
    let now = 1_700_000_000_000
    const processor = makeProcessor({ now: () => now })
    const parameterized: TotpRule = { ...rule, algorithm: 'SHA256', digits: 8, periodSeconds: 60 }
    const tab = {}
    const first = makePrompt({ prompts: [{ prompt: 'Verification code:' }], respond: () => { responded++ } })

    const result = await processor.process(tab, parameterized, first)
    assert.equal(result.status, 'submitted')
    assert.match(first.responses[0], /^\d{8}$/)

    // 60 秒周期内重复提交被拒绝，跨过 60 秒后允许
    const second = makePrompt({ prompts: [{ prompt: 'Verification code:' }], respond: () => { responded++ } })
    assert.deepEqual(await processor.process(tab, parameterized, second), { status: 'ignored', reason: 'duplicate-step' })
    assert.equal(responded, 1)

    now += 60_000
    const third = makePrompt({ prompts: [{ prompt: 'Verification code:' }], respond: () => { responded++ } })
    assert.equal((await processor.process(tab, parameterized, third)).status, 'submitted')
    assert.equal(responded, 2)
})

test('processor regenerates a stale code before submitting on the waiting path', async () => {
    let now = 1_700_000_000_000
    const processor = makeProcessor({ now: () => now })
    const prompt = makePrompt({
        prompts: [{ prompt: 'Password:' }, { prompt: 'Verification code:' }],
        responses: ['', ''],
    })

    await processor.process({}, rule, prompt)
    const staleCode = prompt.responses[1]
    assert.match(staleCode, /^\d{6}$/)

    now += 30_000
    prompt.responses[0] = 'manual-password'
    const submitted = await processor.process({}, rule, prompt)
    assert.equal(submitted.status, 'submitted')
    assert.notEqual(prompt.responses[1], staleCode)
    assert.match(prompt.responses[1], /^\d{6}$/)
})
