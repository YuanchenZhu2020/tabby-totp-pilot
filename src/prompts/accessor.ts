// 宿主以普通赋值更新认证面板对象（this.activeKIPrompt = prompt），且初始认证阶段
// 该赋值发生在 tab.session 存在之前——把实例属性改写为访问器，提示出现的同一刻即可
// 得到回调：零延迟、零轮询、与认证时序无关；属性不可重定义时由调用方退回轮询。
export interface PromptAccessorHook {
    restore: () => void
}

export function hookPromptAccessor (
    target: object,
    key: string,
    onPrompt: (value: unknown) => void,
): PromptAccessorHook|null {
    const descriptor = Object.getOwnPropertyDescriptor(target, key)
    if (!descriptor || descriptor.get !== undefined || descriptor.set !== undefined || descriptor.configurable !== true) {
        return null
    }

    let current: unknown = descriptor.value
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: descriptor.enumerable,
        get: () => current,
        set: (value: unknown) => {
            current = value
            if (value !== null && value !== undefined) {
                onPrompt(value)
            }
        },
    })

    return {
        restore: () => {
            const holder = target as Record<string, unknown>
            const accessor = Object.getOwnPropertyDescriptor(target, key)
            const value = accessor && accessor.get ? accessor.get() : current
            delete holder[key]
            holder[key] = value === undefined ? null : value
        },
    }
}
