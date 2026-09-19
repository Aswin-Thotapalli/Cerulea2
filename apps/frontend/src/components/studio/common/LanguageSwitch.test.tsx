import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LanguageSwitch from './LanguageSwitch';
import { MessagesProvider, LANGUAGE_KEY, useMessages } from '@/lib/messages/MessagesProvider';
import { LANGUAGES, coverageStatement } from '@/lib/messages/catalogue';
import { controlsWithoutMirror } from '@/lib/studio/mirror';
import english from '@/messages/en.json';

function Reader() {
  const messages = useMessages();
  return (
    <div>
      <span data-testid="reading">{messages.language.tag}</span>
      <span data-testid="first">
        {messages.t(Object.keys(english)[0], 'The fallback')}
      </span>
    </div>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.removeItem(LANGUAGE_KEY);
});

describe('the language switch', () => {
  it('offers every language Cerulea carries', () => {
    render(
      <MessagesProvider language="en">
        <LanguageSwitch />
      </MessagesProvider>,
    );
    expect(screen.getByTestId('language-switch')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
  });

  it('states how far the chosen language reaches', () => {
    render(
      <MessagesProvider language="en">
        <LanguageSwitch />
      </MessagesProvider>,
    );
    expect(screen.getByText(coverageStatement('en'))).toBeInTheDocument();
  });

  it('changes the language every screen reads in', async () => {
    render(
      <MessagesProvider language="en">
        <LanguageSwitch />
        <Reader />
      </MessagesProvider>,
    );
    expect(screen.getByTestId('reading')).toHaveTextContent('en');
    await userEvent.click(screen.getByLabelText('Language'));
    const hindi = LANGUAGES.find((entry) => entry.tag === 'hi')!;
    await userEvent.click(
      await screen.findByRole('option', { name: `${hindi.name}, ${hindi.endonym}` }),
    );
    expect(screen.getByTestId('reading')).toHaveTextContent('hi');
    expect(screen.getByText(coverageStatement('hi'))).toBeInTheDocument();
  });

  it('reads English while a language is awaiting its file', async () => {
    render(
      <MessagesProvider language="hi">
        <Reader />
      </MessagesProvider>,
    );
    expect(screen.getByTestId('first')).toHaveTextContent(
      (english as Record<string, string>)[Object.keys(english)[0]],
    );
  });

  it('keeps the language a person chose on this machine', async () => {
    render(
      <MessagesProvider language="en">
        <LanguageSwitch />
      </MessagesProvider>,
    );
    await userEvent.click(screen.getByLabelText('Language'));
    const telugu = LANGUAGES.find((entry) => entry.tag === 'te')!;
    await userEvent.click(
      await screen.findByRole('option', { name: `${telugu.name}, ${telugu.endonym}` }),
    );
    expect(window.localStorage.getItem(LANGUAGE_KEY)).toBe('te');
  });

  it('reads English for a screen rendered outside the provider', () => {
    render(<Reader />);
    expect(screen.getByTestId('reading')).toHaveTextContent('en');
  });

  it('carries the mirror on the switch', () => {
    const { container } = render(
      <MessagesProvider language="en">
        <LanguageSwitch />
      </MessagesProvider>,
    );
    expect(controlsWithoutMirror(container)).toEqual([]);
  });
});
