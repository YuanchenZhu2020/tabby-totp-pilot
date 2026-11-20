import { OnDestroy } from '@angular/core'
import { Subscription } from 'rxjs'
import { LocaleService } from 'tabby-core'
import { I18N, I18nStrings, Locale, resolveLocale } from '../i18n'

// 设置页容器与各面板共用的基类：初始化文案并跟随 Tabby 全局语言实时切换
export abstract class TotpLocalizedComponent implements OnDestroy {
    t: I18nStrings
    locale: Locale

    private localeSubscription: Subscription

    constructor (localeService: LocaleService) {
        this.locale = resolveLocale(localeService.getLocale())
        this.t = I18N[this.locale]
        this.localeSubscription = localeService.localeChanged$.subscribe(language => {
            this.locale = resolveLocale(language)
            this.t = I18N[this.locale]
        })
    }

    ngOnDestroy (): void {
        this.localeSubscription.unsubscribe()
    }
}
