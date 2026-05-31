/**
 * Audit diagnostic script — checks ALL WORKFLOW_* collection rules, 
 * field settings (especially publicPassword), and security configuration.
 * 
 * Connection pattern from do-usuniecia/check_pb.js
 */
const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    console.log('=== GRYF.AI PocketBase Full Audit ===\n');

    // 1. Auth as admin/superuser
    console.log('1. Authenticating...');
    let token;
    try {
        const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        if (!authRes.ok) {
            console.error('Auth failed:', await authRes.text());
            return;
        }
        const authData = await authRes.json();
        token = authData.token;
        console.log('   OK - authenticated\n');
    } catch (err) {
        console.error('Auth error:', err.message);
        return;
    }

    const headers = { 'Authorization': token };

    // 2. Fetch ALL collections
    console.log('2. Fetching all collections...\n');
    const collectionsRes = await fetch(`${PB_URL}/api/collections?perPage=200`, { headers });
    if (!collectionsRes.ok) {
        console.error('Failed to fetch collections:', await collectionsRes.text());
        return;
    }

    const collectionsData = await collectionsRes.json();
    const allCollections = collectionsData.items || collectionsData;

    // Filter WORKFLOW_* and related collections
    const workflowCollections = allCollections.filter(c => 
        c.name.startsWith('WORKFLOW_') || 
        c.name === 'KATALOG_NARZEDZI' || 
        c.name === 'landing_translations'
    );

    console.log(`   Found ${workflowCollections.length} relevant collections\n`);

    // 3. For each collection, print rules and field details
    for (const coll of workflowCollections) {
        console.log('═'.repeat(80));
        console.log(`COLLECTION: ${coll.name} (type: ${coll.type})`);
        console.log('─'.repeat(80));
        
        // API Rules
        console.log('  API RULES:');
        console.log(`    listRule:   ${JSON.stringify(coll.listRule)}`);
        console.log(`    viewRule:   ${JSON.stringify(coll.viewRule)}`);
        console.log(`    createRule: ${JSON.stringify(coll.createRule)}`);
        console.log(`    updateRule: ${JSON.stringify(coll.updateRule)}`);
        console.log(`    deleteRule: ${JSON.stringify(coll.deleteRule)}`);
        
        // Fields
        if (coll.fields && coll.fields.length > 0) {
            console.log('  FIELDS:');
            for (const field of coll.fields) {
                let fieldInfo = `    - ${field.name} (${field.type})`;
                
                // Add important attributes
                const attrs = [];
                if (field.required) attrs.push('REQUIRED');
                if (field.hidden) attrs.push('🔒 HIDDEN');
                if (field.presentable) attrs.push('presentable');
                if (field.maxSize) attrs.push(`maxSize=${field.maxSize}`);
                if (field.min !== undefined && field.min !== null) attrs.push(`min=${field.min}`);
                if (field.max !== undefined && field.max !== null) attrs.push(`max=${field.max}`);
                if (field.pattern) attrs.push(`pattern=${field.pattern}`);
                if (field.values && field.values.length) attrs.push(`values=[${field.values.join(',')}]`);
                if (field.collectionId) attrs.push(`→ collection=${field.collectionId}`);
                if (field.cascadeDelete) attrs.push('CASCADE_DELETE');
                if (field.onlyEmailDomains && field.onlyEmailDomains.length) attrs.push(`emailDomains=${field.onlyEmailDomains}`);
                if (field.cost) attrs.push(`cost=${field.cost}`);
                if (field.autogeneratePattern) attrs.push(`autogenerate=${field.autogeneratePattern}`);
                
                if (attrs.length > 0) {
                    fieldInfo += ` [${attrs.join(', ')}]`;
                }
                
                console.log(fieldInfo);
            }
        }
        
        console.log('');
    }

    // 4. Special focus on WORKFLOW_processes - publicPassword field
    console.log('\n' + '═'.repeat(80));
    console.log('SPECIAL FOCUS: WORKFLOW_processes → publicPassword field');
    console.log('═'.repeat(80));
    
    const processCollection = workflowCollections.find(c => c.name === 'WORKFLOW_processes');
    if (processCollection) {
        const pwField = processCollection.fields.find(f => f.name === 'publicPassword');
        if (pwField) {
            console.log('  FOUND publicPassword field:');
            console.log('  Full config:', JSON.stringify(pwField, null, 4));
        } else {
            console.log('  ⚠️ publicPassword field NOT FOUND in WORKFLOW_processes');
            console.log('  Available fields:', processCollection.fields.map(f => f.name).join(', '));
        }
    }

    // 5. Check a sample process to see if publicPassword is readable
    console.log('\n' + '═'.repeat(80));
    console.log('TEST: Can publicPassword be read via API?');
    console.log('═'.repeat(80));
    
    try {
        const sampleRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records?perPage=3&fields=id,name,isPublic,publicPassword`, { headers });
        if (sampleRes.ok) {
            const sampleData = await sampleRes.json();
            for (const proc of sampleData.items) {
                console.log(`  Process "${proc.name}" (${proc.id}):`);
                console.log(`    isPublic: ${proc.isPublic}`);
                console.log(`    publicPassword: ${JSON.stringify(proc.publicPassword)} (type: ${typeof proc.publicPassword})`);
            }
        } else {
            console.log('  Failed to fetch sample:', await sampleRes.text());
        }
    } catch (err) {
        console.log('  Error:', err.message);
    }

    // 6. Check shared-process endpoint for password handling
    console.log('\n' + '═'.repeat(80));
    console.log('AUDIT: Password storage analysis');
    console.log('═'.repeat(80));
    console.log('  Questions to answer:');
    console.log('  1. Is publicPassword stored in plaintext or hashed/encrypted?');
    console.log('  2. Is the field marked as "hidden" in PocketBase schema?');
    console.log('  3. Can regular users read the password value via API?');

    console.log('\n=== Audit Complete ===');
}

main().catch(err => console.error('Fatal error:', err));
