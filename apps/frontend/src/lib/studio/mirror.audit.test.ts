import { afterEach, describe, expect, it } from 'vitest';

import { controlCarriesMirror, controlsWithoutMirror } from './mirror';

function screenOf(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('naming a control that carries no mirror', () => {
  it('reads the aria label first', () => {
    expect(controlsWithoutMirror(screenOf('<input aria-label="  Berth name  " />'))).toEqual(['Berth name']);
  });

  it('reads the elements the control is labelled by', () => {
    const container = screenOf(
      '<span id="dock_word">Dock</span><span id="fee_word">fee</span>' +
        '<input aria-labelledby="dock_word fee_word" />',
    );
    expect(controlsWithoutMirror(container)).toEqual(['Dock fee']);
  });

  it('moves on to the bound label when the labelling elements are absent', () => {
    const container = screenOf(
      '<input aria-labelledby="absent_word" id="berth_length" /><label for="berth_length"> Berth length </label>',
    );
    expect(controlsWithoutMirror(container)).toEqual(['Berth length']);
  });

  it('reads the label wrapped around the control', () => {
    const container = screenOf('<label> Arrival time <input id="unbound" /></label>');
    expect(controlsWithoutMirror(container)).toEqual(['Arrival time']);
  });

  it('falls back to the field name and then to the tag', () => {
    const container = screenOf('<select name="berth_class"></select><textarea></textarea>');
    expect(controlsWithoutMirror(container)).toEqual(['berth_class', 'textarea']);
  });

  it('names each control once when two carry one name', () => {
    const container = screenOf('<input name="berth_code" /><input name="berth_code" />');
    expect(controlsWithoutMirror(container)).toEqual(['berth_code']);
  });

  it('checks a lone radio button against its own mirror', () => {
    const container = screenOf('<input type="radio" name="berth_side" />');
    expect(controlsWithoutMirror(container)).toEqual(['berth_side']);
  });
});

describe('a mirror held by the group', () => {
  it('reads the mirror of a group that sits more than six levels above the control', () => {
    const nested = '<div>'.repeat(7) + '<input name="deep_field" />' + '</div>'.repeat(7);
    const container = screenOf(`<fieldset><p data-mirror>Sets the berth.</p>${nested}</fieldset>`);
    const control = container.querySelector('input')!;
    expect(controlCarriesMirror(control, container)).toBe(true);
    expect(controlsWithoutMirror(container)).toEqual([]);
  });

  it('reports no mirror when the group holds none', () => {
    const nested = '<div>'.repeat(7) + '<input name="deep_field" />' + '</div>'.repeat(7);
    const container = screenOf(`<fieldset>${nested}</fieldset>`);
    const control = container.querySelector('input')!;
    expect(controlCarriesMirror(control, container)).toBe(false);
    expect(controlsWithoutMirror(container)).toEqual(['deep_field']);
  });

  it('reads the text a control is described by', () => {
    const container = screenOf('<p id="berth_help">Sets the berth length.</p><input aria-describedby="berth_help" name="len" />');
    expect(controlsWithoutMirror(container)).toEqual([]);
  });
});
