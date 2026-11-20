import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'

export type TotpTabStatusState = 'matched'|'filled'|'submitted'|'error'

export interface TotpTabStatus {
    tabLabel: string
    state: TotpTabStatusState
    ruleSummary?: string
    detail?: string
    updatedAt: number
}

@Injectable({ providedIn: 'root' })
export class TotpStatusService {
    private readonly statuses = new Map<object, TotpTabStatus>()
    private readonly changed = new Subject<void>()
    readonly changed$ = this.changed.asObservable()

    record (tab: object, status: TotpTabStatus): void {
        this.statuses.set(tab, status)
        this.changed.next()
    }

    clear (tab: object): void {
        if (this.statuses.delete(tab)) {
            this.changed.next()
        }
    }

    list (): TotpTabStatus[] {
        return [...this.statuses.values()]
    }
}
