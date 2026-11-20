import { KeyboardInteractivePromptLike } from '../types'

const OTP_SIGNAL = /(?:\botp\b|\btotp\b|\bhotp\b|\bmfa\b|one[\s-]?time|verification\s*(?:code|token)|security\s*code|authenticator|passcode|two[\s-]?(?:step|factor)|\b2fa\b|动态(?:口令|密码)|一次性(?:口令|密码|验证码)|验证码)/i
const PASSWORD_SIGNAL = /(?:password|passphrase|密码|私钥口令)/i
const CAPTCHA_SIGNAL = /(?:图形|图片)验证码|captcha/i

export function findOtpPromptIndex (prompt: KeyboardInteractivePromptLike): number|null {
    const contextText = `${prompt.name}\n${prompt.instruction}`
    const contextHasOtpSignal = OTP_SIGNAL.test(contextText) && !CAPTCHA_SIGNAL.test(contextText)
    const candidates: number[] = []

    for (let index = 0; index < prompt.prompts.length; index++) {
        const fieldText = prompt.prompts[index].prompt
        const fieldIsCaptcha = CAPTCHA_SIGNAL.test(fieldText)
        const fieldHasOtpSignal = !fieldIsCaptcha && OTP_SIGNAL.test(fieldText)
        const fieldIsExcluded = (PASSWORD_SIGNAL.test(fieldText) && !fieldHasOtpSignal) || fieldIsCaptcha

        if (fieldHasOtpSignal || contextHasOtpSignal && prompt.prompts.length === 1 && !fieldIsExcluded) {
            candidates.push(index)
        }
    }

    return candidates.length === 1 ? candidates[0] : null
}
