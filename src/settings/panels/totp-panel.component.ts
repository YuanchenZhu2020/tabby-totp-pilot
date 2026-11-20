import { Component, OnInit } from '@angular/core'
import { ConfigService, LocaleService, NotificationsService } from 'tabby-core'
import { createEmptyRule, createPersistedConfig, findDuplicateRuleIds, hasGlobMeta, normalizeRule, validateRule } from '../../rules'
import { updatePluginConfigStore } from '../../config-store'
import { localize } from '../../i18n'
import { TotpLocalizedComponent } from '../localized-component'
import { TotpSecretStorageService } from '../../services/totp-secret-storage.service'
import { ParsedTotpSecretInput, normalizeTotpSecretInput } from '../../totp/secret-input'
import { CONFIG_KEY, DEFAULT_TOTP_PARAMETERS, TotpPluginConfig, TotpRule, TOTP_ALGORITHMS } from '../../types'

@Component({
    selector: 'totp-pilot-totp-panel',
    template: `
        <div class="totp-pilot-config">
            <div class="form-line global-switch">
                <div class="header">
                    <div class="title">{{ t.enableAutofill }}</div>
                    <div class="description">{{ t.enableAutofillDescription }}</div>
                </div>
                <input type="checkbox" [(ngModel)]="enabled">
            </div>

            <div *ngIf="error" class="alert alert-danger">{{ error }}</div>
            <div *ngIf="message" class="alert alert-success">{{ message }}</div>

            <div class="rule-card" *ngFor="let rule of rules; trackBy: trackByRuleId">
                <div class="rule-card-header">
                    <label class="enabled-control">
                        <input type="checkbox" [(ngModel)]="rule.enabled">
                        {{ t.enableThisRule }}
                    </label>
                    <span>
                        <span class="badge bg-info" *ngIf="usesPattern(rule)">{{ t.wildcardBadge }}</span>
                        <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="saving" (click)="removeRule(rule)">
                            {{ t.deleteRule }}
                        </button>
                    </span>
                </div>

                <div class="field-grid">
                    <label>
                        <span>{{ t.hostLabel }}</span>
                        <input class="form-control" [(ngModel)]="rule.host" placeholder="{{ t.hostPlaceholder }}">
                    </label>
                    <label>
                        <span>{{ t.portLabel }}</span>
                        <input class="form-control" type="number" min="1" max="65535" [(ngModel)]="rule.port">
                    </label>
                    <label>
                        <span>{{ t.usernameLabel }}</span>
                        <input class="form-control" [(ngModel)]="rule.username" placeholder="{{ t.usernamePlaceholder }}">
                    </label>
                </div>

                <label class="secret-field">
                    <span>
                        {{ t.secretLabel }}
                        <span class="badge bg-success" *ngIf="secretStored[rule.id]">{{ t.secretStoredBadge }}</span>
                        <span class="badge bg-secondary" *ngIf="!secretStored[rule.id]">{{ t.secretNotStoredBadge }}</span>
                    </span>
                    <input
                        class="form-control"
                        type="password"
                        autocomplete="new-password"
                        [(ngModel)]="secretInputs[rule.id]"
                        placeholder="{{ t.secretPlaceholder }}"
                    >
                </label>

                <div class="advanced-section">
                    <button class="btn btn-outline-secondary btn-sm" type="button" (click)="toggleAdvanced(rule.id)">
                        {{ advancedOpen[rule.id] ? t.hideAdvanced : t.showAdvanced }}
                    </button>
                    <div class="field-grid advanced-grid" [class.advanced-collapsed]="!advancedOpen[rule.id]">
                        <label>
                            <span>{{ t.algorithmLabel }}</span>
                            <select class="form-control" [(ngModel)]="rule.algorithm">
                                <option *ngFor="let algorithm of algorithms" [value]="algorithm">{{ algorithm }}</option>
                            </select>
                        </label>
                        <label>
                            <span>{{ t.digitsLabel }}</span>
                            <select class="form-control" [(ngModel)]="rule.digits">
                                <option [ngValue]="6">{{ t.digits6 }}</option>
                                <option [ngValue]="8">{{ t.digits8 }}</option>
                            </select>
                        </label>
                        <label>
                            <span>{{ t.periodLabel }}</span>
                            <input class="form-control" type="number" min="1" max="3600" [(ngModel)]="rule.periodSeconds">
                        </label>
                    </div>
                </div>
            </div>

            <div class="actions">
                <button class="btn btn-secondary" type="button" [disabled]="saving" (click)="addRule()">{{ t.addRule }}</button>
                <button class="btn btn-primary" type="button" [disabled]="saving" (click)="save()">
                    {{ saving ? t.saving : t.saveSettings }}
                </button>
            </div>

            <div class="alert alert-warning mt-3">{{ t.footnote }}</div>
        </div>
    `,
    styles: [`
        .global-switch { align-items: center; }
        .global-switch input { width: 18px; height: 18px; }
        .rule-card { border: 1px solid rgba(127, 127, 127, .3); border-radius: 6px; padding: 16px; margin: 16px 0; }
        .rule-card-header, .actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .enabled-control { display: flex; align-items: center; gap: 8px; margin: 0; }
        .field-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(90px, .8fr) minmax(0, 1.4fr); gap: 12px; margin-top: 14px; }
        label span { display: inline-block; margin-bottom: 6px; }
        .secret-field { display: block; margin-top: 14px; }
        .badge { margin-left: 8px; }
        .advanced-section { margin-top: 12px; }
        .advanced-grid { margin-top: 12px; padding-top: 4px; }
        /* NgbCollapse 依赖 Bootstrap 的 .collapse:not(.show) 规则，Tabby 的 CSS 打包不含它，不可用；用自带 class 显隐 */
        .advanced-grid.advanced-collapsed { display: none; }
        @media (max-width: 680px) { .field-grid { grid-template-columns: 1fr; } }
    `],
})
export class TotpConfigPanelComponent extends TotpLocalizedComponent implements OnInit {
    enabled = true
    rules: TotpRule[] = []
    secretInputs: Record<string, string> = {}
    secretStored: Record<string, boolean> = {}
    advancedOpen: Record<string, boolean> = {}
    algorithms = TOTP_ALGORITHMS
    saving = false
    error = ''
    message = ''

