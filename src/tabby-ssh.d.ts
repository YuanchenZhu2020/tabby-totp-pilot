declare module 'tabby-ssh' {
    import { SSHTabComponent as TabbySshTabComponent } from 'tabby-ssh/typings/components/sshTab.component'

    export class PasswordStorageService {
        savePassword (profile: object, password: string, account?: string): Promise<void>
        loadPassword (profile: object, account?: string): Promise<string|null>
        deletePassword (profile: object, account?: string): Promise<void>
    }

    export { TabbySshTabComponent as SSHTabComponent }
}
