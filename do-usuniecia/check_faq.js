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

    const collRes = await fetch(`${PB_URL}/api/collections?perPage=100`, {
        headers: { 'Authorization': token }
    });
    const colls = await collRes.json();
    const faqColl = colls.items.find(c => c.name.toLowerCase().includes('faq'));
    
    if (faqColl) {
        console.log(`Found FAQ collection: ${faqColl.name}`);
        const faqsRes = await fetch(`${PB_URL}/api/collections/${faqColl.name}/records?perPage=50`, {
            headers: { 'Authorization': token }
        });
        const faqs = await faqsRes.json();
        faqs.items.forEach(f => {
            console.log(`Q: ${f.question}`);
            console.log(`A: ${f.answer}`);
            console.log('---');
        });
    } else {
        console.log("No FAQ collection found.");
    }
}
main();
