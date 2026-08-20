import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider, useI18n } from '../src/hooks/useI18n';

describe('useI18n hook (issue #141)', () => {
  test('returns default locale (pt-BR) and translates correctly', () => {
    let t: (key: string) => string = () => '';
    let locale = '';

    function TestComponent() {
      const i18n = useI18n();
      t = i18n.t;
      locale = i18n.locale;
      return React.createElement('div', null, t('greeting'));
    }

    const html = renderToStaticMarkup(
      React.createElement(I18nProvider, null, 
        React.createElement(TestComponent)
      )
    );

    assert.strictEqual(locale, 'pt-BR');
    // Ensure translation fallback or real translation works if we put one for 'greeting'
    // Let's assume we map 'greeting' to 'Olá' in pt-BR
    assert.match(html, /Olá/);
  });
});
