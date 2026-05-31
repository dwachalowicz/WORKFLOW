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

    const faqsRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_faq/records?perPage=50`, {
        headers: { 'Authorization': token }
    });
    const faqs = await faqsRes.json();
    if (faqs.items.length > 0) {
        console.log("Keys:", Object.keys(faqs.items[0]));
        faqs.items.forEach(f => {
            console.log(`Q_PL: ${f.question_pl}`);
            console.log(`Q_EN: ${f.question_en}`);
            console.log('---');
        });
    }
}
main();
