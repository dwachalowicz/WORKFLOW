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
    const roleFaq = faqs.items.find(f => f.question_pl.includes("role na poziomie Workspace"));
    if (roleFaq) {
        console.log(`Q: ${roleFaq.question_pl}`);
        console.log(`A: ${roleFaq.answer_pl}`);
    }
}
main();
