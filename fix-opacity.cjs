const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    content = content.replace(/text-brand-muted\/[0-9]{2}/g, 'text-brand-muted');
    content = content.replace(/text-brand-muted\s+opacity-[0-9]{2}/g, 'text-brand-muted');
    content = content.replace(/opacity-[0-9]{2}\s+text-brand-muted/g, 'text-brand-muted');
    content = content.replace(/text-sm opacity-40 tracking-widest/g, 'text-sm text-brand-muted font-bold tracking-widest');
    content = content.replace(/text-brand-muted opacity-60/g, 'text-brand-muted');
    content = content.replace(/text-brand-muted font-medium opacity-40/g, 'text-brand-muted font-medium');
    content = content.replace(/text-xs opacity-60/g, 'text-xs text-brand-muted');
    content = content.replace(/text-xs font-bold text-brand-muted\/70/g, 'text-xs font-bold text-brand-muted');
    content = content.replace(/text-brand-muted line-through opacity-60/g, 'text-brand-muted line-through');
    content = content.replace(/opacity-70 leading-normal/g, 'leading-normal');
    content = content.replace(/opacity-70 mt-0\.5/g, 'mt-0.5');
    content = content.replace(/opacity-70 leading-tight/g, 'leading-tight');
    content = content.replace(/text-center py-6 opacity-40/g, 'text-center py-6 text-brand-muted');
    content = content.replace(/text-center py-10 opacity-20/g, 'text-center py-10 text-brand-muted');
    content = content.replace(/opacity-50 cursor-not-allowed/g, 'cursor-not-allowed text-brand-muted opacity-50'); // Keep lower opacity on disabled items but readable
    content = content.replace(/text-brand-muted\/40/g, 'text-brand-muted');
    content = content.replace(/opacity-70 mt-0.5/g, 'mt-0.5');
    content = content.replace(/text-brand-muted\/50/g, 'text-brand-muted');
    content = content.replace(/px-1 opacity-50/g, 'px-1 text-brand-muted');
    content = content.replace(/text-brand-muted font-medium opacity-50/g, 'text-brand-muted font-medium');
    content = content.replace(/tracking-wide opacity-70/g, 'tracking-wide');
    content = content.replace(/tracking-tighter opacity-70/g, 'tracking-tighter');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Fixed', filePath);
    }
  }
});
