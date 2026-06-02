import PocketBase from 'pocketbase';
const pb = new PocketBase('https://pb.gryf.ai');

async function updateCommentsSchema() {
    try {
        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword('admin@admin.pl', '1234567890');
        
        console.log('Fetching WORKFLOW_comments collection schema...');
        const collection = await pb.collections.getOne('WORKFLOW_comments');
        
        const hasParentId = collection.fields.some(field => field.name === 'parent_id');
        
        if (hasParentId) {
            console.log('Field "parent_id" already exists in the fields. No changes made.');
            return;
        }

        console.log('Adding "parent_id" field to fields...');
        
        // Add new relation field for parent_id (v0.22 flat format)
        collection.fields.push({
            name: "parent_id",
            type: "relation",
            required: false,
            presentable: false,
            system: false,
            hidden: false,
            collectionId: collection.id, // self-reference
            cascadeDelete: true, // deleting parent deletes children
            minSelect: 0,
            maxSelect: 1,
        });

        console.log('Updating collection...');
        await pb.collections.update('WORKFLOW_comments', collection);
        
        console.log('Schema updated successfully! "parent_id" field added.');
        
    } catch (err) {
        console.error('Error updating schema:', err.message);
        if (err.response) {
            console.error('Details:', JSON.stringify(err.response, null, 2));
        }
    }
}

updateCommentsSchema();
