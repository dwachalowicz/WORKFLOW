const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await authRes.json();

    const commentsRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_comments`, {
        headers: { 'Authorization': token }
    });
    const commentsColl = await commentsRes.json();
    const authorField = commentsColl.fields.find(f => f.name === 'author');
    console.log("Author field structure:", JSON.stringify(authorField, null, 2));

    const collectionData = {
        name: "WORKFLOW_notifications",
        type: "base",
        system: false,
        fields: [
            {
                name: "user",
                type: "relation",
                required: true,
                collectionId: authorField.collectionId,
                cascadeDelete: true,
                maxSelect: 1
            },
            {
                name: "title",
                type: "text",
                required: true
            },
            {
                name: "message",
                type: "text",
                required: true
            },
            {
                name: "type",
                type: "text",
                required: true
            },
            {
                name: "isRead",
                type: "bool",
                required: false
            },
            {
                name: "link",
                type: "text",
                required: false
            }
        ],
        listRule: "user = @request.auth.id",
        viewRule: "user = @request.auth.id",
        createRule: null,
        updateRule: "user = @request.auth.id",
        deleteRule: "user = @request.auth.id"
    };

    console.log('Creating WORKFLOW_notifications...');
    const createRes = await fetch(`${PB_URL}/api/collections`, {
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(collectionData)
    });

    if (!createRes.ok) {
        console.error('BŁĄD:', await createRes.text());
    } else {
        console.log('Sukces!');
    }
}
main();
