import { Injectable } from '@angular/core'
import { PasswordStorageService } from 'tabby-ssh'
import { normalizeBase32Secret } from '../totp/secret-input'
import { createSecretStorageProfile, SECRET_STORAGE_ACCOUNT } from '../storage-key'

@Injectable({ providedIn: 'root' })
export class TotpSecretStorageService {
    constructor (private passwordStorage: PasswordStorageService) { }

    async save (ruleId: string, secret: string): Promise<void> {
        const profile = createSecretStorageProfile(ruleId)
        await this.passwordStorage.savePassword(profile as never, normalizeBase32Secret(secret), SECRET_STORAGE_ACCOUNT)
    }

    async load (ruleId: string): Promise<string|null> {
        const profile = createSecretStorageProfile(ruleId)
        return this.passwordStorage.loadPassword(profile as never, SECRET_STORAGE_ACCOUNT)
    }

    async exists (ruleId: string): Promise<boolean> {
        return (await this.load(ruleId)) !== null
    }

    async remove (ruleId: string): Promise<void> {
        const profile = createSecretStorageProfile(ruleId)
        await this.passwordStorage.deletePassword(profile as never, SECRET_STORAGE_ACCOUNT)
    }
}
