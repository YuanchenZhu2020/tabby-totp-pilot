import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareVersions } from '../src/utils/version'

test('compareVersions: 相等版本返回 0', () => {
    assert.equal(compareVersions('0.5.0', '0.5.0'), 0)
    assert.equal(compareVersions('1.0', '1.0.0'), 0)
    assert.equal(compareVersions('1', '1.0.0'), 0)
})

test('compareVersions: 大于与小于', () => {
    assert.ok(compareVersions('0.6.0', '0.5.0') > 0)
    assert.ok(compareVersions('0.5.0', '0.6.0') < 0)
    assert.ok(compareVersions('1.0.0', '0.9.9') > 0)
    assert.ok(compareVersions('0.10.0', '0.9.0') > 0)
})

test('compareVersions: 多位数段按数值比较', () => {
    assert.ok(compareVersions('0.5.21', '0.5.3') > 0)
    assert.ok(compareVersions('0.11.0', '0.2.99') > 0)
    assert.ok(compareVersions('10.0.0', '9.99.99') > 0)
})

test('compareVersions: 缺失段与非数字段按 0 处理', () => {
    assert.ok(compareVersions('0.5.1', '0.5') > 0)
    assert.equal(compareVersions('0.5', '0.5.x'), 0)
})
