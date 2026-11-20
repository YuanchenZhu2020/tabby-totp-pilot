import { Injectable } from '@angular/core'
import { ConfigService, Logger, LogService } from 'tabby-core'
import { SSHTabComponent } from 'tabby-ssh'
import { BaseTerminalTabComponent, TerminalDecorator } from 'tabby-terminal'
import { hookPromptAccessor, PromptAccessorHook } from './prompts/accessor'
import { PromptProcessingResult, TotpPromptProcessor } from './prompts/processor'
import { findMatchingRule } from './rules'
import { TotpSecretStorageService } from './services/totp-secret-storage.service'
import { TotpStatusService } from './services/totp-status.service'
import { CONFIG_KEY, KeyboardInteractivePromptLike, SshProfileLike, TotpPluginConfig, TotpRule } from './types'

const PENDING_CHECK_INTERVAL_MS = 200
const PROMPT_POLL_INTERVAL_MS = 200

@Injectable()
export class TotpTerminalDecorator extends TerminalDecorator {
    private promptHooks = new WeakMap<BaseTerminalTabComponent<any>, PromptAccessorHook>()
    private pendingWatchers = new WeakMap<BaseTerminalTabComponent<any>, Map<KeyboardInteractivePromptLike, ReturnType<typeof setInterval>>>()
    private retryTimers = new WeakMap<BaseTerminalTabComponent<any>, Set<ReturnType<typeof setTimeout>>>()
    private pollTimers = new WeakMap<BaseTerminalTabComponent<any>, ReturnType<typeof setInterval>>()
    private processor: TotpPromptProcessor
    private logger: Logger
    private announcedPrompts = new WeakSet<KeyboardInteractivePromptLike>()
    private lastLoggedResult = new WeakMap<SSHTabComponent, string>()

    constructor (
        private config: ConfigService,
        secretStorage: TotpSecretStorageService,
        private status: TotpStatusService,
        log: LogService,
    ) {
        super()
        this.logger = log.create('totp-pilot')
        this.processor = new TotpPromptProcessor({
            loadSecret: ruleId => secretStorage.load(ruleId),
        })
    }

    attach (terminal: BaseTerminalTabComponent<any>): void {
        if (!(terminal instanceof SSHTabComponent) || !('activeKIPrompt' in terminal)) {
            return
        }
        if (this.promptHooks.has(terminal) || this.pollTimers.has(terminal)) {
            return
        }

        // 宿主在 setupOneSession 内部完成初始认证，keyboard-interactive 提示在
        // tab.session 存在前就发完（sessionChanged$ 到 setSession 才触发），事件订阅
        // 必然错过——把面板对象 activeKIPrompt 改写为访问器，提示出现的同一刻即得
        // 回调；不可重定义时退回 200ms 轮询。两条路径复用同一状态机，不会二次提交。
        const hook = hookPromptAccessor(terminal, 'activeKIPrompt', value => {
            void this.handlePrompt(terminal as SSHTabComponent, value as KeyboardInteractivePromptLike)
        })
        if (hook) {
            this.promptHooks.set(terminal, hook)
            this.logger.debug('Hooked activeKIPrompt assignments:', this.describeTab(terminal))
        } else {
            this.logger.warn('activeKIPrompt is not hookable; falling back to 200ms polling')
            this.startPolling(terminal)
        }
    }

    detach (terminal: BaseTerminalTabComponent<any>): void {
        this.promptHooks.get(terminal)?.restore()
        this.promptHooks.delete(terminal)
        this.clearPendingWatchers(terminal)
        this.clearRetryTimers(terminal)
        this.stopPolling(terminal)
        this.status.clear(terminal)
        super.detach(terminal)
    }

    private startPolling (tab: BaseTerminalTabComponent<any>): void {
        if (this.pollTimers.has(tab)) {
            return
        }
        const timer = setInterval(() => {
            const prompt = (tab as { activeKIPrompt?: KeyboardInteractivePromptLike|null }).activeKIPrompt
            if (prompt) {
                // 轮询仅在挂钩失败时启用，tab 必为 SSH 标签页，此处断言安全
                void this.handlePrompt(tab as SSHTabComponent, prompt)
            }
        }, PROMPT_POLL_INTERVAL_MS)
        this.pollTimers.set(tab, timer)
    }

    private stopPolling (tab: BaseTerminalTabComponent<any>): void {
        const timer = this.pollTimers.get(tab)
        if (timer !== undefined) {
            clearInterval(timer)
            this.pollTimers.delete(tab)
        }
    }

