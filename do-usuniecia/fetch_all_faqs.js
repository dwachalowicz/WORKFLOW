import fs from 'fs';

const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    let authData;
    const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    
    if (!authRes.ok) {
        const superRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        if (!superRes.ok) throw new Error("Auth failed");
        authData = await superRes.json();
    } else {
        authData = await authRes.json();
    }
    
    const token = authData.token;

    const faqRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_faq/records?perPage=500`, {
        headers: { 'Authorization': token }
    });
    
    const data = await faqRes.json();
    const faqs = data.items.map(f => ({
        id: f.id,
        question_pl: f.question_pl,
        answer_pl: f.answer_pl,
        question_en: f.question_en,
        answer_en: f.answer_en
    }));
    
    fs.writeFileSync('d:\\GRYF AI\\WORKFLOW\\do-usuniecia\\all_faqs.json', JSON.stringify(faqs, null, 2), 'utf-8');
    console.log("Written all faqs to all_faqs.json");
}

main().catch(err => console.error(err));
