**Całkowita liczba znalezionych wystąpień**: 138

# Raport: Analiza polskich komentarzy w kodzie

## App.tsx
| Linia | Treść |
|---|---|
| 34 | `// with identical text and layout (fixed, z-index), to make the transition from InitialLoader seamless.` |
| 39 | `// For subsequent pages, delay the spinner by 300ms to prevent flickering` |

## components\canvas\edges\CustomEdge.tsx
| Linia | Treść |
|---|---|
| 48 | `// Handle multiple edges between the same nodes to prevent badge overlap` |
| 49 | `// Memoized and subscribed ONLY to parallel edges to prevent global re-renders` |

## components\canvas\GryfCanvas.tsx
| Linia | Treść |
|---|---|
| 220 | `// Convert screen click coordinates to flow coordinates` |
| 351 | `{/* Canvas Toolbar / Panel - Moved to bottom right */}` |

## components\canvas\nodes\IncomingLinkBadge.tsx
| Linia | Treść |
|---|---|
| 18 | `/** When true, positions the outgoing badge to overlap a circular parent's arc */` |

## components\canvas\nodes\nodeUtils.ts
| Linia | Treść |
|---|---|
| 40 | `// We remove manual position classes to let standard React Flow styles perfectly center the handles.` |
| 54 | `// We remove manual position classes to let standard React Flow styles perfectly center the handles.` |

## components\canvas\nodes\NoteNode.tsx
| Linia | Treść |
|---|---|
| 27 | `// Local state + debounced sync to avoid store spam on every keystroke` |
| 54 | `// Flush on unmount to prevent data loss if node is removed while typing` |

## components\canvas\nodes\SimpleNode.tsx
| Linia | Treść |
|---|---|
| 81 | `// Filter unique users by name to show in cascade` |

## components\canvas\nodes\StartStopNode.tsx
| Linia | Treść |
|---|---|
| 52 | `// Resolve triggers/actions to arrays (backward-compatible)` |

## components\canvas\nodes\useNodeHooks.ts
| Linia | Treść |
|---|---|
| 82 | `// Force React Flow to recalculate edge positions during and after the animation.` |

## components\dashboard\MembersTab.tsx
| Linia | Treść |
|---|---|
| 39 | `// 1. Fetch members in two batches to avoid PocketBase 400 on expand with empty user` |
| 66 | `expand: undefined, // no user to expand` |

## components\dashboard\ProcessesTab.tsx
| Linia | Treść |
|---|---|
| 643 | `// Find existing copies to determine next number` |
| 829 | `{/* Drop zone indicator when inside folder - for dragging back to root */}` |

## components\dashboard\ProcessMapTab.tsx
| Linia | Treść |
|---|---|
| 141 | `// Custom edge to match the canvas HTML label exactly` |
| 219 | `{/* Target node label — positioned to the right of the icon */}` |
| 544 | `// Find the bounding box of connected nodes to place grid below` |

## components\layout\FloatingNavBar.tsx
| Linia | Treść |
|---|---|
| 99 | `{/* Logo Section — always clickable, links to dashboard */}` |
| 129 | `{/* Overlay for ring to avoid clipping in overflow container */}` |

## components\layout\GlobalRealtimeListener.tsx
| Linia | Treść |
|---|---|
| 14 | `// Debounced workspace refresh to prevent query spikes (server throttling)` |
| 29 | `// 1. Listen for changes to the current User (e.g. Stripe Tier update, Profile edits)` |
| 43 | `// 2. Listen for changes to Workspaces and Workspace Memberships` |
| 45 | `// - You getting invited to a new workspace` |
| 48 | `// - Someone accepting an invite to a workspace you own (pending members count updates)` |
| 62 | `// We can't easily filter workspaces if we want to hear about newly shared ones, so topic '*' is kept.` |

## components\layout\LandingLayout.tsx
| Linia | Treść |
|---|---|
| 15 | `{/* Dark banner for the transparent Navbar to sit on */}` |

