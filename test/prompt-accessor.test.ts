import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hookPromptAccessor } from '../src/prompts/accessor'

class HostTab {
    activeKIPrompt: unknown = null
}

test('hookPromptAccessor fires on assignment and preserves reads', () => {
    const tab = new HostTab()
    const seen: unknown[] = []
    const hook = hookPromptAccessor(tab, 'activeKIPrompt', value => { seen.push(value) })
    assert.ok(hook)

    assert.equal(tab.activeKIPrompt, null)
    const prompt = { name: 'password' }
    tab.activeKIPrompt = prompt
    assert.equal(tab.activeKIPrompt, prompt)
    assert.deepEqual(seen, [prompt])

    tab.activeKIPrompt = null
    assert.equal(tab.activeKIPrompt, null)
    assert.deepEqual(seen, [prompt])
})

test('hookPromptAccessor restore returns the original data property with the last value', () => {
    const tab = new HostTab()
    const hook = hookPromptAccessor(tab, 'activeKIPrompt', () => { /* noop */ })
    assert.ok(hook)
    const prompt = { name: 'Verification code' }
    tab.activeKIPrompt = prompt

    hook.restore()
    const descriptor = Object.getOwnPropertyDescriptor(tab, 'activeKIPrompt')
    assert.ok(descriptor)
    assert.equal('value' in descriptor, true)
    assert.equal('get' in descriptor, false)
    assert.equal(tab.activeKIPrompt, prompt)
})

test('hookPromptAccessor rejects accessor descriptors and missing properties', () => {
    const accessorHolder: Record<string, unknown> = {}
    Object.defineProperty(accessorHolder, 'activeKIPrompt', { get: () => null })
    assert.equal(hookPromptAccessor(accessorHolder, 'activeKIPrompt', () => { /* noop */ }), null)

    const nonConfigurable: Record<string, unknown> = {}
    Object.defineProperty(nonConfigurable, 'activeKIPrompt', { value: null, configurable: false })
    assert.equal(hookPromptAccessor(nonConfigurable, 'activeKIPrompt', () => { /* noop */ }), null)

    assert.equal(hookPromptAccessor({}, 'activeKIPrompt', () => { /* noop */ }), null)
})
