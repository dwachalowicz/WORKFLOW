// Script do łączenia się z PocketBase z folderu do usuniecia
// Utworzono zgodnie z poleceniem
import PocketBase from 'pocketbase';

async function checkConnection() {
    const pb = new PocketBase('https://pb.gryf.ai');
    try {
        console.log("Próba logowania jako admin...");
        // Najnowsze wersje PocketBase korzystają z _superusers
        await pb.collection('_superusers').authWithPassword('admin@admin.pl', '1234567890');
        console.log("Połączono pomyślnie z bazą PocketBase!");
        
        // Zobaczmy przykładową kolekcję
        const processes = await pb.collection('WORKFLOW_processes').getList(1, 1);
        console.log("Pobrano kolekcje. Koniec testu.");
    } catch (e) {
        console.error("Błąd połączenia z PocketBase:", e.message);
    }
}

checkConnection();
