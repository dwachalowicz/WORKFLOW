import fs from 'fs';

async function checkPocketBaseRules() {
  const pbUrl = 'https://pb.gryf.ai';
  const email = 'admin@admin.pl';
  const password = '1234567890';

  try {
    // 1. Authenticate as superuser
    let authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password })
    });

    if (!authRes.ok) {
       // fallback to admins if older version
       authRes = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
      });
    }

    if (!authRes.ok) {
      throw new Error(`Auth failed: ${authRes.status} ${authRes.statusText}`);
    }

    const authData = await authRes.json();
    const token = authData.token;
    console.log('Successfully authenticated as admin.');

    // 2. Fetch all collections
    const collectionsRes = await fetch(`${pbUrl}/api/collections?perPage=500`, {
      headers: {
        'Authorization': token
      }
    });

    if (!collectionsRes.ok) {
      throw new Error(`Failed to fetch collections: ${collectionsRes.status}`);
    }

    const collectionsData = await collectionsRes.json();
    const collections = collectionsData.items;

    console.log(`Found ${collections.length} collections.\n`);

    const rulesReport = collections.map(c => {
      return `Collection: ${c.name} (${c.type})
  - List Rule:   ${c.listRule === null ? 'Admin only (null)' : c.listRule === '' ? 'Public (empty string)' : c.listRule}
  - View Rule:   ${c.viewRule === null ? 'Admin only (null)' : c.viewRule === '' ? 'Public (empty string)' : c.viewRule}
  - Create Rule: ${c.createRule === null ? 'Admin only (null)' : c.createRule === '' ? 'Public (empty string)' : c.createRule}
  - Update Rule: ${c.updateRule === null ? 'Admin only (null)' : c.updateRule === '' ? 'Public (empty string)' : c.updateRule}
  - Delete Rule: ${c.deleteRule === null ? 'Admin only (null)' : c.deleteRule === '' ? 'Public (empty string)' : c.deleteRule}
`;
    }).join('\n');

    fs.writeFileSync('do-usuniecia/rules-report.txt', rulesReport);
    console.log('Saved API rules report to do-usuniecia/rules-report.txt');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPocketBaseRules();
