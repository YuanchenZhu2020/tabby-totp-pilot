// 比较 x.y.z 形式的稳定版本号：a > b 返回正数，a < b 返回负数，相等返回 0。
// 缺失的段按 0 处理；非数字段按 0 处理（调用方应先用 /^\d+\.\d+\.\d+$/ 过滤输入）。
export function compareVersions (a: string, b: string): number {
    const segmentsOf = (version: string): number[] =>
        version.split('.').map(segment => {
            const value = Number.parseInt(segment, 10)
            return Number.isFinite(value) ? value : 0
        })

    const left = segmentsOf(a)
    const right = segmentsOf(b)
    const length = Math.max(left.length, right.length)
    for (let index = 0; index < length; index++) {
        const delta = (left[index] ?? 0) - (right[index] ?? 0)
        if (delta !== 0) {
            return delta
        }
    }
    return 0
}
