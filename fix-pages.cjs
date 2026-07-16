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

  // Fix imports by adding an extra `../` to all relative imports
  // since the files moved one level deeper (from app/X to app/(main)/X)
  content = content.replace(/from '\.\.\//g, "from '../../../");

  // But wait, the original was `../../components/layout`. 
  // Let's just blindly replace `../../` with `../../../` for ALL local imports.
  // Wait, if an import was `../components`, it becomes `../../components`.
  content = content.replace(/from '\.\.\//g, "from '../../");
  // The above line replaces `../` with `../../`. 
  // But wait! If it was `../../`, it becomes `../../../`.
  // Let's do it properly:
  // replace `../../../` -> temp
  // replace `../../` -> `../../../`
  // replace `../` -> `../../`

  // Actually, I can just use a regex on `from '..`
  content = content.replace(/from '(\.\.+)(.*?)/g, (match, dots, rest) => {
    return `from '${dots}./${rest}`;
  });
  
  // Remove layout import
  content = content.replace(/import \{ Header, Sidebar, Footer \} from '.*?';\n/, '');

  // Extract the main content and what comes after it, removing the wrappers
  // We want to remove:
  // <div className="h-screen flex flex-col ...">
  //   <Header />
  //   <div className="flex flex-1 overflow-hidden">
  //     <Sidebar />
  
  // And remove:
  //   </div>
  //   <Footer />
  // </div>
  
  content = content.replace(/<div className="h-screen flex flex-col[^>]*>[\s\S]*?<Header \/>[\s\S]*?<div className="flex flex-1 overflow-hidden">[\s\S]*?<Sidebar \/>/, '<>');
  
  // Now we need to remove the closing tags.
  content = content.replace(/<\/div>\s*<Footer \/>\s*([\s\S]*?)\s*<\/div>/, '</>$1');

  fs.writeFileSync(filePath, content);
}
console.log('Done fixing pages');
