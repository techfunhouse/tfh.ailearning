// Build fix script to resolve TypeScript errors for GitHub Actions
import { readFileSync, writeFileSync } from 'fs';

const fixes = [
  // Fix AddEditReferenceDialog.tsx
  {
    file: './client/src/components/AddEditReferenceDialog.tsx',
    search: '  const [, navigate] = useLocation();',
    replace: '  // const [, navigate] = useLocation();'
  },
  
  // Fix ReferenceCard.tsx
  {
    file: './client/src/components/ReferenceCard.tsx',
    search: 'import { useAuth } from \'@/hooks/useAuth\';',
    replace: '// import { useAuth } from \'@/hooks/useAuth\';'
  },
  
  // Fix ReferenceDetailDialog.tsx - remove unused imports
  {
    file: './client/src/components/ReferenceDetailDialog.tsx',
    search: 'import { formatDistanceToNow } from "date-fns";',
    replace: '// import { formatDistanceToNow } from "date-fns";'
  },
  
  // Fix HomePage.tsx category mapping
  {
    file: './client/src/pages/HomePage.tsx',
    search: 'const categoryName = category && category.name ? category.name.toLowerCase() : \'unknown\';',
    replace: 'const categoryName = (category as any)?.name ? (category as any).name.toLowerCase() : \'unknown\';'
  }
];

fixes.forEach(fix => {
  try {
    const content = readFileSync(fix.file, 'utf8');
    const updated = content.replace(fix.search, fix.replace);
    writeFileSync(fix.file, updated);
    console.log(`Fixed: ${fix.file}`);
  } catch (error) {
    console.log(`Could not fix ${fix.file}: ${error}`);
  }
});