    constructor (
        private config: ConfigService,
        private notifications: NotificationsService,
        private secretStorage: TotpSecretStorageService,
        localeService: LocaleService,
    ) {
        super(localeService)
    }

    async ngOnInit (): Promise<void> {
        const stored = this.config.store[CONFIG_KEY] as TotpPluginConfig|undefined
        this.enabled = stored?.enabled ?? true
        this.rules = (stored?.rules ?? []).map(rule => this.withParameterDefaults(rule))
        await this.refreshSecretStates()
    }

    toggleAdvanced (ruleId: string): void {
        this.advancedOpen[ruleId] = !this.advancedOpen[ruleId]
    }

    private withParameterDefaults (rule: TotpRule): TotpRule {
        return {
            ...rule,
            algorithm: rule.algorithm ?? DEFAULT_TOTP_PARAMETERS.algorithm,
            digits: rule.digits ?? DEFAULT_TOTP_PARAMETERS.digits,
            periodSeconds: rule.periodSeconds ?? DEFAULT_TOTP_PARAMETERS.periodSeconds,
        }
    }

    addRule (): void {
        if (this.saving) {
            return
        }
        const rule = createEmptyRule()
        this.rules.push(rule)
        this.secretInputs[rule.id] = ''
        this.secretStored[rule.id] = false
        this.advancedOpen[rule.id] = false
    }

    async save (): Promise<void> {
        if (this.saving) {
            return
        }
        this.error = ''
        this.message = ''
        this.saving = true

        try {
            // 先解析全部密钥输入（失败即整体不落盘），URI 参数回填到对应规则
            const parsedSecrets = new Map<string, ParsedTotpSecretInput>()
            for (const rule of this.rules) {
                const input = this.secretInputs[rule.id]?.trim()
                if (input) {
                    parsedSecrets.set(rule.id, normalizeTotpSecretInput(input))
                }
            }

            const normalizedRules = this.rules.map(rule => {
                const parsed = parsedSecrets.get(rule.id)
                const effective = parsed ? { ...rule, ...parsed.parameters } : rule
                validateRule(effective)
                return normalizeRule(effective)
            })
            if (findDuplicateRuleIds(normalizedRules).size > 0) {
                throw new Error(this.t.duplicateRulesError)
            }

            updatePluginConfigStore(this.config.store, createPersistedConfig(this.enabled, normalizedRules))
            await this.config.save()

            for (const [ruleId, parsed] of parsedSecrets) {
                await this.secretStorage.save(ruleId, parsed.secret)
                this.secretInputs[ruleId] = ''
                this.secretStored[ruleId] = true
            }

            this.rules = normalizedRules.map(rule => ({ ...rule }))
            await this.refreshSecretStates()
            this.message = this.t.savedMessage
        } catch (error) {
            this.error = localize(this.t, error, this.t.saveFailedFallback)
        } finally {
            this.saving = false
        }
    }

    async removeRule (rule: TotpRule): Promise<void> {
        if (this.saving) {
            return
        }
        if (!window.confirm(this.t.confirmDeleteRule(
            rule.username || this.t.unnamedUser,
            rule.host || this.t.unnamedHost,
        ))) {
            return
        }

        this.saving = true
        try {
            // 顺序：配置先成功落盘，再删密钥，最后更新 UI——避免密钥已删而规则仍在配置的中间态
            const remaining = this.rules.filter(candidate => candidate.id !== rule.id)
            updatePluginConfigStore(this.config.store, createPersistedConfig(this.enabled, remaining))
            await this.config.save()

            await this.secretStorage.remove(rule.id)

            this.rules = remaining
            delete this.secretInputs[rule.id]
            delete this.secretStored[rule.id]
            delete this.advancedOpen[rule.id]
            this.notifications.notice(this.t.ruleDeletedNotice)
        } catch (error) {
            this.notifications.error(localize(this.t, error, this.t.deleteFailedFallback))
        } finally {
            this.saving = false
        }
    }

    trackByRuleId (_index: number, rule: TotpRule): string {
        return rule.id
    }

    usesPattern (rule: TotpRule): boolean {
        return hasGlobMeta(rule.host) || hasGlobMeta(rule.username)
    }

    private async refreshSecretStates (): Promise<void> {
        await Promise.all(this.rules.map(async rule => {
            try {
                this.secretStored[rule.id] = await this.secretStorage.exists(rule.id)
            } catch {
                this.secretStored[rule.id] = false
            }
            this.secretInputs[rule.id] ??= ''
        }))
    }
}
