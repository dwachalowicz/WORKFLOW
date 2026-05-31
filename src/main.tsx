import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import './i18n/config'
import { EventSourcePolyfill } from 'event-source-polyfill';

// Replace native EventSource with polyfill to mitigate connection issues
// Zwiększamy heartbeatTimeout z domyślnych 45s do 330s (5.5 minuty), 
// ponieważ PocketBase wysyła ping co 5 minut. Zapobiega to ciągłym błędom w konsoli.
class CustomEventSource extends EventSourcePolyfill {
  constructor(url: string, eventSourceInitDict?: Record<string, unknown>) {
    super(url, { ...eventSourceInitDict, heartbeatTimeout: 330000 });
  }
}
window.EventSource = CustomEventSource as unknown as typeof EventSource;

import App from './App.tsx'

import { TooltipProvider } from '@/components/ui/tooltip'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>,
)
