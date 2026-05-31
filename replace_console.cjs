const fs = require('fs');
const path = require('path');

const srcDir = path.join('d:', 'GRYF AI', 'WORKFLOW', 'src');

const replacements = [
    {
        file: 'landingpage/OfferSection.tsx',
        replacements: [
            ['console.error("Błąd podczas wysyłania wiadomości:", error);', 'console.error("Error sending message:", error);']
        ]
    },
    {
        file: 'pages/ContactPage.tsx',
        replacements: [
            ['console.error("Błąd podczas wysyłania wiadomości:", error);', 'console.error("Error sending message:", error);']
        ]
    },
    {
        file: 'lib/aiService.ts',
        replacements: [
            ["console.error('Błąd weryfikacji klucza AI:', err);", "console.error('AI Key verification error:', err);"],
            ["console.error('Nie udało się pobrać konfiguracji użytkownika:', err);", "console.error('Failed to fetch user configuration:', err);"]
        ]
    }
];

let changedFiles = 0;

for (const group of replacements) {
    const fullPath = path.join(srcDir, group.file);
    if (!fs.existsSync(fullPath)) {
        console.warn('File not found:', fullPath);
        continue;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    for (const [search, replace] of group.replacements) {
        if (content.includes(search)) {
            content = content.replace(search, replace);
            modified = true;
        } else {
            console.warn('Could not find in ' + group.file + ':\n' + search);
        }
    }
    
    if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated:', group.file);
        changedFiles++;
    }
}

console.log('Total files updated:', changedFiles);