    private async handlePrompt (tab: SSHTabComponent, prompt: KeyboardInteractivePromptLike): Promise<PromptProcessingResult|null> {
        try {
            const pluginConfig = this.config.store[CONFIG_KEY] as TotpPluginConfig|undefined
            if (!pluginConfig || !Array.isArray(pluginConfig.rules)) {
                this.status.clear(tab)
                return null
            }

            const rule = findMatchingRule(pluginConfig, tab.profile as SshProfileLike)
            if (!this.announcedPrompts.has(prompt)) {
                this.announcedPrompts.add(prompt)
                if (rule) {
                    this.logger.debug('KI prompt matched rule', rule.id)
                } else {
                    this.logger.debug('KI prompt received but no matching rule for', this.describeTab(tab))
                }
            }
            if (!rule) {
                this.status.clear(tab)
                return null
            }

            const result = await this.processor.process(tab, rule, prompt)
            this.recordStatus(tab, rule, result)

            if (result.status === 'submitted' && tab.activeKIPrompt === prompt) {
                tab.activeKIPrompt = null
                if (tab.hasFocus) {
                    setTimeout(() => tab.frontend?.focus(), 0)
                }
            } else if (result.status === 'filled' && result.reason === 'waiting-for-responses') {
                this.ensurePendingWatcher(tab, prompt)
            } else if (result.reason === 'processing-error' && result.retryAfterMs) {
                this.scheduleRetry(tab, prompt, result.retryAfterMs)
            }
            return result
        } catch {
            this.logger.warn('TOTP prompt inspection failed; continuing with manual authentication')
            return null
        }
    }

    private ensurePendingWatcher (tab: SSHTabComponent, prompt: KeyboardInteractivePromptLike): void {
        let watchers = this.pendingWatchers.get(tab)
        if (!watchers) {
            watchers = new Map()
            this.pendingWatchers.set(tab, watchers)
        }
        if (watchers.has(prompt)) {
            return
        }

        const interval = setInterval(() => {
            void (async () => {
                // 手动提交后宿主会同步置空 activeKIPrompt，此时停止观察以免二次 respond
                if (tab.activeKIPrompt !== prompt) {
                    this.stopPendingWatcher(tab, prompt)
                    return
                }
                const result = await this.handlePrompt(tab, prompt)
                if (!result || result.status !== 'filled') {
                    this.stopPendingWatcher(tab, prompt)
                }
            })()
        }, PENDING_CHECK_INTERVAL_MS)
        watchers.set(prompt, interval)
    }

    private stopPendingWatcher (tab: BaseTerminalTabComponent<any>, prompt: KeyboardInteractivePromptLike): void {
        const interval = this.pendingWatchers.get(tab)?.get(prompt)
        if (interval !== undefined) {
            clearInterval(interval)
            this.pendingWatchers.get(tab)?.delete(prompt)
        }
    }

    private clearPendingWatchers (tab: BaseTerminalTabComponent<any>): void {
        const watchers = this.pendingWatchers.get(tab)
        if (watchers) {
            for (const interval of watchers.values()) {
                clearInterval(interval)
            }
            watchers.clear()
        }
    }

    private scheduleRetry (tab: SSHTabComponent, prompt: KeyboardInteractivePromptLike, delayMs: number): void {
        let timers = this.retryTimers.get(tab)
        if (!timers) {
            timers = new Set()
            this.retryTimers.set(tab, timers)
        }
        const timerSet = timers
        const timer = setTimeout(() => {
            timerSet.delete(timer)
            void this.handlePrompt(tab, prompt)
        }, delayMs)
        timers.add(timer)
    }

    private clearRetryTimers (tab: BaseTerminalTabComponent<any>): void {
        const timers = this.retryTimers.get(tab)
        if (timers) {
            for (const timer of timers) {
                clearTimeout(timer)
            }
            timers.clear()
        }
    }

    private recordStatus (tab: SSHTabComponent, rule: TotpRule, result: PromptProcessingResult): void {
        // detail 存稳定的 reason 键，设置页按当前语言渲染（detailLabel）
        const stateByStatus = result.status === 'submitted'
            ? 'submitted'
            : result.status === 'filled'
                ? 'filled'
                : result.reason === 'processing-error' ? 'error' : 'matched'

        const signature = `${result.status}:${result.reason ?? ''}`
        if (this.lastLoggedResult.get(tab) !== signature) {
            this.lastLoggedResult.set(tab, signature)
            this.logger.debug('TOTP result:', signature)
        }

        this.status.record(tab, {
            tabLabel: this.describeTab(tab),
            state: stateByStatus,
            ruleSummary: `${rule.username}@${rule.host}:${rule.port}`,
            detail: result.reason && result.reason !== 'waiting-for-responses' ? result.reason : undefined,
            updatedAt: Date.now(),
        })
    }

    private describeTab (tab: SSHTabComponent): string {
        const options = tab.profile?.options
        return `${options?.user ?? ''}@${options?.host ?? ''}:${options?.port ?? 22}`
    }
}
