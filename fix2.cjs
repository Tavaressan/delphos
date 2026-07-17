const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend/src/app/(main)');
const files = [
  'catalog/page.tsx',
  'design-system/page.tsx',
  'knowledge-base/page.tsx',
  'profile/page.tsx',
  'schedule/page.tsx',
  'settings/page.tsx'
];

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix imports
  content = content.replace(/\.\.\/\/\.\.\/\.\.\/\.\.\//g, '../../../');

  // Fix the syntax error at the bottom: `</>{integrationsAgent &&` -> `}{integrationsAgent &&`
  // Actually, wait, it should be: `</> \n {integrationsAgent && ... } \n </>` ??
  // The component returns `( <> <main>...</main> {integrationsAgent && ...} </> );`
  // So the top should have `<>` and the bottom `</>`.
  
  // Let's replace the whole bottom logic:
  // if it has `</>{`, we change it to `}{` and add `</>` at the end of the return statement.
  content = content.replace(/<\/}>\{/g, '}{'); 
  // Wait, the regex should be: `<\/}>\{`? No, the text is `</>{`
  content = content.replace(/<\/}>\{/g, '{'); // Wait, the text is `</>{integrationsAgent`
  // Ah, the text is `</>{integrationsAgent && (`
  content = content.replace(/<\/}>\{/g, '{'); // No, `</>` is `<\/>` in regex.
  content = content.replace(/<\/>\{/g, '{');
  // Then we need to add `</>` before the final `);`
  content = content.replace(/\s*\);\n\s*\}\n*$/g, '\n    </>\n  );\n}\n');

  fs.writeFileSync(filePath, content);
}
console.log('Fixed syntax!');
