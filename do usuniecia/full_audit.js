import PocketBase from 'pocketbase';
import fs from 'fs';

const pb = new PocketBase('https://pb.gryf.ai');

async function fullAudit() {
    try {
        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword('admin@admin.pl', '1234567890');

        let report = '# Full Database Audit Report\n';
        report += `Generated: ${new Date().toISOString()}\n\n`;

        // 1. Collections overview
        console.log('--- Fetching all collections ---');
        const collections = await pb.collections.getFullList();
        const wfCollections = collections.filter(c => c.name.startsWith('WORKFLOW_') || c.name === 'KATALOG_NARZEDZI' || c.name === 'landing_translations');

        report += '## 1. Collections Schema\n\n';
        for (const col of wfCollections) {
            const records = await pb.collection(col.name).getList(1, 1);
            report += `### ${col.name}\n`;
            report += `- Type: ${col.type}\n`;
            report += `- Total records: ${records.totalItems}\n`;
            report += `- Fields:\n`;
            const fields = col.fields || col.schema || [];
            for (const f of fields) {
                report += `  - \`${f.name}\` (${f.type})${f.required ? ' [REQUIRED]' : ''}${f.unique ? ' [UNIQUE]' : ''}\n`;
                if (f.type === 'relation') {
                    report += `    - Related collection: ${f.collectionId || 'unknown'}\n`;
                    report += `    - Cascade delete: ${f.cascadeDelete || false}\n`;
                    report += `    - Max select: ${f.maxSelect || 'unlimited'}\n`;
                }
            }
            // Show a sample record
            if (records.items.length > 0) {
                report += `- Sample record keys: ${Object.keys(records.items[0]).join(', ')}\n`;
            }
            report += '\n';
        }

        // 2. Orphan analysis
        console.log('--- Orphan analysis ---');
        report += '## 2. Orphaned Records Analysis\n\n';

        // Check workspaces with missing owners
        try {
            const workspaces = await pb.collection('WORKFLOW_workspaces').getFullList();
            const users = await pb.collection('WORKFLOW_users').getFullList();
            const userIds = new Set(users.map(u => u.id));

            let orphanedW = 0;
            const orphanedWorkspaceDetails = [];
            for (const w of workspaces) {
                if (w.owner && !userIds.has(w.owner)) {
                    orphanedW++;
                    orphanedWorkspaceDetails.push(`  - Workspace "${w.name}" (${w.id}) has owner ${w.owner} which doesn't exist`);
                }
            }
            report += `### Workspaces without valid owner: ${orphanedW}\n`;
            if (orphanedWorkspaceDetails.length) report += orphanedWorkspaceDetails.join('\n') + '\n';
            report += '\n';
        } catch (e) { report += `Could not check workspaces: ${e.message}\n\n`; }

        // Check processes with missing owners or workspaces
        try {
            const processes = await pb.collection('WORKFLOW_processes').getFullList();
            const users = await pb.collection('WORKFLOW_users').getFullList();
            const workspaces = await pb.collection('WORKFLOW_workspaces').getFullList();
            const userIds = new Set(users.map(u => u.id));
            const wsIds = new Set(workspaces.map(w => w.id));

            let orphanedOwner = 0;
            let orphanedWs = 0;
            let orphanedGroup = 0;
            const details = [];
            for (const p of processes) {
                if (p.owner && !userIds.has(p.owner)) {
                    orphanedOwner++;
                    details.push(`  - Process "${p.name}" (${p.id}): missing owner ${p.owner}`);
                }
                if (p.workspace && !wsIds.has(p.workspace)) {
                    orphanedWs++;
                    details.push(`  - Process "${p.name}" (${p.id}): missing workspace ${p.workspace}`);
                }
            }
            report += `### Processes with missing owner: ${orphanedOwner}\n`;
            report += `### Processes with missing workspace: ${orphanedWs}\n`;
            if (details.length) report += details.join('\n') + '\n';
            report += '\n';
        } catch (e) { report += `Could not check processes: ${e.message}\n\n`; }

        // Check workspace members with missing user or workspace
        try {
            const members = await pb.collection('WORKFLOW_workspace_members').getFullList();
            const users = await pb.collection('WORKFLOW_users').getFullList();
            const workspaces = await pb.collection('WORKFLOW_workspaces').getFullList();
            const userIds = new Set(users.map(u => u.id));
            const wsIds = new Set(workspaces.map(w => w.id));

            let missingUser = 0;
            let missingWs = 0;
            let pendingInvites = 0;
            const details = [];
            for (const m of members) {
                if (m.user && !userIds.has(m.user)) {
                    missingUser++;
                    details.push(`  - Member ${m.id}: missing user ${m.user}`);
                }
                if (m.workspace && !wsIds.has(m.workspace)) {
                    missingWs++;
                    details.push(`  - Member ${m.id}: missing workspace ${m.workspace}`);
                }
                if (m.status === 'pending') pendingInvites++;
            }
            report += `### Workspace members with missing user: ${missingUser}\n`;
            report += `### Workspace members with missing workspace: ${missingWs}\n`;
            report += `### Pending invitations: ${pendingInvites}\n`;
            if (details.length) report += details.join('\n') + '\n';
            report += '\n';
        } catch (e) { report += `Could not check members: ${e.message}\n\n`; }

        // Check comments with missing process or author
        try {
            const comments = await pb.collection('WORKFLOW_comments').getFullList();
            const processes = await pb.collection('WORKFLOW_processes').getFullList();
            const users = await pb.collection('WORKFLOW_users').getFullList();
            const processIds = new Set(processes.map(p => p.id));
            const userIds = new Set(users.map(u => u.id));

            let missingProcess = 0;
            let missingAuthor = 0;
            let orphanedParent = 0;
            const commentIds = new Set(comments.map(c => c.id));

            for (const c of comments) {
                if (c.process && !processIds.has(c.process)) missingProcess++;
                if (c.author && !userIds.has(c.author)) missingAuthor++;
                if (c.parent_id && !commentIds.has(c.parent_id)) orphanedParent++;
            }
            report += `### Comments with missing process: ${missingProcess}\n`;
            report += `### Comments with missing author: ${missingAuthor}\n`;
            report += `### Comments with missing parent: ${orphanedParent}\n\n`;
        } catch (e) { report += `Could not check comments: ${e.message}\n\n`; }

        // Check versions with missing process or created_by
        try {
            const versions = await pb.collection('WORKFLOW_versions').getFullList();
            const processes = await pb.collection('WORKFLOW_processes').getFullList();
            const users = await pb.collection('WORKFLOW_users').getFullList();
            const processIds = new Set(processes.map(p => p.id));
            const userIds = new Set(users.map(u => u.id));

            let missingProcess = 0;
            let missingCreator = 0;
            for (const v of versions) {
                if (v.process && !processIds.has(v.process)) missingProcess++;
                if (v.created_by && !userIds.has(v.created_by)) missingCreator++;
            }
            report += `### Versions with missing process: ${missingProcess}\n`;
            report += `### Versions with missing creator: ${missingCreator}\n\n`;
        } catch (e) { report += `Could not check versions: ${e.message}\n\n`; }

        // Check groups with missing workspace
        try {
            const groups = await pb.collection('WORKFLOW_groups').getFullList();
            const workspaces = await pb.collection('WORKFLOW_workspaces').getFullList();
            const wsIds = new Set(workspaces.map(w => w.id));

            let missingWs = 0;
            for (const g of groups) {
                if (g.workspace && !wsIds.has(g.workspace)) missingWs++;
            }
            report += `### Groups with missing workspace: ${missingWs}\n\n`;
        } catch (e) { report += `Could not check groups: ${e.message}\n\n`; }

        // Check notifications with missing user
        try {
            const notifications = await pb.collection('WORKFLOW_notifications').getFullList();
            const users = await pb.collection('WORKFLOW_users').getFullList();
            const userIds = new Set(users.map(u => u.id));

            let missingUser = 0;
            let unread = 0;
            for (const n of notifications) {
                if (n.user && !userIds.has(n.user)) missingUser++;
                if (!n.isRead) unread++;
            }
            report += `### Notifications with missing user: ${missingUser}\n`;
            report += `### Unread notifications total: ${unread}\n\n`;
        } catch (e) { report += `Could not check notifications: ${e.message}\n\n`; }

        // Check process_map_layouts with missing workspace
        try {
            const layouts = await pb.collection('WORKFLOW_process_map_layouts').getFullList();
            const workspaces = await pb.collection('WORKFLOW_workspaces').getFullList();
            const wsIds = new Set(workspaces.map(w => w.id));

            let missingWs = 0;
            for (const l of layouts) {
                if (l.workspace && !wsIds.has(l.workspace)) missingWs++;
            }
            report += `### Process map layouts with missing workspace: ${missingWs}\n\n`;
        } catch (e) { report += `Could not check layouts: ${e.message}\n\n`; }

        // 3. Data integrity checks
        report += '## 3. Data Integrity Checks\n\n';

        // Check for processes with invalid JSON in nodes/edges
        try {
            const processes = await pb.collection('WORKFLOW_processes').getFullList();
            let invalidNodes = 0;
            let invalidEdges = 0;
            let emptyProcesses = 0;
            for (const p of processes) {
                const nodes = typeof p.nodes === 'string' ? JSON.parse(p.nodes) : p.nodes;
                const edges = typeof p.edges === 'string' ? JSON.parse(p.edges) : p.edges;
                if (!Array.isArray(nodes)) invalidNodes++;
                if (!Array.isArray(edges)) invalidEdges++;
                if (Array.isArray(nodes) && nodes.length === 0) emptyProcesses++;
            }
            report += `### Processes with non-array nodes: ${invalidNodes}\n`;
            report += `### Processes with non-array edges: ${invalidEdges}\n`;
            report += `### Empty processes (0 nodes): ${emptyProcesses}\n\n`;
        } catch (e) { report += `Could not check process data: ${e.message}\n\n`; }

        // Check for stale locks
        try {
            const processes = await pb.collection('WORKFLOW_processes').getFullList();
            const now = new Date();
            let staleLocks = 0;
            const staleDetails = [];
            for (const p of processes) {
                if (p.locked_by && p.locked_at) {
                    const lockedAt = new Date(p.locked_at);
                    const diffMinutes = (now - lockedAt) / 1000 / 60;
                    if (diffMinutes > 30) {
                        staleLocks++;
                        staleDetails.push(`  - Process "${p.name}" (${p.id}) locked since ${p.locked_at} (${Math.round(diffMinutes)}min ago)`);
                    }
                }
            }
            report += `### Stale locks (>30min): ${staleLocks}\n`;
            if (staleDetails.length) report += staleDetails.join('\n') + '\n';
            report += '\n';
        } catch (e) { report += `Could not check locks: ${e.message}\n\n`; }

        // 4. User tier distribution
        report += '## 4. User Statistics\n\n';
        try {
            const users = await pb.collection('WORKFLOW_users').getFullList();
            const tierCounts = {};
            for (const u of users) {
                const tier = u.tier || 'UNKNOWN';
                tierCounts[tier] = (tierCounts[tier] || 0) + 1;
            }
            report += `### Total users: ${users.length}\n`;
            for (const [tier, count] of Object.entries(tierCounts)) {
                report += `- ${tier}: ${count}\n`;
            }
            report += '\n';

            // Users with expired tiers
            const now = new Date();
            let expiredTiers = 0;
            for (const u of users) {
                if (u.tier_expires_at) {
                    const exp = new Date(u.tier_expires_at);
                    if (exp < now && u.tier !== 'FREE') {
                        expiredTiers++;
                    }
                }
            }
            report += `### Users with expired non-FREE tier: ${expiredTiers}\n\n`;
        } catch (e) { report += `Could not check users: ${e.message}\n\n`; }

        // 5. Collection rules summary
        report += '## 5. Collection API Rules\n\n';
        for (const col of wfCollections) {
            report += `### ${col.name}\n`;
            report += `- List rule: \`${col.listRule || 'NONE (admin only)'}\`\n`;
            report += `- View rule: \`${col.viewRule || 'NONE (admin only)'}\`\n`;
            report += `- Create rule: \`${col.createRule || 'NONE (admin only)'}\`\n`;
            report += `- Update rule: \`${col.updateRule || 'NONE (admin only)'}\`\n`;
            report += `- Delete rule: \`${col.deleteRule || 'NONE (admin only)'}\`\n\n`;
        }

        // Write report
        fs.writeFileSync('full_audit_report.md', report);
        console.log('Report saved to full_audit_report.md');
        console.log('\n--- Done ---');

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) console.error('Details:', err.response);
    }
}

fullAudit();