## components\layout\navHelpers.tsx
| Linia | Treść |
|---|---|
| 2 | `// Extracted to eliminate duplication across nav components` |

## components\modals\AvatarCropModal.tsx
| Linia | Treść |
|---|---|
| 19 | `/** Record ID to update */` |

## components\modals\ProfileModal.tsx
| Linia | Treść |
|---|---|
| 210 | `// Refresh to load all workspaces correctly after a short delay so the toast is visible` |

## components\modals\ShareModal.tsx
| Linia | Treść |
|---|---|
| 44 | `// We use a boolean to indicate if one was previously set.` |

## components\modals\TemplatesModal.tsx
| Linia | Treść |
|---|---|
| 37 | `/** Resolve a Lucide icon name (e.g. "Users", "DollarSign") to a lazy component. */` |

## components\modals\__tests__\DeleteAccountModal.test.tsx
| Linia | Treść |
|---|---|
| 47 | `// Wait for deletion info to load` |

## components\panels\AiAssistantPanel.tsx
| Linia | Treść |
|---|---|
| 71 | `/** Keys that AI is NEVER allowed to set on node.data */` |
| 118 | `const ENABLE_TOOL_SUGGESTIONS = true; // Set to true to restore tool suggestions in the carousel` |
| 425 | `// Map AI generated SLA/cost fields to internal format` |
| 540 | `// Move STOP node to the right of the last generated node` |
| 563 | `// Use DB prompts with fallback — localized to active language` |
| 903 | `// Portal to body so the panel escapes FloatingNavBar's stacking context` |

## components\panels\NodeComments.tsx
| Linia | Treść |
|---|---|
| 57 | `// Only refresh if the comment belongs to this node` |
| 59 | `// Re-fetch comments to get expanded author data` |

## components\panels\properties\SubworkflowPicker.tsx
| Linia | Treść |
|---|---|
| 79 | `// Filter to business-logic nodes only` |
| 210 | `{/* Link to open the connected process */}` |

## components\panels\PropertiesPanel.tsx
| Linia | Treść |
|---|---|
| 49 | `// Use shallow comparison to avoid re-renders when nodes/edges only change positions (dragging)` |

## components\panels\VersionHistoryPanel.tsx
| Linia | Treść |
|---|---|
| 193 | `// Fallback to manual formatting if Date parsing fails` |

## components\ui\ErrorBoundary.tsx
| Linia | Treść |
|---|---|
| 26 | `// Future: send to Sentry / error tracking service` |

## components\ui\GroupPickerDropdown.tsx
| Linia | Treść |
|---|---|
| 16 | `/** Groups already assigned (to filter them out) */` |
| 18 | `/** Trigger element (defaults to UserPlus button) */` |
| 179 | `{/* Dropdown — fixed to avoid parent overflow clipping */}` |

## components\ui\RadialMenu.tsx
| Linia | Treść |
|---|---|
| 25 | `// We need to adjust position to be centered on the cursor` |
| 29 | `// Handle clicking outside to close` |
| 36 | `// Small timeout to avoid immediate closing if triggered via click` |

## components\ui\Tutorial.tsx
| Linia | Treść |
|---|---|
| 134 | `// Clamp to viewport` |
| 351 | `{/* Arrow pointing to the element */}` |

## hooks\usePBSubscription.ts
| Linia | Treść |
|---|---|
| 18 | `// Serialize options to avoid infinite re-renders if passed inline` |

## hooks\useProcessFileOperations.ts
| Linia | Treść |
|---|---|
| 46 | `// Replace line breaks to format nicely as a sublist in markdown` |

## hooks\useProcessLock.ts
| Linia | Treść |
|---|---|
| 18 | `// We already own the lock. Do not acquire again to prevent infinite loop.` |
| 37 | `// Free → try to acquire lock` |
| 63 | `// Try to regain lock upon returning to active tab` |
| 89 | `// Free -> try to acquire if we want, but usually evaluateLock handles initial.` |
| 90 | `// If it became free, let's call evaluateLock to try and grab it.` |
| 135 | `// Listen to realtime changes on this specific process lock` |

