const base = 'https://pb.gryf.ai';
const pid = '2dk63st2txjzbow';

async function test() {
    console.log('=== PASSWORD VERIFICATION ===\n');

    // 1. has-password
    let r = await fetch(base+'/api/process/has-password', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({processId: pid})
    });
    let d = await r.json();
    console.log('1. has-password:', JSON.stringify(d));
    console.log('   Result:', d.hasPassword ? 'OK - password detected' : 'FAIL - no password');

    // 2. Verify with WRONG password
    r = await fetch(base+'/api/shared/verify', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({processId: pid, password: 'wrongpassword'})
    });
    console.log('\n2. Wrong password: status=' + r.status, r.status === 401 ? 'OK (rejected)' : 'FAIL');

    // 3. Verify with CORRECT password
    r = await fetch(base+'/api/shared/verify', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({processId: pid, password: 'haselko'})
    });
    d = await r.json();
    console.log('\n3. Correct password: status=' + (d.name ? '200' : 'err'));
    console.log('   Process name:', d.name || 'ERROR: ' + JSON.stringify(d));

    // 4. Verify with NO password (should reject)
    r = await fetch(base+'/api/shared/verify', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({processId: pid})
    });
    console.log('\n4. No password: status=' + r.status, r.status === 401 ? 'OK (requires password)' : 'FAIL');

    console.log('\n=== DONE ===');
}
test().catch(e => console.error(e));
