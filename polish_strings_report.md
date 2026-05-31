**Całkowita liczba znalezionych wystąpień**: 24

# Raport: Analiza hardcodowanych polskich znaków w kodzie (poza i18n)

## components\layout\CookieBanner.tsx
| Linia | Treść |
|---|---|
| 111 | `{/* Niezbędne */}` |

## components\panels\AiAssistantPanel.tsx
| Linia | Treść |
|---|---|
| 118 | `const ENABLE_TOOL_SUGGESTIONS = true; // Zmień na true, aby przywrócić sugerowanie narzędzi w karuze...` |
| 310 | `const shouldIncludeTools = includeTools \|\| /katalog\|narzędz\|narzedzi\|tools/i.test(msg);` |

## components\ui\ThemeToggleButton.tsx
| Linia | Treść |
|---|---|
| 75 | `aria-label={\`${t('common.changeColor', 'Zmień kolor na')} ${c.name}\`}` |

## components\ui\Tutorial.tsx
| Linia | Treść |
|---|---|
| 11 | `onEnter?: () => void;  // Wywoływane gdy wchodzimy na ten krok` |
| 12 | `onLeave?: () => void;  // Wywoływane gdy opuszczamy ten krok` |
| 351 | `{/* Strzałka (dziubek) wskazująca na element */}` |
| 354 | `{/* Zawartość dymka */}` |
| 365 | `{/* Nagłówek z pulsującą kropką i licznikiem */}` |
| 368 | `{/* Pulsująca złota kropka */}` |
| 379 | `{/* Treść */}` |

## landingpage\HeroSection.tsx
| Linia | Treść |
|---|---|
| 115 | `{/* WĘZŁÓW text perfectly left-aligned with the icons and MAPUJ PROCESY */}` |

## landingpage\OfferSection.tsx
| Linia | Treść |
|---|---|
| 74 | `console.error("Błąd podczas wysyłania wiadomości:", error);` |

## landingpage\PricingSection.tsx
| Linia | Treść |
|---|---|
| 61 | `return \`${val} zł\`;` |

## landingpage\StatsSection.tsx
| Linia | Treść |
|---|---|
| 102 | `<img loading="lazy" src="/landingpage/avatar-hero2.png" className="w-8 h-8 rounded-full border borde...` |

## lib\aiService.ts
| Linia | Treść |
|---|---|
| 49 | `console.error('Błąd weryfikacji klucza AI:', err);` |
| 61 | `console.error('Nie udało się pobrać konfiguracji użytkownika:', err);` |

## lib\layout.ts
| Linia | Treść |
|---|---|
| 17 | `nodesep: 80, // Zmniejszono z 120, żeby było bardziej kompaktowo` |
| 18 | `ranksep: 200, // Zmniejszono z 250, żeby było bardziej kompaktowo` |
| 47 | `return node; // Zwracamy notatkę w niezmienionym miejscu` |
| 63 | `rotation: targetRotation // Wymuszamy obrót złączy (kropeczek) zgodnie z kierunkiem układu!` |

## lib\__tests__\parseUtils.test.ts
| Linia | Treść |
|---|---|
| 51 | `const result = sanitizeForFilter('ąćę');` |

## pages\ContactPage.tsx
| Linia | Treść |
|---|---|
| 32 | `console.error("Błąd podczas wysyłania wiadomości:", error);` |

## pages\LoginPage.tsx
| Linia | Treść |
|---|---|
| 232 | `<a href="/page/polityka-prywatnosci" target="_blank" rel="noopener noreferrer" className="text-brand...` |

