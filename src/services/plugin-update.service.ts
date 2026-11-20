import { Inject, Injectable } from '@angular/core'
import { BOOTSTRAP_DATA, BootstrapData, PlatformService } from 'tabby-core'
import { compareVersions } from '../utils/version'
import packageJson from '../../package.json'

const PLUGIN_PACKAGE_NAME = 'tabby-totp-pilot'
const REGISTRY_URL = `https://registry.npmjs.org/${PLUGIN_PACKAGE_NAME}`

const FETCH_TIMEOUT_MS = 15000
const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/

export interface PluginRelease {
    version: string
    date: string|null
    url: string|null
}

interface RegistryPackument {
    'dist-tags'?: Record<string, string>
    versions?: Record<string, unknown>
    time?: Record<string, string>
}

@Injectable({ providedIn: 'root' })
export class PluginUpdateService {
    // 版本信息以 npm registry 为单一来源：dist-tags.latest 即 npm install 默认安装的版本
    private packumentPromise: Promise<RegistryPackument|null>|null = null

    constructor (
        private platform: PlatformService,
        @Inject(BOOTSTRAP_DATA) private bootstrapData: BootstrapData,
    ) { }

    getCurrentVersion (): string {
        const installed = this.bootstrapData.installedPlugins.find(
            plugin => plugin.packageName === PLUGIN_PACKAGE_NAME,
        )
        return installed?.version ?? packageJson.version
    }

    // 返回 null 表示 npm 上还没有已发布版本（registry 返回 404，包括首次发布前的状态）
    async fetchLatestRelease (): Promise<PluginRelease|null> {
        const packument = await this.getPackument()
        if (!packument) {
            return null
        }
        const latest = packument['dist-tags']?.latest
        if (!latest || !STABLE_VERSION_PATTERN.test(latest)) {
            return null
        }
        return {
            version: latest,
            date: this.publishDate(packument, latest),
            url: this.releaseLink(latest),
        }
    }

    // 回退列表为 npm 上全部已发布的稳定版本，platform.installPlugin 即经 npm 安装对应版本
    async listRollbackVersions (): Promise<PluginRelease[]> {
        const packument = await this.getPackument()
        if (!packument) {
            return []
        }
        return Object.keys(packument.versions ?? {})
            .filter(version => STABLE_VERSION_PATTERN.test(version))
            .map(version => ({
                version,
                date: this.publishDate(packument, version),
                url: this.releaseLink(version),
            }))
            .sort((a, b) => compareVersions(b.version, a.version))
    }

    async installVersion (version: string): Promise<void> {
        await this.platform.installPlugin(PLUGIN_PACKAGE_NAME, version)
    }

    private publishDate (packument: RegistryPackument, version: string): string|null {
        const timestamp = packument.time?.[version]
        return typeof timestamp === 'string' ? timestamp.slice(0, 10) : null
    }

    // release 链接按打包进 bundle 的 package.json repository 字段拼出；字段缺失时无链接
    private releaseLink (version: string): string|null {
        const slug = this.repoSlug()
        return slug ? `https://github.com/${slug}/releases/tag/v${version}` : null
    }

    private repoSlug (): string|null {
        const url = packageJson.repository?.url
        if (typeof url !== 'string') {
            return null
        }
        const match = /github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(url)
        return match ? match[1] : null
    }

    // 检查更新与回退列表共用同一次 registry 请求
    private getPackument (): Promise<RegistryPackument|null> {
        this.packumentPromise ??= this.fetchJson(REGISTRY_URL)
            .then(data => data as RegistryPackument)
            .catch((error: unknown) => {
                this.packumentPromise = null
                if ((error as { status?: number }).status === 404) {
                    return null
                }
                throw error
            })
        return this.packumentPromise
    }

    private async fetchJson (url: string): Promise<unknown> {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
        try {
            const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
            if (!response.ok) {
                throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status })
            }
            return await response.json()
        } finally {
            clearTimeout(timer)
        }
    }
}
