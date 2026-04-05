/**
 * Tests for the useTheme hook.
 * Covers: initial read from DOM, toggle, localStorage persistence, classList updates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../useTheme';

// jsdom in this env doesn't provide a proper localStorage.
// Polyfill it on globalThis so the hook's setItem/getItem calls work.
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light', 'dark');
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('reads initial theme as light when no dark class', () => {
    document.documentElement.classList.add('light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('reads initial theme as dark when dark class present', () => {
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggle switches light to dark', () => {
    document.documentElement.classList.add('light');
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe('dark');
  });

  it('toggle switches dark to light', () => {
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe('light');
  });

  it('persists theme to localStorage on toggle', () => {
    document.documentElement.classList.add('light');
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggle();
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(store['theme']).toBe('dark');
  });

  it('classList updates on toggle', () => {
    document.documentElement.classList.add('light');
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggle();
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });
});
