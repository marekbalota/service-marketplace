import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import i18next from 'i18next'
import { z } from 'zod'
import * as zodCore from 'zod/v4/core'
import en from './translations/en.json'
import { zodErrorMap } from './lib/zodErrorMap'

// Initialize i18next with EN translations so zodErrorMap resolves keys
i18next.init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

// Register zodErrorMap via both entry points so all parse paths get translated messages.
// @hookform/resolvers/zod imports from 'zod/v4/core' directly, which may resolve to a
// separate module instance from 'zod' under Vite's noExternal bundling.
z.config({ customError: zodErrorMap })
zodCore.config({ customError: zodErrorMap })

// cmdk calls scrollIntoView on command items; JSDOM doesn't implement it
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
})

// Base UI ScrollAreaViewport calls element.getAnimations() (Web Animations API) in a
// timeout callback — jsdom doesn't implement it, causing unhandled TypeErrors.
Object.defineProperty(Element.prototype, 'getAnimations', {
  writable: true,
  value: vi.fn(() => []),
})

// Base UI's useAnimationsFinished checks this flag to skip requestAnimationFrame-based
// animation waiting and call the completion callback synchronously instead.
// Without this, closing dialogs/popovers hangs in jsdom (no RAF loop) and tests fail.
// See: @base-ui/react/esm/internals/useAnimationsFinished.js
Object.defineProperty(globalThis, 'BASE_UI_ANIMATIONS_DISABLED', {
  writable: true,
  value: true,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
