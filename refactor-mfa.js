const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'dashboard', 'layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Rename component
content = content.replace(/function MFAVerificationDialog\(/g, 'function MFAVerificationPage(');

// 2. Remove open prop
content = content.replace(/  open,\n/g, '');
content = content.replace(/  open: boolean;\n/g, '');

// 3. Replace Dialog with full screen div
const dialogStartRegex = /<Dialog open=\{open\}>\s*<DialogContent[^>]+>\s*<DialogHeader>/;
const fullPageHeader = `<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a192f] via-[#0d2a45] to-[#0a192f] p-4">
      <div className="w-full max-w-md bg-[#0d2a45] border border-white/10 p-6 rounded-xl shadow-2xl text-white">
        <div className="space-y-1.5 mb-6 text-center">`;

content = content.replace(dialogStartRegex, fullPageHeader);

// 4. Replace DialogTitle/Description headers with standard divs
content = content.replace(/<DialogTitle className="flex items-center gap-2 text-white">/g, '<h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">');
content = content.replace(/<\/DialogTitle>/g, '</h2>');
content = content.replace(/<DialogDescription className="text-white\/50">/g, '<p className="text-white/50 text-sm">');
content = content.replace(/<\/DialogDescription>\s*<\/DialogHeader>/g, '</p>\n        </div>');

// 5. Replace Dialog closing tags
content = content.replace(/<\/DialogContent>\s*<\/Dialog>/g, '</div>\n    </div>');

// 6. Update DashboardLayout rendering logic
const oldRenderLogic = /{needsMFA && \(\s*<MFAVerificationDialog[\s\S]*?\/>\s*\)}\s*<div className=\{cn\("flex h-screen overflow-hidden", needsMFA && "blur-sm pointer-events-none"\)\}>/;
const newRenderLogic = `if (needsMFA) {
    return <MFAVerificationPage onVerified={handleMFAVerified} user={user} db={db} />;
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">`;
content = content.replace(/return \(\s*<>\s*\{needsMFA && \([\s\S]*?\}\s*<div className=\{cn\("flex h-screen overflow-hidden", needsMFA && "blur-sm pointer-events-none"\)\}>/g, newRenderLogic);

// Ensure the Dialog imports are removed if we want to be clean, but they aren't strictly harmful if left.
fs.writeFileSync(file, content);
console.log('Refactored MFAVerificationDialog to MFAVerificationPage');
