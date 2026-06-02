import PocketBase from 'pocketbase';
import fs from 'fs';

const pb = new PocketBase('https://pb.gryf.ai');

async function auditDB() {
    try {
        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword('admin@admin.pl', '1234567890');
        
        console.log('--- Fetching Collections Schema ---');
        const collections = await pb.collections.getFullList();
        
        let report = '# Database Audit Report\n\n';
        report += '## Collections Summary\n';
        
        for (const col of collections) {
            if (col.name.startsWith('WORKFLOW_')) {
                report += `- **${col.name}**: ${col.type}\n`;
                const records = await pb.collection(col.name).getList(1, 1);
                report += `  - Total records (approx): ${records.totalItems}\n`;
                
                const schemaFields = col.schema || [];
                report += `  - Fields: ${schemaFields.map(f => f.name + ' (' + f.type + ')').join(', ')}\n`;
                if (!col.schema) {
                    report += `  - Raw col structure keys: ${Object.keys(col).join(', ')}\n`;
                }
            }
        }
        
        console.log('--- Analyzing orphaned records ---');
        report += '\n## Orphaned Records Analysis\n';
        
        // Example check: Workspaces without valid owners (if there's an owner field)
        try {
            const workspaces = await pb.collection('WORKFLOW_workspaces').getFullList();
            const users = await pb.collection('WORKFLOW_users').getFullList();
            const userIds = new Set(users.map(u => u.id));
            
            let orphanedWorkspaces = 0;
            for(const w of workspaces) {
                if (w.owner && !userIds.has(w.owner)) {
                    orphanedWorkspaces++;
                }
            }
            report += `- Orphaned Workspaces: ${orphanedWorkspaces}\n`;
        } catch (e) {
            console.log('Could not check workspaces:', e.message);
        }

        // Output report to console
        console.log('\n--- Audit Complete ---');
        
        // Write to file
        fs.writeFileSync('audit_report.md', report);
        console.log('Report saved to audit_report.md');
        
    } catch (err) {
        console.error('Error during audit:', err.message);
        if (err.response) console.error('Details:', err.response);
    }
}

auditDB();
