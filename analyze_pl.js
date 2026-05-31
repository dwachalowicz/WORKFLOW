const fs = require('fs');
const path = require('path');

const srcDir = path.join('d:', 'GRYF AI', 'WORKFLOW', 'src');
const i18nDir = path.join(srcDir, 'i18n');
const outputFile = path.join('d:', 'GRYF AI', 'WORKFLOW', 'polish_strings_report.md');

const plRegex = /[ąćęłńśźżĄĆĘŁŃŚŹŻ]/;

function findFiles(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        if (fullPath.startsWith(i18nDir)) continue;
        
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findFiles(fullPath, files);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }
    return files;
}

const allFiles = findFiles(srcDir);
let report = `# Raport: Analiza hardcodowanych polskich znaków w kodzie (poza i18n)\n\n`;
let totalMatches = 0;

for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let fileMatches = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        // Ignore single line comments
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
        
        if (plRegex.test(line)) {
            fileMatches.push({ lineNum: i + 1, content: trimmed });
            totalMatches++;
        }
    }
    
    if (fileMatches.length > 0) {
        const relativePath = path.relative(srcDir, file);
        report += `## ${relativePath}\n`;
        report += `| Linia | Treść |\n|---|---|\n`;
        for (const match of fileMatches) {
            // escape backticks, pipes, and newlines
            let safeContent = match.content.replace(/\|/g, '\\|').replace(/`/g, '\\`').substring(0, 100);
            if (match.content.length > 100) safeContent += '...';
            report += `| ${match.lineNum} | \`${safeContent}\` |\n`;
        }
        report += '\n';
    }
}

report = `**Całkowita liczba znalezionych wystąpień**: ${totalMatches}\n\n` + report;
fs.writeFileSync(outputFile, report);
console.log('Report generated at ' + outputFile);
