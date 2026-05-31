const fs = require('fs');
const path = require('path');

const srcDir = path.join('d:', 'GRYF AI', 'WORKFLOW', 'src');

const replacements = [
    {
        file: 'components/dashboard/NotificationsTab.tsx',
        replacements: [
            ['// Unikamy duplikatów przy doładowywaniu', '// Avoid duplicates when fetching more']
        ]
    },
    {
        file: 'components/layout/CookieBanner.tsx',
        replacements: [
            ['{/* Niezbędne */}', '{/* Required */}']
        ]
    },
    {
        file: 'components/layout/GlobalRealtimeListener.tsx',
        replacements: [
            ["// Zabezpieczony debounce dla odświeżania workspace'ów, by uniknąć piku zapytań (throttling serwera)", "// Debounced workspace refresh to prevent query spikes (server throttling)"]
        ]
    },
    {
        file: 'components/panels/AiAssistantPanel.tsx',
        replacements: [
            ['const ENABLE_TOOL_SUGGESTIONS = true; // Zmień na true, aby przywrócić sugerowanie narzędzi w karuzeli', 'const ENABLE_TOOL_SUGGESTIONS = true; // Set to true to restore tool suggestions in the carousel']
        ]
    },
    {
        file: 'components/panels/SearchPanel.tsx',
        replacements: [
            ['// Zbieranie unikalnych użytkowników z węzłów i krawędzi', '// Collect unique users from nodes and edges']
        ]
    },
    {
        file: 'components/panels/VersionHistoryPanel.tsx',
        replacements: [
            ['// Fallback do ręcznego formatowania jeśli new Date nie dał rady', '// Fallback to manual formatting if Date parsing fails']
        ]
    },
    {
        file: 'components/ui/Tutorial.tsx',
        replacements: [
            ['onEnter?: () => void;  // Wywoływane gdy wchodzimy na ten krok', 'onEnter?: () => void;  // Called when entering this step'],
            ['onLeave?: () => void;  // Wywoływane gdy opuszczamy ten krok', 'onLeave?: () => void;  // Called when leaving this step'],
            ['// Pozycja i rotacja strzałki zależy od placement:', '// Arrow position and rotation depend on placement:'],
            ['// placement=right  → strzałka po lewej stronie dymka, wskazuje w lewo', '// placement=right  → arrow on the left side of the tooltip, pointing left'],
            ['// placement=left   → strzałka po prawej stronie dymka, wskazuje w prawo', '// placement=left   → arrow on the right side of the tooltip, pointing right'],
            ['// placement=bottom → strzałka na górze dymka, wskazuje w górę', '// placement=bottom → arrow on the top of the tooltip, pointing up'],
            ['// placement=top    → strzałka na dole dymka, wskazuje w dół', '// placement=top    → arrow on the bottom of the tooltip, pointing down'],
            ['// --- Definicja kroków ---', '// --- Step Definitions ---'],
            ['// Programistycznie otwieramy menu radialne na środku canvasa', '// Programmatically open the radial menu in the center of the canvas'],
            ['// Automatyczny start dla nowych użytkowników', '// Auto-start for new users'],
            ['// Oblicz pozycję dymka gdy zmienia się krok lub rozmiar okna', '// Calculate tooltip position on step or window resize'],
            ['// Mały delay na drugi render, kiedy tooltipRef ma już zmierzony height lub cel się wyrenderuje', '// Small delay for the second render, when tooltipRef has measured height or target is rendered'],
            ['// Resetuj krok gdy samouczek jest uruchamiany ponownie', '// Reset step when tutorial restarts'],
            ['// Wywołuj onEnter/onLeave przy zmianie kroków', '// Trigger onEnter/onLeave on step change'],
            ['// Najpierw wywołaj onLeave aktualnego kroku', '// First trigger onLeave for current step'],
            ['{/* Spotlight na docelowy element */}', '{/* Spotlight on target element */}'],
            ['{/* Dymek z dziubkiem */}', '{/* Tooltip with arrow */}'],
            ['{/* Strzałka (dziubek) wskazująca na element */}', '{/* Arrow pointing to the element */}'],
            ['{/* Zawartość dymka */}', '{/* Tooltip content */}'],
            ['{/* Nagłówek z pulsującą kropką i licznikiem */}', '{/* Header with pulsating dot and counter */}'],
            ['{/* Pulsująca złota kropka */}', '{/* Pulsating gold dot */}'],
            ['{/* Treść */}', '{/* Content */}']
        ]
    },
    {
        file: 'hooks/useProcessFileOperations.ts',
        replacements: [
            ['// Zamieniamy ewentualne łamania linii, by ładnie wyglądały jako pod-lista w markdownie', '// Replace line breaks to format nicely as a sublist in markdown']
        ]
    },
    {
        file: 'hooks/useProcessLock.ts',
        replacements: [
            ['// Spróbuj odzyskać blokadę po powrocie do aktywnej karty', '// Try to regain lock upon returning to active tab']
        ]
    },
    {
        file: 'lib/cookieManager.ts',
        replacements: [
            ['// Jeśli skrypty o tym id już istnieją, nie wstrzykuj ponownie', '// If scripts with this ID already exist, do not inject again']
        ]
    },
    {
        file: 'lib/layout.ts',
        replacements: [
            ['// Standardowe wymiary węzłów', '// Standard node dimensions'],
            ['nodesep: 80, // Zmniejszono z 120, żeby było bardziej kompaktowo', 'nodesep: 80, // Decreased from 120 for a more compact layout'],
            ['ranksep: 200, // Zmniejszono z 250, żeby było bardziej kompaktowo', 'ranksep: 200, // Decreased from 250 for a more compact layout'],
            ["// Węzły w React Flow nie zmieniają fizycznie swoich wymiarów przy 'rotacji'", "// React Flow nodes do not physically change dimensions upon 'rotation'"],
            ['// Rotacja w tym systemie oznacza tylko przemieszczenie punktów połączeń (handles)', '// Rotation in this system only means displacing connection points (handles)'],
            ["// Mniejsze wymiary dla małych node'ów", "// Smaller dimensions for small nodes"],
            ['return node; // Zwracamy notatkę w niezmienionym miejscu', 'return node; // Return note in an unchanged position'],
            ['// Jeśli z jakiegoś powodu node nie ma pozycji w dagre, zwracamy bez zmian', '// If for some reason the node lacks position in dagre, return unchanged'],
            ['// Pobieramy wymiary użyte dla tego węzła w Dagre', '// Retrieve dimensions used for this node in Dagre'],
            ['rotation: targetRotation // Wymuszamy obrót złączy (kropeczek) zgodnie z kierunkiem układu!', 'rotation: targetRotation // Force connection points rotation according to layout direction']
        ]
    },
    {
        file: 'lib/processLockService.ts',
        replacements: [
            ['// Używamy atomowego endpointu blokady zamiast wysyłania zapytania getOne() a potem update().', '// Use atomic lock endpoint instead of getOne() followed by update().'],
            ['// Backend samodzielnie sprawdza, czy jesteśmy właścicielem locka i odświeża locked_at.', '// Backend automatically verifies lock ownership and refreshes locked_at.']
        ]
    },
    {
        file: 'main.tsx',
        replacements: [
            ['// Zastąp natywny EventSource polyfillem, który może pomóc w problemach z połączeniem', '// Replace native EventSource with polyfill to mitigate connection issues']
        ]
    },
    {
        file: 'pages/DashboardPage.tsx',
        replacements: [
            ['// Po wyrenderowaniu się Dashboardu oznaczamy, że pierwsze ładowanie minęło.', '// Mark initial loading as complete after Dashboard renders.'],
            ['// Dzięki temu kolejne ładowania zakładek użyją małego, opóźnionego loadera.', '// Subsequent tab loads will use a small, delayed loader.'],
            ['// Zabezpieczenie przed brakiem danych', '// Safeguard against missing data']
        ]
    },
    {
        file: 'store/slices/createMetadataSlice.ts',
        replacements: [
            ['// Zignoruj błąd z logów jeśli żądanie zostało celowo anulowane przez PocketBase', '// Ignore log error if request was intentionally aborted by PocketBase']
        ]
    }
];

let changedFiles = 0;

for (const group of replacements) {
    const fullPath = path.join(srcDir, group.file);
    if (!fs.existsSync(fullPath)) {
        console.warn('File not found:', fullPath);
        continue;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    for (const [search, replace] of group.replacements) {
        if (content.includes(search)) {
            content = content.replace(search, replace);
            modified = true;
        } else {
            console.warn('Could not find in ' + group.file + ':\n' + search);
        }
    }
    
    if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated:', group.file);
        changedFiles++;
    }
}

console.log('Total files updated:', changedFiles);
