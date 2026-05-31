const fs = require('fs');
const path = require('path');

const srcDir = path.join('d:', 'GRYF AI', 'WORKFLOW', 'src');
const outputFile = path.join('d:', 'GRYF AI', 'WORKFLOW', 'polish_comments_report.md');

const plCharsRegex = /[ąćęłńśźżĄĆĘŁŃŚŹŻ]/;
const plWordsRegex = /\b(w|z|na|do|dla|jest|jak|aby|to|nie|tak|czy|oraz|lub|albo|że|bo|ponieważ|jeśli|gdy|kiedy|tutaj|teraz|potem|przed|po|plik|funkcja|błąd|dane|użytkownik|serwer|klient|stan|komponent)\b/i;

function findFiles(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.git') || fullPath.includes('i18n')) continue;
        
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findFiles(fullPath, files);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            files.push(fullPath);
        }
    }
    return files;
}

const allFiles = findFiles(srcDir);
let report = `# Raport: Analiza polskich komentarzy w kodzie\n\n`;
let totalMatches = 0;

for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let fileMatches = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match lines that contain comments and look like Polish
        if (line.includes('//') || line.includes('/*') || line.includes('*/') || line.includes('<!--')) {
            // Extract the comment part to avoid matching code
            let commentPart = line;
            if (line.includes('//')) commentPart = line.substring(line.indexOf('//'));
            else if (line.includes('/*')) commentPart = line.substring(line.indexOf('/*'));
            
            if (plCharsRegex.test(commentPart) || plWordsRegex.test(commentPart)) {
                // exclude false positives where common words match english (like "to", "do") if there are no Polish chars and it's mostly english
                // Actually, just let it output, I will filter manually
                fileMatches.push({ lineNum: i + 1, content: line.trim() });
                totalMatches++;
            }
        }
    }
    
    if (fileMatches.length > 0) {
        const relativePath = path.relative(srcDir, file);
        report += `## ${relativePath}\n`;
        report += `| Linia | Treść |\n|---|---|\n`;
        for (const match of fileMatches) {
            let safeContent = match.content.replace(/\|/g, '\\|').replace(/`/g, '\\`').substring(0, 150);
            if (match.content.length > 150) safeContent += '...';
            report += `| ${match.lineNum} | \`${safeContent}\` |\n`;
        }
        report += '\n';
    }
}

report = `**Całkowita liczba znalezionych wystąpień**: ${totalMatches}\n\n` + report;
fs.writeFileSync(outputFile, report);
console.log('Report generated at ' + outputFile);