## landingpage\CasesSection.tsx
| Linia | Treść |
|---|---|
| 117 | `{/* Corner overlays to simulate a rounded window without clipping shadows at the bottom */}` |

## landingpage\components\ProcessCanvasWindow.tsx
| Linia | Treść |
|---|---|
| 123 | `{/* Start to Step 1 */}` |
| 126 | `{/* Step 1 to Condition (Left Path - Purple) */}` |
| 129 | `{/* Step 1 to Avatars (Right Path - Gray) */}` |
| 132 | `{/* Condition to Purple Node */}` |
| 135 | `{/* Avatars to Stop */}` |

## landingpage\Footer.tsx
| Linia | Treść |
|---|---|
| 23 | `// If no settings found or error, default to false (already set by useState)` |
| 39 | `{/* Call to Action Section */}` |
| 119 | `<a href="https://www.facebook.com/gryfai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 rounde...` |
| 120 | `<a href="https://x.com/gryf_ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 rounded-full w-8...` |
| 121 | `<a href="https://www.youtube.com/@gryf-ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 round...` |

## landingpage\FullScreenMobileMenu.tsx
| Linia | Treść |
|---|---|
| 77 | `<a href="https://www.facebook.com/gryfai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 rounde...` |
| 78 | `<a href="https://x.com/gryf_ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 rounded-full w-1...` |
| 79 | `<a href="https://www.youtube.com/@gryf-ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 round...` |

## landingpage\HeroSection.tsx
| Linia | Treść |
|---|---|
| 54 | `{/* Main Container matching Navbar margins (max-w-[1600px] px-[5%] md:px-16) */}` |
| 65 | `{/* GO RUN YOUR FLOW aligned perfectly to the left of GRYF */}` |
| 109 | `{/* Giant "4" - pushed to the right edge of the container */}` |
| 115 | `{/* WĘZŁÓW text perfectly left-aligned with the icons and MAPUJ PROCESY */}` |
| 126 | `{/* Map and Avatars Wrapper - Scaled down on mobile to fit the screen margins */}` |
| 143 | `{/* L5: Horizontal from Akceptuj to the right edge of the screen */}` |
| 147 | `{/* Animated Single Dot Container (Must be isolated in z-50 to overcome stacking context) */}` |
| 260 | `{/* Avatar Container rotated to point down */}` |
| 281 | `{/* Avatar Container rotated to point right */}` |

## landingpage\index.tsx
| Linia | Treść |
|---|---|
| 30 | `// Restore original theme on unmount (e.g. navigating to dashboard)` |

## landingpage\LandingTranslationContext.tsx
| Linia | Treść |
|---|---|
| 46 | `// 1. Sprawdź bazę danych PocketBase` |
| 52 | `// 2. Sprawdź system i18next (pl.ts / en.ts) bezpośrednio przez instancję i force namespace/lang` |

## landingpage\WorkflowConnections.tsx
| Linia | Treść |
|---|---|
| 99 | `let t = targetY / h; // 0 to 1` |
| 111 | `const theta = d / r; // 0 to PI/2` |

## landingpage\WorkflowSection.tsx
| Linia | Treść |
|---|---|
| 76 | `{/* Start to CENA > 0 */}` |
| 84 | `{/* Start to Otherwi... */}` |
| 92 | `{/* Otherwi... to underneath Alternatywn */}` |
| 100 | `{/* CENA > 0 to Alternatywn */}` |
| 108 | `{/* Database to Alternatywn */}` |
| 122 | `{/* Alternatywn to Right edge */}` |

