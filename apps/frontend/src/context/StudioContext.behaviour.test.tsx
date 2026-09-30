import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  StudioProvider,
  initialStudioState,
  mergeStudioState,
  useStudio,
} from './StudioContext';

describe('mergeStudioState', () => {
  it('merges the app details field by field', () => {
    const previous = {
      ...initialStudioState,
      appMetadata: { appName: 'Berth register', appDescription: 'Berths.', primaryColor: '#004AAD' },
    };
    const merged = mergeStudioState(previous, { appMetadata: { appName: 'Dock register', appDescription: 'Docks.' } });
    expect(merged.appMetadata).toEqual({
      appName: 'Dock register',
      appDescription: 'Docks.',
      primaryColor: '#004AAD',
    });
  });

  it('replaces plain fields and keeps the app details when the change names none', () => {
    const merged = mergeStudioState(initialStudioState, { templateId: 'port_register', blueprintVersion: 3 });
    expect(merged.templateId).toBe('port_register');
    expect(merged.blueprintVersion).toBe(3);
    expect(merged.appMetadata).toBe(initialStudioState.appMetadata);
    expect(merged.application).toBe('dapps');
  });
});

describe('the Studio provider', () => {
  it('starts from the initial state and applies each change', () => {
    const { result } = renderHook(() => useStudio(), { wrapper: StudioProvider });
    expect(result.current.application).toBe('dapps');
    expect(result.current.selectedModules).toEqual([]);

    act(() => result.current.setStudioState({ application: 'government', selectedModules: ['land_title'] }));
    expect(result.current.application).toBe('government');
    expect(result.current.selectedModules).toEqual(['land_title']);

    act(() => result.current.setStudioState({ appMetadata: { appName: 'Land register', appDescription: '' } }));
    act(() => result.current.setStudioState({ appMetadata: { appName: 'Land register', appDescription: 'Titles.' } }));
    expect(result.current.appMetadata).toEqual({ appName: 'Land register', appDescription: 'Titles.' });
    expect(result.current.application).toBe('government');
  }, 30000);

  it('shows the state to every screen inside it', () => {
    function Heading() {
      const studio = useStudio();
      return (
        <button type="button" onClick={() => studio.setStudioState({ templateId: 'trade_finance' })}>
          {studio.templateId ?? 'No template chosen'}
        </button>
      );
    }
    render(
      <StudioProvider>
        <Heading />
      </StudioProvider>,
    );
    expect(screen.getByRole('button').textContent).toBe('No template chosen');
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('button').textContent).toBe('trade_finance');
  }, 30000);

  it('names the fix when a screen sits outside the provider', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useStudio())).toThrowError(
      'This screen sits outside the Studio provider. Render it inside StudioProvider so it reads the open project.',
    );
    quiet.mockRestore();
  });
});
