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
    const faqs = data.items;
    
    let found = false;
    for (const faq of faqs) {
        const textToSearch = (faq.question_pl + " " + faq.answer_pl + " " + faq.question_en + " " + faq.answer_en).toLowerCase();
        if (textToSearch.includes("role") || textToSearch.includes("edytor") || textToSearch.includes("editor") || textToSearch.includes("uprawnieni") || textToSearch.includes("admin")) {
            console.log(`\n=== FAQ ID: ${faq.id} ===`);
            console.log(`Q (PL): ${faq.question_pl}`);
            console.log(`A (PL): ${faq.answer_pl}`);
            console.log(`Q (EN): ${faq.question_en}`);
            console.log(`A (EN): ${faq.answer_en}`);
            found = true;
        }
    }
    
    if (!found) console.log("Nie znaleziono FAQ związanych z rolami.");
}

main().catch(err => console.error(err));