## lib\backupService.ts
| Linia | Treść |
|---|---|
| 179 | `// Helper to create collection records with new IDs and map them` |
| 196 | `// Add a small delay to prevent network saturation / rate limits during heavy imports` |
| 212 | `wsRecord.owner = userId; // Transfer ownership to the importer` |
| 285 | `// 3.4 Create Members (Preserve all members, but map the owner to the new userId)` |
| 291 | `user: isOriginalOwner ? userId : r.user // Transfer old owner's membership to new owner, keep other users intact` |
| 311 | `// We don't export avatar files for processes, so we must remove the string filename to prevent PocketBase 400 Bad Request` |
| 334 | `// We need to do a second pass on Processes if there are circular triggerSubworkflow references` |
| 337 | `// So we need to update nodes in a separate pass AFTER all processes are created.` |
| 391 | `delete userUpdate.email; // Do not overwrite email` |
| 392 | `delete userUpdate.avatar; // Do not overwrite avatar` |

## lib\cascadeHelpers.ts
| Linia | Treść |
|---|---|
| 41 | `// Process in chunks to avoid URL length limits if there are many processes` |

## lib\commentService.ts
| Linia | Treść |
|---|---|
| 29 | `// Sort locally to prevent 400 errors if the DB schema hides or blocks the 'created' field sort` |
| 87 | `// Fetch with expand to get author details` |

## lib\cookieManager.ts
| Linia | Treść |
|---|---|
| 81 | `// If scripts with this ID already exist, do not inject again` |
| 84 | `// Parse the HTML to extract only safe <script src="..."> tags` |

## lib\diffUtils.ts
| Linia | Treść |
|---|---|
| 2 | `// Extracted from VersionHistoryPanel to follow SRP` |

## lib\groupService.ts
| Linia | Treść |
|---|---|
| 71 | `return _cache; // fallback to stale cache` |
| 157 | `// Helper to clean arrays of GroupRefs` |
| 203 | `/** Convert a full group record to a lightweight ref for storing on nodes/edges */` |

## lib\layout.ts
| Linia | Treść |
|---|---|
| 24 | `// React Flow nodes do not physically change dimensions upon 'rotation'` |
| 63 | `rotation: targetRotation // Force connection points rotation according to layout direction` |

## lib\limitEnforcer.ts
| Linia | Treść |
|---|---|
| 118 | `// do nothing` |

## lib\processLockService.ts
| Linia | Treść |
|---|---|
| 80 | `// Attempt to set lock using the atomic backend endpoint` |

## lib\tierLimits.ts
| Linia | Treść |
|---|---|
| 88 | `/** Convert DB value (999999) to JS Infinity for runtime checks */` |
| 209 | `// Subscribe to realtime changes — admin edits are instantly reflected` |

## main.tsx
| Linia | Treść |
|---|---|
| 8 | `// Replace native EventSource with polyfill to mitigate connection issues` |

## pages\AppPage.tsx
| Linia | Treść |
|---|---|
| 75 | `// Refresh workspace roles from server on mount to catch external changes` |
| 80 | `// Watch for role changes (e.g. user downgraded to viewer in another tab or dashboard)` |
| 97 | `// Only refresh if the comment belongs to the currently opened process` |

## pages\LoginPage.tsx
| Linia | Treść |
|---|---|
| 61 | `// Start 60s cooldown to prevent spam` |

## store\authStore.ts
| Linia | Treść |
|---|---|
| 121 | `// Refresh the auth state from DB to get latest tier, name, avatar etc.` |
| 133 | `// Compute effective tier (downgrade to FREE if subscription expired)` |
| 155 | `// Load tier configuration from database (non-blocking fallback to hardcoded)` |
| 267 | `// Add a small random delay to desynchronize simultaneous requests` |
| 442 | `// The server hook will automatically link the user and change status to 'pending' if the email exists.` |
| 473 | `// Use custom backend route to bypass workspace read API rules for non-members` |
| 509 | `// We must first create an empty (unverified) account to which Pocketbase will send the OTP email.` |

## store\confirmStore.ts
| Linia | Treść |
|---|---|
| 51 | `// Override close to resolve(false)` |

## store\slices\createProcessSlice.ts
| Linia | Treść |
|---|---|
| 164 | `// Label propagation to other processes is now securely and efficiently` |

