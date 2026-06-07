// PocketBase v0.38+ (JSVM hooks)
// Endpoint: POST /api/ai/chat
// Klucz API nigdy nie opuszcza serwera.




// PROMPT MODULE FUNCTIONS MOVED INSIDE ROUTER FOR GOJA COMPATIBILITY

// =====================================================
// ROUTE: POST /api/ai/chat — AI Chat Proxy
// =====================================================
routerAdd("POST", "/api/ai/chat", (e) => {
    // INLINED HELPERS FOR GOJA
    function getEncryptionKey() {
        const key = $os.getenv("PB_ENCRYPTION_KEY");
        if (!key) throw new Error("PB_ENCRYPTION_KEY environment variable is not set.");
        return $security.sha256(key).substring(0, 32);
    }
    function decryptApiKey(cipherText) {
        if (!cipherText) return "";
        try { return $security.decrypt(cipherText, getEncryptionKey()); } 
        catch (err) { throw new Error("Failed to decrypt API key."); }
    }
    function getEffectiveTier(userRecord) {
        const userTier = (userRecord.get("tier") || "FREE").toUpperCase();
        const tierExpiry = userRecord.get("tier_expires_at");
        if (userTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) return "FREE";
        return userTier;
    }
    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }
    function isFuzzyMatch(queryWord, text) {
        if (text.indexOf(queryWord) !== -1) return true;
        const textWords = text.split(/[\s,.;:!?()"-]+/);
        const maxTypos = queryWord.length > 4 ? 2 : (queryWord.length > 2 ? 1 : 0);
        for (let i = 0; i < textWords.length; i++) {
            const tw = textWords[i];
            if (tw.length < 3 || Math.abs(tw.length - queryWord.length) > maxTypos) continue;
            if (levenshteinDistance(queryWord, tw) <= maxTypos) return true;
        }
        return false;
    }

    function buildToolsSection(lang, toolNames, promoToolNames) {
        if (!toolNames || toolNames.length === 0) return "";

        var promoMsg = "";
        if (promoToolNames && promoToolNames.length > 0) {
            promoMsg = lang === 'pl'
                ? " Oznaczenie PROMO posiadają narzędzia: " + promoToolNames.join(', ') + ". Rekomenduj je TYLKO jeśli faktycznie pasują kontekstowo do analizowanego procesu — sam fakt oznaczenia PROMO nie wystarczy."
                : " The following tools have the PROMO tag: " + promoToolNames.join(', ') + ". Recommend them ONLY if they are genuinely contextually relevant to the analyzed process — the PROMO tag alone is not sufficient.";
        }

        var jsonFormat = '\n```json workflow-tools\n{\n  '
            + (lang === 'pl' ? '"Dokładna Nazwa Narzędzia z katalogu": "Krótki opis jak to narzędzie pomoże w tym konkretnym procesie/etapie."' : '"Exact Tool Name from catalog": "Short explanation of how this tool helps in this specific process/stage."')
            + '\n}\n```';

        var scopeGuard = lang === 'pl'
            ? "\nSkup się TYLKO na opisie narzędzi. Absolutnie NIE wspominaj o przypisywaniu ról, edytorach, czytelnikach, decydentach ani o panelu właściwości."
            : "\nFocus ONLY on describing the tools. Absolutely DO NOT mention assigning roles, editors, readers, decision makers, or the properties panel.";

        if (lang === 'pl') {
            return "\nKatalog narzędzi (" + toolNames.length + "): " + toolNames.join(', ')
                + "\nGdy proszony o polecenie narzędzi, postępuj dwutorowo:"
                + "\n1) Poleć narzędzia do OGÓLNEJ automatyzacji i zarządzania całym procesem (np. orkiestracja, integracje, zarządzanie zadaniami)."
                + "\n2) Przeanalizuj KAŻDY węzeł/etap procesu OSOBNO i dopasuj do niego SPECYFICZNE narzędzia z katalogu na podstawie ich opisów. Np. jeśli etap dotyczy 'generowania audio/mp3', poleć narzędzia do generowania muzyki (np. Suno); jeśli etap dotyczy 'tworzenia grafik', poleć narzędzia graficzne — nie ograniczaj się do ogólników."
                + "\nPoleć WSZYSTKIE narzędzia z katalogu, które kontekstowo pasują — zarówno ogólne jak i specyficzne per-etap. Nie ograniczaj się do 3–5 — jeśli pasuje 10, 20 lub 30 narzędzi, wymień je wszystkie."
                + promoMsg
                + " Używaj DOKŁADNYCH nazw z tego katalogu."
                + " NA SAMYM KOŃCU ODPOWIEDZI umieść blok kodu json. Format bloku:"
                + jsonFormat
                + "\nTo jest wymagane, by zasilić UI karuzeli."
                + scopeGuard;
        } else {
            return "\nTool catalog (" + toolNames.length + "): " + toolNames.join(', ')
                + "\nWhen asked to recommend tools, take a two-pronged approach:"
                + "\n1) Recommend tools for GENERAL automation and management of the entire process (e.g., orchestration, integrations, task management)."
                + "\n2) Analyze EACH node/stage of the process INDIVIDUALLY and match SPECIFIC tools from the catalog based on their descriptions. E.g., if a stage involves 'generating audio/mp3', recommend music generation tools (e.g. Suno); if a stage involves 'creating graphics', recommend graphic design tools — don't limit to generics."
                + "\nRecommend ALL tools from the catalog that are contextually relevant — both general AND stage-specific. Do not limit yourself to 3–5 — if 10, 20, or 30 tools match, list them all."
                + promoMsg
                + " Use EXACT names from this catalog."
                + " AT THE VERY END OF YOUR RESPONSE output the json code block. Block format:"
                + jsonFormat
                + "\nThis is required to populate the UI carousel."
                + scopeGuard;
        }
    }

    function buildConstraints(lang, maxNodesPerProcess) {
        if (lang === 'pl') {
            return "\nTWARDE OGRANICZENIA (MUSISZ ICH PRZESTRZEGAĆ):"
                + "\n- NIE MOŻESZ przypinać żadnych dodatkowych sub-procesów (nie używaj pola targetWorkflowId ani targetWorkflowName)."
                + "\n- Limit węzłów na Twoim planie: " + maxNodesPerProcess + ". Twoja odpowiedź NIE MOŻE przekroczyć tej liczby węzłów."
                + '\n- Pamiętaj, by w jsonie używać tablicy stringów dla akcji: np. "enterActionTypes": ["email"], "exitActionTypes": ["webhook"].'
                + '\n- KRAWĘDZIE BAZODANOWE: Gdy tworzysz krawędź DO lub OD węzła DATABASE, MUSISZ ustawić: sourceHandle:"db", targetHandle:"db" oraz data:{dbOperation:"read"} (dopuszczalne wartości: "read", "write", "readwrite"). Zwykłe krawędzie między etapami ZAWSZE muszą mieć sourceHandle:"right", targetHandle:"left" i NIE mogą mieć pola dbOperation.';
        } else {
            return "\nHARD CONSTRAINTS (YOU MUST FOLLOW THEM):"
                + "\n- YOU CANNOT attach any additional sub-workflows (do not use targetWorkflowId or targetWorkflowName)."
                + "\n- Node limit for your plan: " + maxNodesPerProcess + ". Your response MUST NOT exceed this number of nodes."
                + '\n- Remember to use an array of strings for actions in json: e.g. "enterActionTypes": ["email"], "exitActionTypes": ["webhook"].'
                + '\n- DATABASE EDGES: When creating an edge TO or FROM a DATABASE node, you MUST set: sourceHandle:"db", targetHandle:"db" and data:{dbOperation:"read"} (allowed values: "read", "write", "readwrite"). Regular edges between stages MUST use sourceHandle:"right", targetHandle:"left" and MUST NOT have a dbOperation field.';
        }
    }

    try {
        if (!e.auth) {
            return e.json(401, { message: "Not authenticated. Token is missing or invalid." });
        }

        // --- RATE LIMITING ---
        let rateLimits = e.app.store().get("chatRateLimits");
        if (!rateLimits) {
            rateLimits = {};
        }
        
        const now = Date.now();
        for (let key in rateLimits) {
            if (now - rateLimits[key].lastTime > 60000) {
                delete rateLimits[key];
            }
        }
        
        let userCache = rateLimits[e.auth.id];
        if (!userCache || (now - userCache.lastTime > 2000)) {
            rateLimits[e.auth.id] = { count: 1, lastTime: now };
        } else {
            userCache.count++;
            if (userCache.count > 3) {
                e.app.store().set("chatRateLimits", rateLimits);
                return e.json(429, { message: "Zbyt wiele zapytań. Spróbuj ponownie za chwilę. / Too many requests." });
            }
        }
        e.app.store().set("chatRateLimits", rateLimits);


        const rawBody = e.requestInfo().body || {};
        const data = JSON.parse(JSON.stringify(rawBody));
        const workspaceId = data.workspaceId || "";
        const messages = data.messages || []; // Only user and assistant history
        const contextData = data.contextData || {};
        const nodes = contextData.nodes || [];
        const edges = contextData.edges || [];
        const toolNames = contextData.toolNames || [];
        const promoToolNames = contextData.promoToolNames || [];
        const lang = contextData.lang || "pl";
        const latestMessage = contextData.latestMessage || "";

        if (!workspaceId) {
            return e.json(400, { message: "workspaceId is required" });
        }

        // Payload validation
        if (!Array.isArray(messages) || messages.length > 50) {
            return e.json(400, { message: "Invalid messages (max 50)" });
        }
        let validRoles = ["user", "assistant"];
        for (let i = 0; i < messages.length; i++) {
            let m = messages[i];
            if (!m.role || !m.content) {
                return e.json(400, { message: "Invalid message format at index " + i });
            }
            if (typeof m.content !== "string" || m.content.length > 15000) {
                return e.json(400, { message: "Message too long (max 15000 chars)" });
            }
            if (validRoles.indexOf(m.role) === -1) {
                return e.json(400, { message: "Invalid role: " + m.role });
            }
        }

        // Fetch workspace
        let workspace;
        try {
            workspace = e.app.findRecordById("WORKFLOW_workspaces", workspaceId);
        } catch(err) {
            return e.json(404, { message: "Workspace not found" });
        }

        // Access check
        let hasAccess = false;
        if (workspace.get("owner") === e.auth.id) {
            hasAccess = true;
        } else {
            try {
                const members = e.app.findRecordsByFilter(
                    "WORKFLOW_workspace_members",
                    "workspace = {:workspace} && user = {:user} && status = 'active'",
                    "-created", 1, 0,
                    { workspace: workspaceId, user: e.auth.id }
                );
                if (members && members.length > 0) {
                    hasAccess = true;
                }
            } catch(err) {}
        }

        if (!hasAccess) {
            return e.json(403, { message: "You don't have access to this workspace" });
        }

        // Resolve AI key and limits
        const user = e.app.findRecordById("WORKFLOW_users", e.auth.id);
        let effectiveTier = getEffectiveTier(user);
        
        let aiAccess = "none";
        let maxNodesPerProcess = 25;
        let debugErr = "";
        let aiMemoryLength = 10;
        try {
            const configs = e.app.findRecordsByFilter(
                "WORKFLOW_tier_config",
                "tier = {:tier}",
                "", 1, 0,
                { tier: effectiveTier }
            );
            if (configs && configs.length > 0) {
                aiAccess = configs[0].get("ai_access") || "none";
                maxNodesPerProcess = configs[0].get("max_nodes_per_process") || 25;
                let dbMem = Number(configs[0].get("ai_memory_length"));
                if (!isNaN(dbMem) && dbMem > 0) aiMemoryLength = dbMem;
            } else {
                debugErr = "No configs found for tier: " + effectiveTier;
            }
        } catch(err) {
            debugErr = String(err.message || err);
        }

        if (aiAccess === "none") {
            return e.json(403, { message: "AI Assistant is not available on your current plan. Please upgrade to use AI features." });
        }

        let encryptedKey = user.get("ai_api_key") || "";
        if (!encryptedKey) {
            return e.json(400, { message: "AI API key is not configured in your profile." });
        }

        let apiKey = "";
        try {
            apiKey = decryptApiKey(encryptedKey);
        } catch(err) {
            return e.json(400, { message: err.message || "Failed to decrypt API key. Please update your key." });
        }

        let provider = user.get("ai_provider") || "openai";
        let model = user.get("ai_model") || "gpt-4o-mini";
        const temperature = user.get("ai_temperature") ?? 0.7;

        let customMem = Number(user.get("ai_custom_memory"));
        if (!isNaN(customMem) && customMem > 0 && customMem < aiMemoryLength) {
            aiMemoryLength = customMem;
        }
        let trimmedMessages = messages;
        if (trimmedMessages.length > aiMemoryLength) {
            trimmedMessages = trimmedMessages.slice(-aiMemoryLength);
        }

        // --- SYSTEM PROMPT GENERATION (Moved from client) ---
        let startNode = null;
        let stopNodes = [];
        let nodeDescsArr = [];
        for (let i = 0; i < nodes.length; i++) {
            let n = nodes[i];
            if (n.type === 'startstop') {
                if (n.data && n.data.type === 'start') startNode = n;
                else if (n.data && n.data.type === 'stop') stopNodes.push(n);
            }
            if (n.type !== 'note') {
                let label = (n.data && n.data.label) ? n.data.label : n.id;
                let nType = n.type === 'startstop' ? (n.data.type === 'start' ? 'START' : 'STOP') 
                  : n.type === 'database' ? 'DATABASE' : n.type === 'subworkflow' ? 'SUBPROCESS' : 'STAGE';
                let desc = (n.data && n.data.description) ? " — " + n.data.description : "";
                let sla = (n.data && n.data.maxDuration) ? " [SLA: " + n.data.maxDuration + "]" : "";
                let cost = (n.data && n.data.cost) ? " [Cost: " + n.data.cost + " PLN]" : "";
                let checklistStr = "";
                if (n.data && Array.isArray(n.data.checklist) && n.data.checklist.length > 0) {
                    checklistStr = " [Checklist: " + n.data.checklist.map(c => c.label).join('; ') + "]";
                }
                nodeDescsArr.push("  • [id=\"" + n.id + "\"] " + nType + ": \"" + label + "\"" + desc + sla + cost + checklistStr);
            }
        }
        let nodeDescs = nodeDescsArr.join('\n');

        let flowArr = [];
        for (let i = 0; i < edges.length; i++) {
            let eObj = edges[i];
            let src = nodes.find(n => n.id === eObj.source);
            let tgt = nodes.find(n => n.id === eObj.target);
            let srcLabel = (src && src.data && src.data.label) ? src.data.label : eObj.source;
            let tgtLabel = (tgt && tgt.data && tgt.data.label) ? tgt.data.label : eObj.target;
            let dbOp = (eObj.data && eObj.data.dbOperation) ? " [DB:" + eObj.data.dbOperation + "]" : "";
            flowArr.push("  " + srcLabel + " -> " + tgtLabel + dbOp);
        }
        let flow = flowArr.join('\n');

        let startInfo = startNode ? "EXISTING START NODE: id=\"" + startNode.id + "\", position: x=" + Math.round((startNode.position && startNode.position.x) || 0) + ", y=" + Math.round((startNode.position && startNode.position.y) || 0) : "NO START NODE";
        let stopInfo = stopNodes.length > 0 ? "EXISTING STOP NODES: " + stopNodes.map(s => "id=\"" + s.id + "\" (x=" + Math.round((s.position && s.position.x) || 0) + ", y=" + Math.round((s.position && s.position.y) || 0) + ")").join(', ') : "NO STOP NODE";

        let langInstruction = lang === 'pl' ? "WAŻNE: Zawsze odpowiadaj po polsku." : "IMPORTANT: You must always respond in English, regardless of the prompt language. Do not use Polish.";
        
        let toolsSection = buildToolsSection(lang, toolNames, promoToolNames);

        // Fetch prompt template
        let template = "";
        try {
            let promptRec = e.app.findFirstRecordByData("WORKFLOW_prompts", "key", "assistant_system");
            if (promptRec && promptRec.get("active")) {
                template = promptRec.get("content");
            }
        } catch(err) {}

        if (!template) {
            template = lang === 'pl' ? "Jesteś Gryf — asystent AI platformy Gryf.ai. Pomagasz w procesach biznesowych. {{LANG_INSTRUCTION}} {{START_INFO}} {{STOP_INFO}} {{TOOLS_SECTION}} Workflow: {{NODE_DESCRIPTIONS}} {{FLOW}}" : "You are Gryf — the AI assistant of Gryf.ai platform. You help with business processes. {{LANG_INSTRUCTION}} {{START_INFO}} {{STOP_INFO}} {{TOOLS_SECTION}} Workflow: {{NODE_DESCRIPTIONS}} {{FLOW}}";
        } else if (lang === 'en') {
            template = template.replace(/Odpowiadaj po polsku/gi, 'Respond in English');
        }

        let systemContent = template
            .replace(/{{LANG}}/g, () => lang)
            .replace(/{{LANG_INSTRUCTION}}/g, () => langInstruction)
            .replace(/{{START_INFO}}/g, () => startInfo)
            .replace(/{{STOP_INFO}}/g, () => stopInfo)
            .replace(/{{START_ID}}/g, () => startNode ? startNode.id : 'START_NODE_ID')
            .replace(/{{STOP_ID}}/g, () => stopNodes.length > 0 ? stopNodes[0].id : 'STOP_NODE_ID')
            .replace(/{{TOOL_COUNT}}/g, () => String(toolNames.length))
            .replace(/{{TOOL_NAMES}}/g, () => toolNames.join(', '))
            .replace(/{{TOOLS_SECTION}}/g, () => toolsSection)
            .replace(/{{NODE_COUNT}}/g, () => String(nodes.length))
            .replace(/{{NODE_DESCRIPTIONS}}/g, () => nodeDescs || "  (empty workflow)")
            .replace(/{{FLOW}}/g, () => flow || "  (no connections)");

        systemContent += buildConstraints(lang, maxNodesPerProcess);

        if (template.indexOf("{{LANG_INSTRUCTION}}") === -1) {
            systemContent += "\n\n" + langInstruction;
        }

        // RAG (Fuzzy Matching on FAQ)
        if (latestMessage) {
            let queryWords = latestMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            if (queryWords.length > 0) {
                let faqs = [];
                try {
                    faqs = e.app.findRecordsByFilter("WORKFLOW_faq", "1=1", "", 1000, 0) || [];
                } catch(err) {
                    faqs = [];
                }

                let scoredFaqs = [];
                let faqsLen = faqs ? faqs.length : 0;
                for (let i = 0; i < faqsLen; i++) {
                    let faq = faqs[i];
                    let score = 0;
                    let q = (lang === 'pl' ? faq.get("question_pl") : faq.get("question_en")) || "";
                    let a = (lang === 'pl' ? faq.get("answer_pl") : faq.get("answer_en")) || "";
                    let qText = q.toLowerCase();
                    let aText = a.toLowerCase();
                    let textToSearch = qText + " " + aText;

                    for (let w = 0; w < queryWords.length; w++) {
                        let word = queryWords[w];
                        if (isFuzzyMatch(word, textToSearch)) {
                            if (isFuzzyMatch(word, qText)) score += 2;
                            else score += 1;
                        }
                    }
                    if (score > 0) {
                        scoredFaqs.push({ faq: faq, score: score, q: q, a: a });
                    }
                }
                
                if (scoredFaqs.length > 0) {
                    scoredFaqs.sort((a, b) => b.score - a.score);
                    let topFaqs = scoredFaqs.slice(0, 3);
                    let faqSection = lang === 'pl' ? "\n\nKONTEKST Z BAZY WIEDZY (FAQ - użyj tych informacji jeśli pasują do pytania użytkownika):\n" : "\n\nKNOWLEDGE BASE CONTEXT (FAQ - use this information if relevant to the user's question):\n";
                    for (let i = 0; i < topFaqs.length; i++) {
                        let tf = topFaqs[i];
                        faqSection += (lang === 'pl' ? "Pytanie: " : "Question: ") + tf.q + "\n" + (lang === 'pl' ? "Odpowiedź: " : "Answer: ") + tf.a + "\n\n";
                    }
                    systemContent += faqSection;
                }
            }
        }

        // Inject System Prompt at the beginning of messages
        let finalMessages = [{ role: "system", content: systemContent }];
        for (let i = 0; i < trimmedMessages.length; i++) {
            finalMessages.push({ role: trimmedMessages[i].role, content: trimmedMessages[i].content });
        }

        // Call AI API
        let responseText = "";
        try {
            let endpoint = "https://api.openai.com/v1/chat/completions";
            const headers = {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            };

            if (provider === "openrouter") {
                endpoint = "https://openrouter.ai/api/v1/chat/completions";
                headers["HTTP-Referer"] = "https://gryf.ai";
                headers["X-Title"] = "Gryf.ai Workflow Assistant";
            }

            const payload = {
                model: model,
                messages: finalMessages,
                temperature: temperature,
                max_tokens: 4096
            };

            const res = $http.send({
                url: endpoint,
                method: "POST",
                body: JSON.stringify(payload),
                headers: headers
            });

            if (res.statusCode >= 400) {
                console.log("AI API Error (" + res.statusCode + "): " + res.raw);
                throw new Error("Wystąpił błąd po stronie dostawcy AI (np. nieprawidłowy klucz lub brak środków). / AI provider error (e.g. invalid key or insufficient funds).");
            }
            const d = res.json;
            responseText = (d.choices && d.choices[0] && d.choices[0].message) ? d.choices[0].message.content : "No response.";
        } catch (err) {
            return e.json(400, { message: "AI Provider error: " + String(err.message || err) });
        }

        return e.json(200, { response: responseText });
    } catch (err) {
        return e.json(400, { message: "DEBUG_ERROR_CHAT: " + String(err.message || err) });
    }
});

// =====================================================
// ROUTE: POST /api/ai/check-key
// =====================================================
routerAdd("POST", "/api/ai/check-key", (e) => {
    if (!e.auth) {
        return e.json(401, { message: "Not authenticated" });
    }

    const user = e.app.findRecordById("WORKFLOW_users", e.auth.id);
    const hasKey = !!(user.get("ai_api_key"));

    return e.json(200, { hasKey: hasKey });
});

// =====================================================
// ROUTE: POST /api/ai/save-config
// =====================================================
routerAdd("POST", "/api/ai/save-config", (e) => {
    // INLINED HELPERS FOR GOJA
    function getEncryptionKey() {
        const key = $os.getenv("PB_ENCRYPTION_KEY");
        if (!key) throw new Error("PB_ENCRYPTION_KEY environment variable is not set.");
        return $security.sha256(key).substring(0, 32);
    }
    function encryptApiKey(rawKey) {
        if (!rawKey) return "";
        return $security.encrypt(rawKey, getEncryptionKey());
    }

    try {
        if (!e.auth) {
            return e.json(401, { message: "Not authenticated" });
        }

        const data = e.requestInfo().body || {};
        const user = e.app.findRecordById("WORKFLOW_users", e.auth.id);

        // Provider validation
        const ALLOWED_PROVIDERS = ["openai", "openrouter"];
        if (data.ai_provider !== undefined) {
            if (ALLOWED_PROVIDERS.indexOf(data.ai_provider) === -1) {
                return e.json(400, { message: "Invalid AI provider" });
            }
            user.set("ai_provider", data.ai_provider);
        }

        // Model validation
        if (data.ai_model !== undefined) {
            if (typeof data.ai_model !== 'string' || data.ai_model.length > 100 || /[^a-zA-Z0-9-./:]/.test(data.ai_model)) {
                return e.json(400, { message: "Invalid AI model format" });
            }
            user.set("ai_model", data.ai_model);
        }

        // Temperature validation
        if (data.ai_temperature !== undefined) {
            let temp = parseFloat(data.ai_temperature);
            if (isNaN(temp) || temp < 0 || temp > 2) {
                return e.json(400, { message: "Invalid temperature (must be 0-2)" });
            }
            user.set("ai_temperature", temp);
        }

        // Custom Memory validation
        if (data.ai_custom_memory !== undefined) {
            if (data.ai_custom_memory === null) {
                user.set("ai_custom_memory", null);
            } else {
                let mem = parseInt(data.ai_custom_memory, 10);
                if (isNaN(mem) || mem < 1 || mem > 100) {
                    return e.json(400, { message: "Invalid memory length (must be 1-100)" });
                }
                user.set("ai_custom_memory", mem);
            }
        }

        // API key encryption
        if (data.ai_api_secret !== undefined) {
            let rawKey = String(data.ai_api_secret || "").trim();

            if (rawKey.length > 255) {
                return e.json(400, { message: "Klucz API jest zbyt długi (max 255 znaków). / API key is too long (max 255 characters)." });
            }

            if (rawKey === "") {
                user.set("ai_api_key", "");
            } else {
                let encrypted = encryptApiKey(rawKey);
                user.set("ai_api_key", encrypted);
            }
        }

        e.app.save(user);

        return e.json(200, { success: true });
    } catch(err) {
        // Return EXACT error message and print to server log
        console.error("SAVE CONFIG ERROR:", err.message || err, err.stack || "");
        return e.json(400, { message: "DEBUG_ERROR: " + String(err.message || err), stack: err.stack });
    }
});

// =====================================================
// ROUTE: POST /api/shared/verify
// =====================================================
routerAdd("POST", "/api/shared/verify", (e) => {
    const data = e.requestInfo().body || {};
    const processId = data.processId || "";
    const password = data.password || "";

    if (!processId) {
        return e.json(400, { message: "processId is required" });
    }

    let process;
    try {
        process = e.app.findRecordById("WORKFLOW_processes", processId);
    } catch(err) {
        return e.json(404, { message: "Process not found" });
    }

    if (!process.get("isPublic")) {
        return e.json(403, { message: "This process is not publicly shared" });
    }

    const storedPassword = process.get("publicPassword") || "";

    if (storedPassword) {
        const hashedInput = $security.sha256(password + "gryf-salt-" + process.id);

        let isValid = false;
        if (storedPassword === hashedInput) {
            isValid = true;
        }

        if (!isValid) {
            return e.json(401, { message: "Invalid password" });
        }
    }

    // getString + JSON.parse ensures native JS arrays are returned, not Go proxy objects
    var nodesStr = process.getString("nodes");
    var edgesStr = process.getString("edges");
    var nodesParsed = [];
    var edgesParsed = [];
    try { nodesParsed = nodesStr ? JSON.parse(nodesStr) : []; } catch(pe) {}
    try { edgesParsed = edgesStr ? JSON.parse(edgesStr) : []; } catch(pe) {}

    return e.json(200, {
        id: process.id,
        name: process.get("name"),
        nodes: nodesParsed,
        edges: edgesParsed,
        isPublic: true,
    });
});

// =====================================================
// HOOK: Auto-link pending email invitations on new user
// =====================================================
onRecordCreateRequest((e) => {
    const newUser = e.record;
    
    // Normalize email to lowercase to prevent case-sensitive duplicates
    let rawEmail = newUser.getString("email");
    if (rawEmail) {
        newUser.set("email", rawEmail.toLowerCase());
    }

    // Set default name if missing
    let name = newUser.get("name") || "";
    if (name.trim() === "") {
        newUser.set("name", "user");
    }

    // Set default tier to FREE if not already set
    if (!newUser.get("tier")) {
        newUser.set("tier", "FREE");
    }

    e.next();

    const email = newUser.getString("email");
    if (!email) return;

    const emailLower = email.toLowerCase();

    try {
        const pending = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "invited_email = {:email} && status = 'pending_registration'",
            "-created", 100, 0,
            { email: emailLower }
        );

        if (pending && pending.length > 0) {
            for (let i = 0; i < pending.length; i++) {
                pending[i].set("user", newUser.id);
                pending[i].set("status", "pending");
                pending[i].set("invited_email", "");
                e.app.save(pending[i]);
            }
        }
    } catch (err) {
        console.log("Auto-link invitations error: " + String(err.message || err));
    }
}, "WORKFLOW_users");

// =====================================================
// HOOK: Auto-link pending email invitations on auth
// =====================================================
onRecordAuthRequest((e) => {
    const user = e.record;
    if (!user || user.collection().name !== "WORKFLOW_users") return e.next();
    
    const email = user.getString("email");
    if (!email) return e.next();
    
    const emailLower = email.toLowerCase();
    
    try {
        const pending = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "invited_email = {:email} && status = 'pending_registration'",
            "", 100, 0,
            { email: emailLower }
        );
        if (pending && pending.length > 0) {
            for (let i = 0; i < pending.length; i++) {
                pending[i].set("user", user.id);
                pending[i].set("status", "pending");
                pending[i].set("invited_email", "");
                e.app.save(pending[i]);
            }
        }
    } catch (err) {
        console.log("Auto-link on auth error: " + err);
    }
    return e.next();
}, "WORKFLOW_users");
// =====================================================
// HOOK: Clean up required relations after User delete
// =====================================================
onRecordDeleteRequest((e) => {
    const userId = e.record.id;
    const db = e.app.db();

    try {
        // 1. Delete all comments authored by the user
        db.newQuery("DELETE FROM WORKFLOW_comments WHERE author = {:userId}").bind({ userId: userId }).execute();

        // 2. Delete all versions created by the user
        db.newQuery("DELETE FROM WORKFLOW_versions WHERE created_by = {:userId}").bind({ userId: userId }).execute();

        // 3. Clear locked_by, locked_at and lastEditedBy references
        db.newQuery("UPDATE WORKFLOW_processes SET locked_by = '', locked_at = '' WHERE locked_by = {:userId}").bind({ userId: userId }).execute();
        db.newQuery("UPDATE WORKFLOW_processes SET lastEditedBy = '' WHERE lastEditedBy = {:userId}").bind({ userId: userId }).execute();

        // 4. Transfer ownership of orphaned processes in shared workspaces to the workspace owner
        db.newQuery(`
            UPDATE WORKFLOW_processes 
            SET owner = (SELECT owner FROM WORKFLOW_workspaces WHERE id = WORKFLOW_processes.workspace)
            WHERE owner = {:userId}
        `).bind({ userId: userId }).execute();

        // 5. Delete user's workspace memberships and pending invitations
        db.newQuery("DELETE FROM WORKFLOW_workspace_members WHERE user = {:userId} OR invited_by = {:userId}").bind({ userId: userId }).execute();

        // 6. Delete notifications for this user
        db.newQuery("DELETE FROM WORKFLOW_notifications WHERE user = {:userId}").bind({ userId: userId }).execute();

        // 7. Delete workspaces owned by the user and all their related records
        db.newQuery("DELETE FROM WORKFLOW_versions WHERE process IN (SELECT id FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId}))").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_comments WHERE process IN (SELECT id FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId}))").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId})").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_process_map_layouts WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId})").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_process_groups WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId})").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_groups WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId})").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_workspace_members WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId})").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_workspaces WHERE owner = {:userId}").bind({ userId: userId }).execute();

    } catch (err) {
        console.error("Cleanup after user delete failed:", err);
    }

    e.next();
}, "WORKFLOW_users");

// =====================================================
// HOOK: Send invitation email on workspace member create
// =====================================================
onRecordCreateRequest((e) => {
    const record = e.record;
    let status = record.get("status");

    // Auto-link user if they already exist in the database (bypassing client-side privacy restrictions)
    if (status === "pending_registration") {
        let invitedEmail = record.getString("invited_email");
        if (invitedEmail) {
            invitedEmail = invitedEmail.toLowerCase();
            record.set("invited_email", invitedEmail);
            try {
                let existingUser = e.app.findFirstRecordByFilter("WORKFLOW_users", "email = {:email}", { email: invitedEmail });
                if (existingUser) {
                    record.set("status", "pending");
                    record.set("user", existingUser.id);
                    // Zostawiamy invited_email jako fallback dla frontendu (gdy user ukrywa email w opcjach prywatności)
                    status = "pending";
                }
            } catch (err) {
                // User not found, keep as pending_registration
            }
        }
    }

    // Dodatkowe zabezpieczenie backendowe przed duplikatami (Race conditions / podwójne kliknięcia)
    let wsId = record.get("workspace");
    let checkUserId = record.get("user");
    let checkEmail = record.getString("invited_email");
    
    if (checkEmail) {
        checkEmail = checkEmail.toLowerCase();
        record.set("invited_email", checkEmail);
    }
    
    if (wsId) {
        let hasDuplicate = false;
        try {
            if (checkUserId) {
                let dups = e.app.findRecordsByFilter("WORKFLOW_workspace_members", "workspace = {:ws} && user = {:u}", "-created", 1, 0, { ws: wsId, u: checkUserId });
                if (dups && dups.length > 0) hasDuplicate = true;
            } else if (checkEmail) {
                let dups = e.app.findRecordsByFilter("WORKFLOW_workspace_members", "workspace = {:ws} && invited_email = {:e}", "-created", 1, 0, { ws: wsId, e: checkEmail });
                if (dups && dups.length > 0) hasDuplicate = true;
            }
        } catch(err) {}
        
        if (hasDuplicate) {
            throw new BadRequestError("Ten użytkownik został już zaproszony do tego workspace. / This user has already been invited to this workspace.");
        }
    }

    e.next();

    if (status !== "pending" && status !== "pending_registration") return;

    try {
        let recipientEmail = "";
        if (status === "pending_registration") {
            recipientEmail = record.get("invited_email") || "";
        } else {
            let userId = record.get("user");
            if (userId) {
                let invitedUser = e.app.findRecordById("WORKFLOW_users", userId);
                recipientEmail = invitedUser.get("email") || "";
            }
        }

        if (!recipientEmail) return;

        let wsName = "Workspace";
        let wsId = record.get("workspace");
        if (wsId) {
            try {
                let ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
                wsName = ws.get("name") || "Workspace";
            } catch(ignored) {}
        }

        let role = record.get("role") || "editor";
        let isNewUser = (status === "pending_registration");

        let inviterName = "Użytkownik Gryf.ai";
        let inviterEmail = "";
        if (e.auth) {
            inviterName = e.auth.get("name") || e.auth.get("email") || "Użytkownik Gryf.ai";
            inviterEmail = e.auth.get("email") || "";
        }

        let subject = "Zaproszenie / Invitation — Workspace \"" + wsName + "\"";

        let ctaText = isNewUser
            ? "Zarejestruj się / Sign up"
            : "Zaloguj się / Log in";

        let subtitleText = isNewUser
            ? "Zostałeś zaproszony do współpracy. Utwórz konto na Gryf.ai, aby dołączyć do zespołu.<br/><span style='color:#9ca3af;font-size:13px;display:block;margin-top:6px;'>You have been invited to collaborate. Create an account on Gryf.ai to join the team.</span>"
            : "Masz nowe zaproszenie do workspace. Zaloguj się, aby je zaakceptować.<br/><span style='color:#9ca3af;font-size:13px;display:block;margin-top:6px;'>You have a new workspace invitation. Log in to accept it.</span>";

        let roleLabel = role === "admin" ? "Admin"
            : role === "editor" ? "Edytor / Editor"
            : role === "viewer" ? "Obserwator / Viewer"
            : role;

        function getInvitationEmailHtml(wsName, subtitleText, roleLabel, ctaText, inviterName, inviterEmail) {
            var escapeHtml = function(str) {
                if (!str) return '';
                return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
            };
            return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>'
                + '<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,system-ui,-apple-system,sans-serif;">'
                + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">'
                + '<tr><td align="center">'
                + '<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">'
                + '<tr><td style="padding:36px 36px 20px;text-align:center;border-bottom:1px solid #f0f0f0;">'
                + '<img src="https://gryf.ai/gryf-ai-logo.svg" alt="Gryf.ai" width="44" height="40" style="display:block;margin:0 auto 16px;" />'
                + '<h1 style="margin:0;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">Zaproszenie do Workspace</h1>'
                + '<p style="margin:2px 0 0;font-size:14px;color:#9ca3af;font-weight:500;">Workspace Invitation</p>'
                + '<p style="margin:16px 0 0;font-size:14px;color:#6b7280;line-height:1.5;">' + subtitleText + '</p>'
                + '</td></tr>'
                + '<tr><td style="padding:28px 36px;">'
                + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #f0ede6;border-radius:12px;overflow:hidden;">'
                + '<tr><td style="padding:18px 20px;border-bottom:1px solid #f0ede6;">'
                + '<span style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;font-weight:600;">Workspace</span><br/>'
                + '<span style="font-size:16px;font-weight:700;color:#1a1a1a;line-height:1.6;">' + escapeHtml(wsName) + '</span>'
                + '</td></tr>'
                + '<tr><td style="padding:18px 20px;border-bottom:1px solid #f0ede6;">'
                + '<span style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;font-weight:600;">Zaprasza / Invited by</span><br/>'
                + '<span style="font-size:16px;font-weight:700;color:#1a1a1a;line-height:1.6;">' + escapeHtml(inviterName) + '</span>'
                + (inviterEmail && inviterEmail !== inviterName ? '<br/><span style="font-size:13px;color:#6b7280;">' + escapeHtml(inviterEmail) + '</span>' : '')
                + '</td></tr>'
                + '<tr><td style="padding:18px 20px;">'
                + '<span style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;font-weight:600;">Twoja rola / Your role</span><br/>'
                + '<span style="font-size:16px;font-weight:700;color:#bc9b59;line-height:1.6;">' + escapeHtml(roleLabel) + '</span>'
                + '</td></tr>'
                + '</table>'
                + '</td></tr>'
                + '<tr><td style="padding:4px 36px 36px;text-align:center;">'
                + '<a href="https://gryf.ai" style="display:inline-block;padding:14px 44px;background:#bc9b59;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">'
                + escapeHtml(ctaText) + '</a>'
                + '</td></tr>'
                + '<tr><td style="padding:20px 36px;border-top:1px solid #f0f0f0;text-align:center;background:#fafaf9;">'
                + '<p style="margin:0 0 4px;font-size:12px;color:#9ca3af;font-weight:500;">Gryf.ai — Projektowanie Procesów Biznesowych / Business Process Design</p>'
                + '<p style="margin:0;font-size:11px;color:#c4c4c4;">Ten email został wysłany automatycznie. Nie musisz na niego odpowiadać.<br/>This email was sent automatically. You do not need to reply.</p>'
                + '</td></tr>'
                + '</table>'
                + '</td></tr></table>'
                + '</body></html>';
        }

        let html = getInvitationEmailHtml(wsName, subtitleText, roleLabel, ctaText, inviterName, inviterEmail);

        let message = new MailerMessage({
            from: {
                address: e.app.settings().meta.senderAddress,
                name: e.app.settings().meta.senderName || "Gryf.ai"
            },
            to: [{ address: recipientEmail }],
            subject: subject,
            html: html,
        });

        try {
            e.app.newMailClient().send(message);
        } catch (mailSendErr) {
            console.log("Error sending invitation email: " + String(mailSendErr.message || mailSendErr));
        }

        // Powiadomienie w aplikacji (tylko jeśli użytkownik istnieje w systemie)
        if (status === "pending" && record.get("user")) {
            try {
                const notifCollection = e.app.findCollectionByNameOrId("WORKFLOW_notifications");
                const notifRecord = new Record(notifCollection);
                notifRecord.set("user", record.get("user"));
                notifRecord.set("title", "Nowe zaproszenie / New invitation");
                notifRecord.set("message", `Masz nowe zaproszenie do obszaru roboczego "${wsName}" od ${inviterName}. Przejdź do zakładki Zaproszenia. / You have a new invitation to workspace "${wsName}" from ${inviterName}. Go to Invitations tab.`);
                notifRecord.set("type", "info");
                notifRecord.set("isRead", false);
                e.app.save(notifRecord);
            } catch(notifErr) {
                console.log("Error creating invitation in-app notif: " + String(notifErr.message || notifErr));
            }
        }

    } catch (err) {
        console.log("Invitation notification error: " + String(err.message || err));
    }
}, "WORKFLOW_workspace_members");

// =====================================================
// HOOK: Send notification email on new contact message
// =====================================================
onRecordCreateRequest((e) => {
    e.next();

    var escapeHtml = function(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };

    try {
        const record = e.record;
        const senderEmail = record.get("email") || "Brak emaila / No email";
        const messageBody = record.get("message") || "";

        let subject = "Nowa wiadomość z formularza kontaktowego Gryf.ai";

        let html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
        + '<body style="font-family:sans-serif; background:#f4f4f5; padding:40px;">'
        + '<div style="background:#fff; padding:20px; border-radius:10px; max-width:600px; margin:0 auto;">'
        + '<h2 style="color:#1a1a1a;">Nowa wiadomość ze strony</h2>'
        + '<p style="color:#666;">Otrzymałeś nową wiadomość z formularza na Gryf.ai:</p>'
        + '<hr style="border:0; border-top:1px solid #eee; margin:20px 0;" />'
        + '<p><strong>Od:</strong> ' + escapeHtml(senderEmail) + '</p>'
        + '<p><strong>Treść:</strong></p>'
        + '<div style="background:#f9f9f9; padding:15px; border-radius:5px; color:#333; white-space:pre-wrap;">' + escapeHtml(messageBody) + '</div>'
        + '</div></body></html>';

        let message = new MailerMessage({
            from: {
                address: e.app.settings().meta.senderAddress,
                name: e.app.settings().meta.senderName || "Gryf.ai System"
            },
            to: [{ address: "kontakt@gryf.ai" }],
            subject: subject,
            html: html,
        });

        try {
            e.app.newMailClient().send(message);
            console.log("Wiadomość do administracji wysłana pomyślnie na kontakt@gryf.ai");
        } catch (mailSendErr) {
            console.log("Error sending contact email to admin: " + String(mailSendErr.message || mailSendErr));
        }

        // Potwierdzenie do nadawcy
        if (senderEmail !== "Brak emaila / No email" && senderEmail.indexOf("@") !== -1) {
            let userSubject = "Potwierdzenie otrzymania wiadomości / Message received - Gryf.ai";
            let userHtml = "<div style=\"font-family:sans-serif; padding:20px;\">" +
                "<h2>Dziękujemy za kontakt! / Thank you for contacting us!</h2>" +
                "<p>Otrzymaliśmy Twoją wiadomość i odpowiemy tak szybko, jak to możliwe.<br/><span style=\"color:#666;font-size:14px;\">We have received your message and will reply as soon as possible.</span></p>" +
                "<hr style=\"border:0; border-top:1px solid #eee; margin:20px 0;\" />" +
                "<p><strong>Twoja wiadomość / Your message:</strong></p>" +
                "<div style=\"background:#f9f9f9; padding:15px; border-radius:5px; white-space:pre-wrap;\">" + escapeHtml(messageBody) + "</div>" +
                "</div>";

            let userConfirmation = new MailerMessage({
                from: {
                    address: e.app.settings().meta.senderAddress,
                    name: "Gryf.ai"
                },
                to: [{ address: senderEmail }],
                subject: userSubject,
                html: userHtml,
            });
            try {
                e.app.newMailClient().send(userConfirmation);
                console.log("Potwierdzenie do użytkownika wysłane pomyślnie na " + senderEmail);
            } catch (mailSendErr) {
                console.log("Error sending confirmation email to user: " + String(mailSendErr.message || mailSendErr));
            }
        }

    } catch (err) {
        console.log("Contact form email error: " + String(err.message || err));
    }
}, "WORKFLOW_contact_messages");

// =====================================================
// HOOK: Hash publicPassword on Process Save
// =====================================================
onRecordCreateRequest(function(e) {
    const record = e.record;
    let pwd = record.get("publicPassword") || "";
    // If there is a password and it's not already a 64-char hex string (SHA256 hash)
    if (pwd && !/^[a-f0-9]{64}$/i.test(pwd)) {
        record.set("publicPassword", $security.sha256(pwd + "gryf-salt-" + record.id));
    }
    return e.next();
}, "WORKFLOW_processes");

onRecordUpdateRequest(function(e) {
    const record = e.record;
    let pwd = record.get("publicPassword") || "";
    if (pwd && !/^[a-f0-9]{64}$/i.test(pwd)) {
        record.set("publicPassword", $security.sha256(pwd + "gryf-salt-" + record.id));
    }
    return e.next();
}, "WORKFLOW_processes");

// =====================================================
// HOOK: Secure Workspace Members — Create
// =====================================================
onRecordCreateRequest(function(e) {
    const record = e.record;
    const authRecord = e.auth;

    if (!authRecord) return e.next();

    // Ensure invited_by is set to the current user (overrides any API rule stripping)
    if (!record.get("invited_by")) {
        record.set("invited_by", authRecord.id);
    }

    const wsId = record.get("workspace");
    if (!wsId) throw new BadRequestError("Workspace ID is required");

    let ws;
    try {
        ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
    } catch(err) {
        throw new BadRequestError("Workspace not found");
    }
    let hasPermission = false;
    
    if (ws.get("owner") === authRecord.id) {
        hasPermission = true;
    }

    if (record.get("user") === ws.get("owner")) {
        throw new BadRequestError("Właściciel jest już członkiem tego obszaru roboczego. / The owner is already a member of this workspace.");
    }
    try {
        const admins = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "workspace = {:ws} && user = {:user} && role = 'admin' && status = 'active'",
            "-created", 1, 0,
            { ws: wsId, user: authRecord.id }
        );
        if (admins && admins.length > 0) hasPermission = true;
    } catch(err) {}

    if (!hasPermission) {
        throw new BadRequestError("You don't have permission to add workspace members");
    }

    // --- ENFORCE MEMBER TIER LIMITS ---
    try {
        const ownerId = ws.get("owner");
        const ownerRec = e.app.findRecordById("WORKFLOW_users", ownerId);
        let userTier = (ownerRec.get("tier") || "FREE").toUpperCase();
        let tierExpiry = ownerRec.get("tier_expires_at");
        if (userTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) {
            userTier = "FREE";
        }
        
        let maxMembers = 2; // FREE default
        const configs = e.app.findRecordsByFilter("WORKFLOW_tier_config", "tier = {:tier}", "", 1, 0, { tier: userTier });
        if (configs && configs.length > 0) {
            maxMembers = Number(configs[0].get("max_members_per_workspace")) || 2;
        }
        
        if (maxMembers < 999999) {
            const currentMembers = e.app.findRecordsByFilter("WORKFLOW_workspace_members", "workspace = {:ws} && status = 'active'", "", 5000, 0, { ws: wsId });
            const currentCount = currentMembers ? currentMembers.length : 0;
            if (currentCount >= maxMembers) {
                throw new Error("Osiągnięto limit aktywnych członków (" + maxMembers + ") dla planu " + userTier + ". / Active member limit reached (" + maxMembers + ") for " + userTier + " plan.");
            }
        }
    } catch(err) {
        if (err.message && err.message.includes("limit")) throw err;
        console.log("Error checking member limit: " + err);
    }
    return e.next();
}, "WORKFLOW_workspace_members");

// =====================================================
// HOOK: Secure Workspace Members — Update
// =====================================================
onRecordUpdateRequest(function(e) {
    const record = e.record;
    const authRecord = e.auth;

    if (!authRecord) return e.next();

    const wsId = record.get("workspace");
    if (!wsId) throw new BadRequestError("Workspace ID is required");

    let ws;
    try {
        ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
    } catch(err) {
        throw new BadRequestError("Workspace not found");
    }

    // --- ENFORCE MEMBER TIER LIMITS ON ACTIVATION ---
    let originalStatus = record.get("status");
    try {
        const orig = e.app.findRecordById(record.collection().name, record.id);
        if (orig) originalStatus = orig.get("status");
    } catch(err) {}
    
    if (originalStatus !== "active" && record.get("status") === "active") {
        try {
            const ownerId = ws.get("owner");
            const ownerRec = e.app.findRecordById("WORKFLOW_users", ownerId);
            let userTier = (ownerRec.get("tier") || "FREE").toUpperCase();
            let tierExpiry = ownerRec.get("tier_expires_at");
            if (userTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) {
                userTier = "FREE";
            }
            
            let maxMembers = 2; // FREE default
            const configs = e.app.findRecordsByFilter("WORKFLOW_tier_config", "tier = {:tier}", "", 1, 0, { tier: userTier });
            if (configs && configs.length > 0) {
                maxMembers = Number(configs[0].get("max_members_per_workspace")) || 2;
            }
            
            if (maxMembers < 999999) {
                const currentMembers = e.app.findRecordsByFilter("WORKFLOW_workspace_members", "workspace = {:ws} && status = 'active'", "", 5000, 0, { ws: wsId });
                const currentCount = currentMembers ? currentMembers.length : 0;
                if (currentCount >= maxMembers) {
                    throw new BadRequestError("Osiągnięto limit aktywnych członków (" + maxMembers + ") dla planu " + userTier + ". / Active member limit reached (" + maxMembers + ") for " + userTier + " plan.");
                }
            }
        } catch(err) {
            if (err.message && err.message.includes("limit")) throw err;
            console.log("Error checking member limit on update: " + err);
        }
    }

    if (ws.get("owner") === authRecord.id) return e.next();

    try {
        const admins = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "workspace = {:ws} && user = {:user} && role = 'admin' && status = 'active'",
            "-created", 1, 0,
            { ws: wsId, user: authRecord.id }
        );
        if (admins && admins.length > 0) return e.next();
    } catch(err) {}

    // Allow users to update their own pending invitation (if they were explicitly invited)
    if (record.id && record.get("user") === authRecord.id) {
        try {
            const original = e.app.findRecordById("WORKFLOW_workspace_members", record.id);
            if (original.get("user") !== authRecord.id) {
                throw new BadRequestError("Nie możesz edytować cudzego zaproszenia. / You cannot edit someone else's invitation.");
            }
            if (original.get("user") !== record.get("user")) {
                throw new BadRequestError("Nie możesz zmienić użytkownika zaproszenia. / You cannot change the user of the invitation.");
            }
            if (String(original.get("role")) !== String(record.get("role"))) {
                throw new BadRequestError("You cannot change your role.");
            }
            if (original.get("workspace") !== record.get("workspace")) {
                throw new BadRequestError("You cannot change the workspace ID.");
            }
            if (!original.get("invited_by")) {
                throw new BadRequestError("Nie możesz samodzielnie zaakceptować prośby o dołączenie. Wymagana jest akceptacja admina. / You cannot accept a join request yourself. An admin must approve it.");
            }
        } catch(err) {
            throw new BadRequestError(err.message || "Błąd podczas weryfikacji uprawnień użytkownika / Error verifying user permissions");
        }
        return e.next();
    }

    throw new BadRequestError("You don't have permission to modify workspace members");
}, "WORKFLOW_workspace_members");

// =====================================================
// HOOK: Secure Workspace Members — Delete
// =====================================================
onRecordDeleteRequest((e) => {
    const record = e.record;
    const authRecord = e.auth;

    if (!authRecord) return e.next();

    const wsId = record.get("workspace");
    if (!wsId) return e.next();

    let ws;
    try {
        ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
        if (ws.get("owner") === authRecord.id) return e.next();
    } catch(err) {}

    try {
        const admins = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "workspace = {:ws} && user = {:user} && role = 'admin' && status = 'active'",
            "-created", 1, 0,
            { ws: wsId, user: authRecord.id }
        );
        if (admins && admins.length > 0) return e.next();
    } catch(err) {}

    // Users can delete their own membership to leave
    if (record.get("user") === authRecord.id) return e.next();

    throw new BadRequestError("You don't have permission to delete workspace members");
}, "WORKFLOW_workspace_members");

// =====================================================
// HOOK: Notify on Workspace Member Deletion (removal, rejection, invitation decline)
// =====================================================
onRecordDeleteRequest((e) => {
    e.next();
    const record = e.record;
    
    try {
        const userId = record.get("user");
        const wsId = record.get("workspace");
        if (!userId || !wsId) return;

        const status = record.get("status");
        const invitedBy = record.get("invited_by");

        let wsName = "Workspace";
        try {
            let ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
            wsName = ws.get("name") || wsName;
        } catch(err) {}

        const notifCollection = e.app.findCollectionByNameOrId("WORKFLOW_notifications");

        // --- SCENARIO 1: Admin rejects a join-by-code request (pending, no invited_by) ---
        if (status === "pending" && !invitedBy) {
            // The admin deleted the pending request → notify the user who requested
            if (e.auth && e.auth.id === userId) return; // user cancelled their own request

            const title = "Prośba odrzucona / Join request rejected";
            const message = `Twoja prośba o dołączenie do „${wsName}" została odrzucona. / Your request to join "${wsName}" has been rejected.`;

            const notifRecord = new Record(notifCollection);
            notifRecord.set("user", userId);
            notifRecord.set("title", title);
            notifRecord.set("message", message);
            notifRecord.set("type", "warning");
            notifRecord.set("isRead", false);
            e.app.save(notifRecord);
            return;
        }

        // --- SCENARIO 2: User rejects an email invitation (pending, has invited_by) ---
        if ((status === "pending" || status === "pending_registration") && invitedBy) {
            // The invited user rejected the invitation → notify the inviter
            if (e.auth && e.auth.id === userId) {
                // The user themselves rejected — notify the person who invited
                try {
                    let invitedUserName = "Użytkownik / User";
                    try {
                        let u = e.app.findRecordById("WORKFLOW_users", userId);
                        invitedUserName = u.get("name") || u.get("email") || invitedUserName;
                    } catch(err) {}

                    const title = "Zaproszenie odrzucone / Invitation rejected";
                    const message = `${invitedUserName} odrzucił zaproszenie do „${wsName}". / ${invitedUserName} rejected the invitation to "${wsName}".`;

                    const notifRecord = new Record(notifCollection);
                    notifRecord.set("user", invitedBy);
                    notifRecord.set("title", title);
                    notifRecord.set("message", message);
                    notifRecord.set("type", "info");
                    notifRecord.set("isRead", false);
                    e.app.save(notifRecord);
                } catch(err) {
                    console.log("Error creating invite rejection notif: " + String(err.message || err));
                }
                return;
            }
            // Admin deleted the pending invitation → notify the invited user
            const title = "Zaproszenie anulowane / Invitation cancelled";
            const message = `Twoje zaproszenie do „${wsName}" zostało anulowane. / Your invitation to "${wsName}" has been cancelled.`;

            const notifRecord = new Record(notifCollection);
            notifRecord.set("user", userId);
            notifRecord.set("title", title);
            notifRecord.set("message", message);
            notifRecord.set("type", "warning");
            notifRecord.set("isRead", false);
            e.app.save(notifRecord);
            return;
        }

        // --- SCENARIO 3: Active member leaves or is removed ---
        if (status === "active") {

            // 3a. User left voluntarily → notify owner + admins
            if (e.auth && e.auth.id === userId) {
                try {
                    let leavingUserName = "Użytkownik / User";
                    try {
                        let u = e.app.findRecordById("WORKFLOW_users", userId);
                        leavingUserName = u.get("name") || u.get("email") || leavingUserName;
                    } catch(err) {}

                    // Find owner + admins to notify
                    let notifyIds = [];
                    try {
                        let ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
                        let ownerId = ws.get("owner");
                        if (ownerId) notifyIds.push(ownerId);
                    } catch(err) {}

                    try {
                        let admins = e.app.findRecordsByFilter(
                            "WORKFLOW_workspace_members",
                            "workspace = {:ws} && role = 'admin' && status = 'active' && user != {:leaving}",
                            "", 100, 0,
                            { ws: wsId, leaving: userId }
                        );
                        if (admins) {
                            for (let i = 0; i < admins.length; i++) {
                                let adminUserId = admins[i].get("user");
                                if (adminUserId && notifyIds.indexOf(adminUserId) === -1) {
                                    notifyIds.push(adminUserId);
                                }
                            }
                        }
                    } catch(err) {}

                    const title = "Członek opuścił workspace / Member left workspace";
                    const message = `${leavingUserName} opuścił obszar roboczy „${wsName}". / ${leavingUserName} left the workspace "${wsName}".`;

                    for (let i = 0; i < notifyIds.length; i++) {
                        try {
                            const notifRecord = new Record(notifCollection);
                            notifRecord.set("user", notifyIds[i]);
                            notifRecord.set("title", title);
                            notifRecord.set("message", message);
                            notifRecord.set("type", "info");
                            notifRecord.set("isRead", false);
                            e.app.save(notifRecord);
                        } catch(err) {}
                    }
                } catch(err) {
                    console.log("Error creating voluntary leave notif: " + String(err.message || err));
                }
                return;
            }

            // 3b. Admin removed the member → notify the removed user + send email
            const title = "Usunięto z obszaru roboczego / Removed from workspace";
            const message = `Zostałeś usunięty z obszaru roboczego „${wsName}". / You have been removed from the workspace "${wsName}".`;

            // 1. Create System Notification
            try {
                const notifRecord = new Record(notifCollection);
                notifRecord.set("user", userId);
                notifRecord.set("title", title);
                notifRecord.set("message", message);
                notifRecord.set("type", "warning");
                notifRecord.set("isRead", false);
                e.app.save(notifRecord);
            } catch(err) {
                console.log("Error creating removal notification: " + String(err.message || err));
            }

            // 2. Send Email Notification
            try {
                let user = e.app.findRecordById("WORKFLOW_users", userId);
                let recipientEmail = user.get("email");
                
                if (recipientEmail) {
                    var escapeHtml = function(str) {
                        if (!str) return '';
                        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
                    };
                    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>'
                    + '<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,system-ui,-apple-system,sans-serif;">'
                    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">'
                    + '<tr><td align="center">'
                    + '<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">'
                    + '<tr><td style="padding:36px 36px 20px;text-align:center;border-bottom:1px solid #f0f0f0;">'
                    + '<img src="https://gryf.ai/gryf-ai-logo.svg" alt="Gryf.ai" width="44" height="40" style="display:block;margin:0 auto 16px;" />'
                    + '<h1 style="margin:0;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">Powiadomienie z Workspace</h1>'
                    + '<p style="margin:2px 0 0;font-size:14px;color:#9ca3af;font-weight:500;">Workspace Notification</p>'
                    + '</td></tr>'
                    + '<tr><td style="padding:28px 36px;">'
                    + '<p style="font-size:15px;color:#1a1a1a;line-height:1.6;">Zostałeś usunięty z obszaru roboczego <strong>' + escapeHtml(wsName) + '</strong>.</p>'
                    + '<p style="font-size:14px;color:#6b7280;line-height:1.6;">You have been removed from the workspace <strong>' + escapeHtml(wsName) + '</strong>.</p>'
                    + '</td></tr>'
                    + '<tr><td style="padding:20px 36px;border-top:1px solid #f0f0f0;text-align:center;background:#fafaf9;">'
                    + '<p style="margin:0 0 4px;font-size:12px;color:#9ca3af;font-weight:500;">Gryf.ai — Projektowanie Procesów Biznesowych / Business Process Design</p>'
                    + '<p style="margin:0;font-size:11px;color:#c4c4c4;">Ten email został wysłany automatycznie. Nie musisz na niego odpowiadać.<br/>This email was sent automatically. You do not need to reply.</p>'
                    + '</td></tr>'
                    + '</table>'
                    + '</td></tr></table>'
                    + '</body></html>';

                    let mailMsg = new MailerMessage({
                        from: {
                            address: e.app.settings().meta.senderAddress,
                            name: e.app.settings().meta.senderName || "Gryf.ai"
                        },
                        to: [{ address: recipientEmail }],
                        subject: "Gryf.ai — " + title,
                        html: html,
                    });
                    e.app.newMailClient().send(mailMsg);
                }
            } catch(err) {
                console.log("Error sending removal email: " + String(err.message || err));
            }
        }
    } catch(err) {
        console.log("Error in workspace member deletion notification hook: " + String(err.message || err));
    }
}, "WORKFLOW_workspace_members");

// =====================================================
// HOOK: Secure Notifications — Update
// =====================================================
onRecordUpdateRequest((e) => {
    const record = e.record;
    const authRecord = e.auth;

    if (!authRecord) return e.next();

    try {
        const original = e.app.findRecordById("WORKFLOW_notifications", record.id);
        
        // Zabezpieczenie przed edycją treści powiadomienia przez zwykłego użytkownika
        if (original.get("title") !== record.get("title") ||
            original.get("message") !== record.get("message") ||
            original.get("type") !== record.get("type") ||
            original.get("user") !== record.get("user")) {
            throw new Error("You cannot modify the content of a notification. Only 'isRead' can be updated.");
        }
    } catch(err) {
        throw new Error(err.message || "Błąd podczas weryfikacji powiadomienia");
    }
    
    return e.next();
}, "WORKFLOW_notifications");

// --- CREATE: Enforce tier limits ---
onRecordCreateRequest(function(e) {
    var authRecord = e.auth;
    if (!authRecord) return e.next();

    var userTier = (authRecord.get("tier") || "FREE").toUpperCase();
    var effectiveTier = userTier;
    var tierExpiry = authRecord.get("tier_expires_at");
    if (userTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) {
        effectiveTier = "FREE";
    }

    var limits = {
        maxProcesses: 0, maxNodesPerProcess: 0, maxEdgesPerProcess: 0,
        maxNotesPerProcess: 0, maxVariablesPerProcess: 0,
        maxChecklistItemsPerNode: 0, canUseSubworkflows: false,
        canSharePublic: false, canShareWithPassword: false
    };

    try {
        var configs = e.app.findRecordsByFilter("WORKFLOW_tier_config", "tier = {:tier}", "", 1, 0, { tier: effectiveTier });
        if (configs && configs.length > 0) {
            var conf = configs[0];
            var gn = function(v) { var n = Number(v); return isNaN(n) ? 0 : (n >= 999999 ? 999999 : n); };
            limits.maxProcesses = gn(conf.get("max_processes"));
            limits.maxNodesPerProcess = gn(conf.get("max_nodes_per_process"));
            limits.maxEdgesPerProcess = gn(conf.get("max_edges_per_process"));
            limits.maxNotesPerProcess = gn(conf.get("max_notes_per_process"));
            limits.maxVariablesPerProcess = gn(conf.get("max_variables_per_process"));
            limits.maxChecklistItemsPerNode = gn(conf.get("max_checklist_items_per_node"));
            var sub = conf.get("can_use_subworkflows");
            limits.canUseSubworkflows = (sub === true || sub === "true" || sub === 1 || sub === "1");
            var sp = conf.get("can_share_public");
            limits.canSharePublic = (sp === true || sp === "true" || sp === 1 || sp === "1");
            var swp = conf.get("can_share_with_password");
            limits.canShareWithPassword = (swp === true || swp === "true" || swp === 1 || swp === "1");
        }
    } catch(err) {
        console.log("Error loading tier config in create hook: " + err);
    }

    var record = e.record;

    // Sprawdzenie ilości procesów w workspace (tylko CREATE)
    var workspaceId = record.get("workspace");
    if (workspaceId) {
        var existing = e.app.findRecordsByFilter("WORKFLOW_processes", "workspace = {:workspace}", "", 5000, 0, { workspace: workspaceId });
        var existingCount = existing ? existing.length : 0;
        if (Number(existingCount) >= Number(limits.maxProcesses)) {
            throw new BadRequestError("Limit procesów (" + limits.maxProcesses + ") został osiągnięty dla planu " + effectiveTier + ". / Process limit exceeded (" + limits.maxProcesses + ") for " + effectiveTier + " plan.");
        }
    }

    // Walidacja wnętrza procesu
    var parsePbJson = function(raw) {
        if (!raw) return [];
        if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') return raw;
        if (typeof raw === 'object' && !Array.isArray(raw) && typeof raw !== 'string') {
            try {
                var jsonStr = JSON.stringify(raw);
                if (jsonStr) {
                    var parsed = JSON.parse(jsonStr);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch(pe) {}
            try {
                var arr = Array.from(raw);
                if (arr && arr.length > 0) return arr;
            } catch(pe) {}
            return [];
        }
        var str = "";
        if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'number') {
            for(var i=0; i<raw.length; i++) str += String.fromCharCode(raw[i]);
            try { str = decodeURIComponent(escape(str)); } catch(pe) {}
        } else if (typeof raw === "string") {
            str = raw;
        } else if (Array.isArray(raw) && raw.length === 0) {
            return [];
        } else {
            return [];
        }
        try {
            var parsed = JSON.parse(str);
            if (typeof parsed === "string") parsed = JSON.parse(parsed);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object') return Array.from(parsed) || [];
        } catch(pe) {}
        return [];
    };

    var nodesArray = [];
    var edgesArray = [];
    try {
        var nodesRaw = record.get("nodes");
        nodesArray = parsePbJson(typeof nodesRaw === 'string' ? nodesRaw : record.getString("nodes"));
    } catch(parseErr) {
        console.log("CREATE hook: Error parsing nodes: " + parseErr);
    }
    try {
        var edgesRaw = record.get("edges");
        edgesArray = parsePbJson(typeof edgesRaw === 'string' ? edgesRaw : record.getString("edges"));
    } catch(parseErr) {
        console.log("CREATE hook: Error parsing edges: " + parseErr);
    }

    var nodesCount = 0, notesCount = 0, totalVariables = 0, maxChecklist = 0, hasSubworkflow = false;

    for (var i = 0; i < nodesArray.length; i++) {
        var node = nodesArray[i];
        if (node && node.type === "note") notesCount++; else nodesCount++;
        if (node && node.type === "subworkflow") hasSubworkflow = true;
        if (node && node.data) {
            if (Array.isArray(node.data.variables)) totalVariables += node.data.variables.length;
            if (Array.isArray(node.data.checklist) && node.data.checklist.length > maxChecklist) maxChecklist = node.data.checklist.length;
        }
    }

    var maxN = Number(limits.maxNodesPerProcess) || 999999;
    var maxE = Number(limits.maxEdgesPerProcess) || 999999;
    var maxNo = Number(limits.maxNotesPerProcess) || 999999;
    var maxV = Number(limits.maxVariablesPerProcess) || 999999;
    var maxC = Number(limits.maxChecklistItemsPerNode) || 999999;


    if (hasSubworkflow && !limits.canUseSubworkflows) throw new BadRequestError("Funkcja podprocesów nie jest dostępna w Twoim planie. / Subworkflows not available in your plan.");
    if (nodesCount > maxN) throw new BadRequestError("Limit węzłów (" + maxN + ") osiągnięty. / Nodes limit (" + maxN + ") reached.");
    if (edgesArray.length > maxE) throw new BadRequestError("Limit połączeń (" + maxE + ") osiągnięty. / Edges limit (" + maxE + ") reached.");
    if (notesCount > maxNo) throw new BadRequestError("Limit notatek (" + maxNo + ") osiągnięty. / Notes limit (" + maxNo + ") reached.");
    if (totalVariables > maxV) throw new BadRequestError("Limit zmiennych (" + maxV + ") osiągnięty. / Variables limit (" + maxV + ") reached.");
    if (maxChecklist > maxC) throw new BadRequestError("Limit checklisty (" + maxC + ") osiągnięty. / Checklist limit (" + maxC + ") reached.");

    if (record.get("isPublic") === true && !limits.canSharePublic) {
        throw new BadRequestError("Udostępnianie publiczne nie jest dostępne w Twoim planie. / Public sharing is not available in your plan.");
    }
    var pubPass = record.getString("publicPassword");
    if (pubPass && String(pubPass).trim() !== "" && !limits.canShareWithPassword) {
        throw new BadRequestError("Zabezpieczenie hasłem nie jest dostępne w Twoim planie. / Password protection is not available in your plan.");
    }

    return e.next();
}, "WORKFLOW_processes");

// --- UPDATE: Enforce tier limits ---
onRecordUpdateRequest(function(e) {
    var authRecord = e.auth;
    if (!authRecord) return e.next();

    // Sprawdź czy nodes/edges/isPublic są w ogóle zmieniane w tym PATCH.
    // Jeśli nie (np. zmiana folderu, nazwy), pomiń walidację limitów.
    var body = e.requestInfo().body || {};
    if (body.nodes === undefined && body.edges === undefined && body.isPublic === undefined && body.publicPassword === undefined) {
        return e.next();
    }

    var userTier = (authRecord.get("tier") || "FREE").toUpperCase();
    var effectiveTier = userTier;
    var tierExpiry = authRecord.get("tier_expires_at");
    if (userTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) {
        effectiveTier = "FREE";
    }

    var limits = {
        maxProcesses: 0, maxNodesPerProcess: 0, maxEdgesPerProcess: 0,
        maxNotesPerProcess: 0, maxVariablesPerProcess: 0,
        maxChecklistItemsPerNode: 0, canUseSubworkflows: false,
        canSharePublic: false, canShareWithPassword: false
    };

    try {
        var configs = e.app.findRecordsByFilter("WORKFLOW_tier_config", "tier = {:tier}", "", 1, 0, { tier: effectiveTier });
        if (configs && configs.length > 0) {
            var conf = configs[0];
            var gn = function(v) { var n = Number(v); return isNaN(n) ? 0 : (n >= 999999 ? 999999 : n); };
            limits.maxNodesPerProcess = gn(conf.get("max_nodes_per_process"));
            limits.maxEdgesPerProcess = gn(conf.get("max_edges_per_process"));
            limits.maxNotesPerProcess = gn(conf.get("max_notes_per_process"));
            limits.maxVariablesPerProcess = gn(conf.get("max_variables_per_process"));
            limits.maxChecklistItemsPerNode = gn(conf.get("max_checklist_items_per_node"));
            var sub = conf.get("can_use_subworkflows");
            limits.canUseSubworkflows = (sub === true || sub === "true" || sub === 1 || sub === "1");
            var sp = conf.get("can_share_public");
            limits.canSharePublic = (sp === true || sp === "true" || sp === 1 || sp === "1");
            var swp = conf.get("can_share_with_password");
            limits.canShareWithPassword = (swp === true || swp === "true" || swp === 1 || swp === "1");
        }
    } catch(err) {
        console.log("Error loading tier config in update hook: " + err);
    }

    var record = e.record;

    // Walidacja wnętrza procesu (bez sprawdzania maxProcesses bo to UPDATE)
    var parsePbJson = function(raw) {
        if (!raw) return [];
        if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') return raw;
        if (typeof raw === 'object' && !Array.isArray(raw) && typeof raw !== 'string') {
            try {
                var jsonStr = JSON.stringify(raw);
                if (jsonStr) {
                    var parsed = JSON.parse(jsonStr);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch(pe) {}
            try {
                var arr = Array.from(raw);
                if (arr && arr.length > 0) return arr;
            } catch(pe) {}
            return [];
        }
        var str = "";
        if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'number') {
            for(var i=0; i<raw.length; i++) str += String.fromCharCode(raw[i]);
            try { str = decodeURIComponent(escape(str)); } catch(pe) {}
        } else if (typeof raw === "string") {
            str = raw;
        } else if (Array.isArray(raw) && raw.length === 0) {
            return [];
        } else {
            return [];
        }
        try {
            var parsed = JSON.parse(str);
            if (typeof parsed === "string") parsed = JSON.parse(parsed);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object') return Array.from(parsed) || [];
        } catch(pe) {}
        return [];
    };

    var nodesArray = [];
    var edgesArray = [];
    try {
        var nodesRaw = record.get("nodes");
        nodesArray = parsePbJson(typeof nodesRaw === 'string' ? nodesRaw : record.getString("nodes"));
    } catch(parseErr) {
        console.log("UPDATE hook: Error parsing nodes: " + parseErr);
    }
    try {
        var edgesRaw = record.get("edges");
        edgesArray = parsePbJson(typeof edgesRaw === 'string' ? edgesRaw : record.getString("edges"));
    } catch(parseErr) {
        console.log("UPDATE hook: Error parsing edges: " + parseErr);
    }

    var nodesCount = 0, notesCount = 0, totalVariables = 0, maxChecklist = 0, hasSubworkflow = false;

    for (var i = 0; i < nodesArray.length; i++) {
        var node = nodesArray[i];
        if (node && node.type === "note") notesCount++; else nodesCount++;
        if (node && node.type === "subworkflow") hasSubworkflow = true;
        if (node && node.data) {
            if (Array.isArray(node.data.variables)) totalVariables += node.data.variables.length;
            if (Array.isArray(node.data.checklist) && node.data.checklist.length > maxChecklist) maxChecklist = node.data.checklist.length;
        }
    }

    var maxN = Number(limits.maxNodesPerProcess) || 999999;
    var maxE = Number(limits.maxEdgesPerProcess) || 999999;
    var maxNo = Number(limits.maxNotesPerProcess) || 999999;
    var maxV = Number(limits.maxVariablesPerProcess) || 999999;
    var maxC = Number(limits.maxChecklistItemsPerNode) || 999999;

    if (hasSubworkflow && !limits.canUseSubworkflows) throw new BadRequestError("Funkcja podprocesów nie jest dostępna w Twoim planie. / Subworkflows not available in your plan.");
    if (nodesCount > maxN) throw new BadRequestError("Limit węzłów (" + maxN + ") osiągnięty. / Nodes limit (" + maxN + ") reached.");
    if (edgesArray.length > maxE) throw new BadRequestError("Limit połączeń (" + maxE + ") osiągnięty. / Edges limit (" + maxE + ") reached.");
    if (notesCount > maxNo) throw new BadRequestError("Limit notatek (" + maxNo + ") osiągnięty. / Notes limit (" + maxNo + ") reached.");
    if (totalVariables > maxV) throw new BadRequestError("Limit zmiennych (" + maxV + ") osiągnięty. / Variables limit (" + maxV + ") reached.");
    if (maxChecklist > maxC) throw new BadRequestError("Limit checklisty (" + maxC + ") osiągnięty. / Checklist limit (" + maxC + ") reached.");

    if (body.isPublic === true && !limits.canSharePublic) {
        throw new BadRequestError("Udostępnianie publiczne nie jest dostępne w Twoim planie. / Public sharing is not available in your plan.");
    }
    if (body.publicPassword !== undefined && String(body.publicPassword).trim() !== "" && !limits.canShareWithPassword) {
        throw new BadRequestError("Zabezpieczenie hasłem nie jest dostępne w Twoim planie. / Password protection is not available in your plan.");
    }

    return e.next();
}, "WORKFLOW_processes");

// =====================================================
// ROUTE: POST /api/process/lock — Atomic Process Locking
// =====================================================
routerAdd("POST", "/api/process/lock", (e) => {
    if (!e.auth) {
        return e.json(401, { message: "Not authenticated" });
    }

    const data = e.requestInfo().body || {};
    const processId = data.processId;
    if (!processId) {
        return e.json(400, { message: "processId is required" });
    }

    try {
        let success = false;

        // --- Security Check (Outside transaction to use e.app safely) ---
        const recordCheck = e.app.findRecordById("WORKFLOW_processes", processId);
        const wsId = recordCheck.get("workspace");
        let hasAccess = false;
        if (wsId && e.auth.id) {
            try {
                const ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
                if (ws.get("owner") === e.auth.id) hasAccess = true;
            } catch(err) {}
            if (!hasAccess) {
                try {
                    const members = e.app.findRecordsByFilter("WORKFLOW_workspace_members", "workspace = {:ws} && user = {:user} && status = 'active'", "", 1, 0, { ws: wsId, user: e.auth.id });
                    if (members && members.length > 0) hasAccess = true;
                } catch(err) {}
            }
        }
        if (!hasAccess) throw new Error("UNAUTHORIZED_WORKSPACE");
        // ----------------------

        e.app.runInTransaction((txApp) => {
            const record = txApp.findRecordById("WORKFLOW_processes", processId);
            
            const currentLocker = record.get("locked_by");
            const lockedAtStr = record.get("locked_at");

            const LOCK_TIMEOUT_MS = 3 * 60 * 1000;
            const now = Date.now();
            let isFree = false;

            if (!currentLocker || currentLocker === e.auth.id) {
                isFree = true;
            } else {
                if (lockedAtStr) {
                    const lockedAt = new Date(lockedAtStr).getTime();
                    if (now - lockedAt > LOCK_TIMEOUT_MS) {
                        isFree = true;
                    }
                } else {
                    isFree = true;
                }
            }

            if (isFree) {
                record.set("locked_by", e.auth.id);
                record.set("locked_at", new Date().toISOString());
                txApp.save(record);
                success = true;
            }
        });

        if (success) {
            return e.json(200, { success: true });
        } else {
            return e.json(409, { success: false, message: "Process is locked by another user" });
        }
    } catch (err) {
        return e.json(500, { message: err.message || "Internal server error" });
    }
});

// =====================================================
// ROUTE: POST /api/process/unlock — Atomic Lock Release
// =====================================================
routerAdd("POST", "/api/process/unlock", (e) => {
    if (!e.auth) {
        return e.json(401, { message: "Not authenticated" });
    }

    const data = e.requestInfo().body || {};
    const processId = data.processId;
    if (!processId) {
        return e.json(400, { message: "processId is required" });
    }

    try {
        e.app.runInTransaction((txApp) => {
            const record = txApp.findRecordById("WORKFLOW_processes", processId);
            const currentLocker = record.get("locked_by");

            // Only clear the lock if the requesting user holds it
            if (currentLocker === e.auth.id) {
                record.set("locked_by", "");
                record.set("locked_at", "");
                txApp.save(record);
            }
        });

        return e.json(200, { success: true });
    } catch (err) {
        return e.json(500, { message: err.message || "Internal server error" });
    }
});

// =====================================================
// ROUTE: POST /api/process/has-password
// =====================================================
routerAdd("POST", "/api/process/has-password", (e) => {
    if (!e.auth) {
        return e.json(401, { message: "Not authenticated" });
    }
    const data = e.requestInfo().body || {};
    const processId = data.processId;
    if (!processId) {
        return e.json(400, { message: "processId is required" });
    }
    try {
        const record = e.app.findRecordById("WORKFLOW_processes", processId);
        
        // --- Security Check ---
        const wsId = record.get("workspace");
        let hasAccess = false;
        if (wsId && e.auth.id) {
            try {
                const ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
                if (ws.get("owner") === e.auth.id) hasAccess = true;
            } catch(err) {}
            if (!hasAccess) {
                try {
                    const members = e.app.findRecordsByFilter("WORKFLOW_workspace_members", "workspace = {:ws} && user = {:user} && status = 'active'", "", 1, 0, { ws: wsId, user: e.auth.id });
                    if (members && members.length > 0) hasAccess = true;
                } catch(err) {}
            }
        }
        if (!hasAccess && !record.get("isPublic")) {
            return e.json(403, { message: "No access to this workspace" });
        }
        // ----------------------
        
        const pwd = record.get("publicPassword");
        return e.json(200, { hasPassword: !!pwd });
    } catch(err) {
        return e.json(404, { message: "Process not found" });
    }
});

// =====================================================
// ROUTE: POST /api/process/set-password
// =====================================================
routerAdd("POST", "/api/process/set-password", (e) => {
    if (!e.auth) {
        return e.json(401, { message: "Not authenticated" });
    }
    const data = e.requestInfo().body || {};
    const processId = data.processId;
    const password = data.password || "";
    
    if (!processId) {
        return e.json(400, { message: "processId is required" });
    }
    
    try {
        const record = e.app.findRecordById("WORKFLOW_processes", processId);
        const wsId = record.get("workspace");
        
        let hasAccess = false;
        
        // Check if owner of workspace
        try {
            const ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
            if (ws.get("owner") === e.auth.id) {
                hasAccess = true;
            }
        } catch(err) {}
        
        // Check if admin/editor in workspace
        if (!hasAccess) {
            try {
                const members = e.app.findRecordsByFilter(
                    "WORKFLOW_workspace_members",
                    "workspace = {:ws} && user = {:user} && status = 'active' && (role = 'admin' || role = 'editor')",
                    "", 1, 0,
                    { ws: wsId, user: e.auth.id }
                );
                if (members && members.length > 0) hasAccess = true;
            } catch(err) {}
        }
        
        if (!hasAccess) {
            return e.json(403, { message: "No permission to edit this process" });
        }
        
        if (password) {
            const hashedPassword = $security.sha256(password + "gryf-salt-" + record.id);
            record.set("publicPassword", hashedPassword);
        } else {
            record.set("publicPassword", "");
        }
        
        e.app.save(record);
        
        return e.json(200, { hasPassword: !!password });
    } catch(err) {
        return e.json(500, { message: err.message || "Error setting password" });
    }
});

// =====================================================
// ROUTE: GET /api/workspace-stats
// =====================================================
routerAdd("GET", "/api/workspace-stats", (e) => {
    if (!e.auth) {
        return e.json(401, { message: "Not authenticated" });
    }

    try {
        const userId = e.auth.id;
        
        const owned = e.app.findRecordsByFilter(
            "WORKFLOW_workspaces",
            "owner = {:owner}",
            "-created", 1000, 0,
            { owner: userId }
        ) || [];

        const memberships = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "user = {:user} && status != 'rejected'",
            "-created", 1000, 0,
            { user: userId }
        ) || [];

        const workspaceIds = new Set();
        for (let i=0; i<owned.length; i++) workspaceIds.add(owned[i].id);
        for (let i=0; i<memberships.length; i++) {
            const wsId = memberships[i].get("workspace");
            if (wsId) workspaceIds.add(wsId);
        }

        const idArray = Array.from(workspaceIds);
        if (idArray.length === 0) {
            return e.json(200, {});
        }

        const placeholders = idArray.map(function(_, i) { return "{:id" + i + "}"; }).join(",");
        const bindParams = {};
        idArray.forEach(function(id, i) { bindParams["id" + i] = id; });

        const db = e.app.db();

        const processStats = {};
        const pRows = arrayOf(new DynamicModel({ workspace: "", cnt: 0 }));
        db.newQuery("SELECT workspace, COUNT(*) as cnt FROM WORKFLOW_processes WHERE workspace IN (" + placeholders + ") GROUP BY workspace").bind(bindParams).all(pRows);
        Array.from(pRows).forEach(function(r) { processStats[r.workspace] = r.cnt; });

        const memberStats = {};
        const mRows = arrayOf(new DynamicModel({ workspace: "", cnt: 0 }));
        db.newQuery("SELECT workspace, COUNT(*) as cnt FROM WORKFLOW_workspace_members WHERE workspace IN (" + placeholders + ") AND status != 'rejected' GROUP BY workspace").bind(bindParams).all(mRows);
        Array.from(mRows).forEach(function(r) { memberStats[r.workspace] = r.cnt; });

        const folderStats = {};
        const fRows = arrayOf(new DynamicModel({ workspace: "", cnt: 0 }));
        db.newQuery("SELECT workspace, COUNT(*) as cnt FROM WORKFLOW_process_groups WHERE workspace IN (" + placeholders + ") GROUP BY workspace").bind(bindParams).all(fRows);
        Array.from(fRows).forEach(function(r) { folderStats[r.workspace] = r.cnt; });

        const joinCodes = {};
        const jRows = arrayOf(new DynamicModel({ id: "", join_code: "" }));
        db.newQuery("SELECT id, join_code FROM WORKFLOW_workspaces WHERE id IN (" + placeholders + ")").bind(bindParams).all(jRows);
        Array.from(jRows).forEach(function(r) { joinCodes[r.id] = r.join_code; });

        const result = {};
        idArray.forEach(function(id) {
            result[id] = {
                processCount: processStats[id] || 0,
                memberCount: memberStats[id] || 0,
                folderCount: folderStats[id] || 0,
                joinCode: joinCodes[id] || ""
            };
        });

        return e.json(200, result);
    } catch (err) {
        return e.json(500, { message: err.message || "Internal server error" });
    }
});

// =====================================================
// ROUTE: GET /api/folder-stats/{workspaceId}
// =====================================================
routerAdd("GET", "/api/folder-stats/{workspaceId}", (e) => {
    if (!e.auth) {
        return e.json(401, { message: "Not authenticated" });
    }

    try {
        const workspaceId = e.request.pathValue("workspaceId");
        if (!workspaceId) {
            return e.json(400, { message: "Missing workspaceId" });
        }
        
        // --- Security Check ---
        let hasAccess = false;
        if (workspaceId && e.auth.id) {
            try {
                const ws = e.app.findRecordById("WORKFLOW_workspaces", workspaceId);
                if (ws.get("owner") === e.auth.id) hasAccess = true;
            } catch(err) {}
            if (!hasAccess) {
                try {
                    const members = e.app.findRecordsByFilter("WORKFLOW_workspace_members", "workspace = {:ws} && user = {:user} && status = 'active'", "", 1, 0, { ws: workspaceId, user: e.auth.id });
                    if (members && members.length > 0) hasAccess = true;
                } catch(err) {}
            }
        }
        if (!hasAccess) {
            return e.json(403, { message: "Access denied" });
        }
        // ----------------------

        const db = e.app.db();
        // Zliczamy procesy dla poszczegolnych folderow (group) w danym workspace
        // Zabezpieczamy `group` znakami ucieczki, ponieważ jest to słowo kluczowe w SQL.
        // Ignorujemy procesy, ktore nie maja przypisanej grupy (group = '').
        const query = db.newQuery('SELECT "group", COUNT(*) as cnt FROM WORKFLOW_processes WHERE workspace = {:workspace} AND "group" != \'\' GROUP BY "group"').bind({ workspace: workspaceId });
        
        const rows = arrayOf(new DynamicModel({ group: "", cnt: 0 }));
        query.all(rows);
        
        const result = {};
        Array.from(rows).forEach(function(r) {
            if (r.group) {
                result[r.group] = r.cnt;
            }
        });

        return e.json(200, result);
    } catch (err) {
        return e.json(500, { message: err.message || "Internal server error" });
    }
});

// =====================================================
// ROUTE: GET /api/user-stats
// =====================================================
routerAdd("GET", "/api/user-stats", (e) => {
    if (!e.auth) return e.json(401, { message: "Not authenticated" });

    try {
        const userId = e.auth.id;
        const db = e.app.db();

        let ownedWorkspacesCount = 0;
        const wRows = arrayOf(new DynamicModel({ cnt: 0 }));
        db.newQuery("SELECT COUNT(*) as cnt FROM WORKFLOW_workspaces WHERE owner = {:owner}").bind({ owner: userId }).all(wRows);
        if (wRows.length > 0) ownedWorkspacesCount = wRows[0].cnt;

        let processCount = 0;
        const pRows = arrayOf(new DynamicModel({ cnt: 0 }));
        db.newQuery("SELECT COUNT(*) as cnt FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:owner})").bind({ owner: userId }).all(pRows);
        if (pRows.length > 0) processCount = pRows[0].cnt;

        let versionCount = 0;
        const vRows = arrayOf(new DynamicModel({ cnt: 0 }));
        db.newQuery("SELECT COUNT(*) as cnt FROM WORKFLOW_versions WHERE process IN (SELECT id FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:owner}))").bind({ owner: userId }).all(vRows);
        if (vRows.length > 0) versionCount = vRows[0].cnt;

        let commentCount = 0;
        const cRows = arrayOf(new DynamicModel({ cnt: 0 }));
        db.newQuery("SELECT COUNT(*) as cnt FROM WORKFLOW_comments WHERE process IN (SELECT id FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:owner}))").bind({ owner: userId }).all(cRows);
        if (cRows.length > 0) commentCount = cRows[0].cnt;

        let membershipCount = 0;
        const mRows = arrayOf(new DynamicModel({ cnt: 0 }));
        db.newQuery("SELECT COUNT(*) as cnt FROM WORKFLOW_workspace_members WHERE user = {:user} AND status = 'active' AND workspace NOT IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:user})").bind({ user: userId }).all(mRows);
        if (mRows.length > 0) membershipCount = mRows[0].cnt;

        return e.json(200, {
            processCount: processCount,
            workspaceCount: ownedWorkspacesCount,
            membershipCount: membershipCount,
            versionCount: versionCount,
            commentCount: commentCount
        });
    } catch (err) {
        return e.json(500, { message: err.message || "Internal server error" });
    }
});
// =====================================================
// ROUTE: GET /api/locked-workspaces
// =====================================================
routerAdd("GET", "/api/locked-workspaces", (e) => {
    if (!e.auth) return e.json(401, { message: "Not authenticated" });

    try {
        const userId = e.auth.id;

        // 1. Get all workspaces the user has access to (owner or active member)
        const db = e.app.db();
        const myWorkspaces = arrayOf(new DynamicModel({ id: "", owner: "", created: "" }));
        db.newQuery("SELECT id, owner, created FROM WORKFLOW_workspaces WHERE owner = {:user} OR id IN (SELECT workspace FROM WORKFLOW_workspace_members WHERE user = {:user} AND status = 'active')")
            .bind({ user: userId })
            .all(myWorkspaces);

        if (!myWorkspaces || myWorkspaces.length === 0) {
            return e.json(200, []);
        }

        // 2. Extract unique owners
        const ownersSet = new Set();
        let myWsArray = Array.from(myWorkspaces);
        
        myWsArray.forEach(ws => {
            const ownerId = ws.owner;
            if (ownerId) ownersSet.add(ownerId);
        });
        const uniqueOwners = Array.from(ownersSet);

        const lockedWorkspaceIds = new Set();

        // 3. Check Owner limits first
        for (let i = 0; i < uniqueOwners.length; i++) {
            const ownerId = uniqueOwners[i];
            
            let ownerTier = "FREE";
            try {
                const owner = e.app.findRecordById("WORKFLOW_users", ownerId);
                const rawTier = owner.get("tier") || "FREE";
                const tierExpiry = owner.get("tier_expires_at");
                if (rawTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) {
                    ownerTier = "FREE";
                } else {
                    ownerTier = rawTier.toUpperCase();
                }
            } catch(err) {}

            let ownerMaxWorkspaces = 1;
            try {
                const configs = e.app.findRecordsByFilter("WORKFLOW_tier_config", "tier = {:tier}", "", 1, 0, { tier: ownerTier });
                if (configs && configs.length > 0) {
                    ownerMaxWorkspaces = Number(configs[0].get("max_workspaces")) || 1;
                }
            } catch(err) {}

            const ownerWorkspaces = e.app.findRecordsByFilter(
                "WORKFLOW_workspaces",
                "owner = {:owner}",
                "created", 5000, 0,
                { owner: ownerId }
            ) || [];

            let ownerWsArray = [];
            try { ownerWsArray = Array.from(ownerWorkspaces); } catch(err) { ownerWsArray = ownerWorkspaces || []; }

            for (let j = 0; j < ownerWsArray.length; j++) {
                if (j >= ownerMaxWorkspaces) {
                    lockedWorkspaceIds.add(ownerWsArray[j].id);
                }
            }
        }

        // 4. Check Current User's global limits
        let userTier = "FREE";
        const rawTier = e.auth.get("tier") || "FREE";
        const tierExpiry = e.auth.get("tier_expires_at");
        if (rawTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) {
            userTier = "FREE";
        } else {
            userTier = rawTier.toUpperCase();
        }

        let maxWorkspaces = 1;
        try {
            const configs = e.app.findRecordsByFilter("WORKFLOW_tier_config", "tier = {:tier}", "", 1, 0, { tier: userTier });
            if (configs && configs.length > 0) {
                maxWorkspaces = Number(configs[0].get("max_workspaces")) || 1;
            }
        } catch(err) {}

        // Sort user's workspaces: owned first, then joined, then by created ASC
        myWsArray.sort((a, b) => {
            const aOwned = a.owner === userId ? 1 : 0;
            const bOwned = b.owner === userId ? 1 : 0;
            if (aOwned !== bOwned) return bOwned - aOwned;
            if (a.created < b.created) return -1;
            if (a.created > b.created) return 1;
            return 0;
        });

        // Add to locked set if beyond personal limit
        for (let j = 0; j < myWsArray.length; j++) {
            if (j >= maxWorkspaces) {
                lockedWorkspaceIds.add(myWsArray[j].id);
            }
        }

        // 5. Return the intersection
        const userWsIds = new Set(myWsArray.map(ws => ws.id));
        const filteredLockedIds = Array.from(lockedWorkspaceIds).filter(id => userWsIds.has(id));

        return e.json(200, filteredLockedIds);

    } catch (err) {
        return e.json(500, { message: err.message || "Internal server error" });
    }
});

// =====================================================
// ROUTE: GET /api/locked-processes/{workspaceId}
// =====================================================
routerAdd("GET", "/api/locked-processes/{workspaceId}", (e) => {
    if (!e.auth) return e.json(401, { message: "Not authenticated" });

    try {
        const workspaceId = e.request.pathValue("workspaceId");
        if (!workspaceId) return e.json(400, { message: "Missing workspaceId" });

        // --- Security Check ---
        let hasAccess = false;
        if (workspaceId && e.auth.id) {
            try {
                const ws = e.app.findRecordById("WORKFLOW_workspaces", workspaceId);
                if (ws.get("owner") === e.auth.id) hasAccess = true;
            } catch(err) {}
            if (!hasAccess) {
                try {
                    const members = e.app.findRecordsByFilter("WORKFLOW_workspace_members", "workspace = {:ws} && user = {:user} && status = 'active'", "", 1, 0, { ws: workspaceId, user: e.auth.id });
                    if (members && members.length > 0) hasAccess = true;
                } catch(err) {}
            }
        }
        if (workspaceId !== "debug_limits" && !hasAccess) {
            return e.json(403, { message: "Access denied" });
        }
        // ----------------------

        let userTier = "FREE";
        const user = e.auth;
        const rawTier = user.get("tier") || "FREE";
        const tierExpiry = user.get("tier_expires_at");
        if (rawTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) {
            userTier = "FREE";
        } else {
            userTier = rawTier.toUpperCase();
        }

        let limits = {
            maxProcesses: 0,
            maxNodesPerProcess: 0,
            maxEdgesPerProcess: 0,
            maxNotesPerProcess: 0,
            maxVariablesPerProcess: 0,
            maxChecklistItemsPerNode: 0,
            canUseSubworkflows: false
        };

        const configs = e.app.findRecordsByFilter(
            "WORKFLOW_tier_config",
            "tier = {:tier}",
            "", 1, 0,
            { tier: userTier }
        );

        if (configs && configs.length > 0) {
            const conf = configs[0];
            const getNum = (v) => {
                let n = Number(v);
                if (isNaN(n)) return 0;
                return n >= 999999 ? 999999 : n;
            };
            
            limits.maxProcesses = getNum(conf.get("max_processes"));
            limits.maxNodesPerProcess = getNum(conf.get("max_nodes_per_process"));
            limits.maxEdgesPerProcess = getNum(conf.get("max_edges_per_process"));
            limits.maxNotesPerProcess = getNum(conf.get("max_notes_per_process"));
            limits.maxVariablesPerProcess = getNum(conf.get("max_variables_per_process"));
            limits.maxChecklistItemsPerNode = getNum(conf.get("max_checklist_items_per_node"));
            
            let sub = conf.get("can_use_subworkflows");
            limits.canUseSubworkflows = (sub === true || sub === "true" || sub === 1 || sub === "1");
            
            // Tryb debug do bezpośredniego sprawdzenia co Goja widzi w bazie
            limits._debugRawMaxProcesses = conf.get("max_processes");
            limits._debugUserTier = userTier;
        }

        if (workspaceId === "debug_limits") {
            return e.json(200, limits);
        }

        const lockedIds = [];

        const procs = e.app.findRecordsByFilter(
            "WORKFLOW_processes",
            "workspace = {:workspace}",
            "created", 5000, 0,
            { workspace: workspaceId }
        ) || [];

        // Bezpieczne sprawdzanie procs (konwersja Go Slice do JS Array)
        let procsArray = [];
        try { procsArray = Array.from(procs); } catch(err) { procsArray = procs || []; }

        for (let i = 0; i < procsArray.length; i++) {
            let p = procsArray[i];
            
            if (Number(i) >= Number(limits.maxProcesses)) {
                lockedIds.push(p.id);
                continue;
            }

            let nodesStr = p.getString("nodes");
            let edgesStr = p.getString("edges");
            let nodes = [];
            let edges = [];

            try { nodes = typeof nodesStr === "string" && nodesStr ? JSON.parse(nodesStr) : []; } catch(err) {}
            try { edges = typeof edgesStr === "string" && edgesStr ? JSON.parse(edgesStr) : []; } catch(err) {}

            let nodesCount = 0;
            let notesCount = 0;
            let totalVariables = 0;
            let maxChecklist = 0;
            let hasSubworkflow = false;

            let nodesArray = [];
            try { nodesArray = Array.from(nodes); } catch(err) { nodesArray = nodes || []; }
            let edgesArray = [];
            try { edgesArray = Array.from(edges); } catch(err) { edgesArray = edges || []; }

            for (let j = 0; j < nodesArray.length; j++) {
                var node = nodesArray[j];
                if (node && node.type === 'note') notesCount++;
                else nodesCount++;
                if (node && node.type === 'subworkflow') hasSubworkflow = true;

                if (node && node.data) {
                    if (Array.isArray(node.data.variables)) totalVariables += node.data.variables.length;
                    if (Array.isArray(node.data.checklist) && node.data.checklist.length > maxChecklist) {
                        maxChecklist = node.data.checklist.length;
                    }
                }
            }

            let isLocked = false;

            // Wymuszamy rzutowanie na JS Number dla pewności
            const maxNodes = Number(limits.maxNodesPerProcess) || 999999;
            const maxEdges = Number(limits.maxEdgesPerProcess) || 999999;
            const maxNotes = Number(limits.maxNotesPerProcess) || 999999;
            const maxVars = Number(limits.maxVariablesPerProcess) || 999999;
            const maxChecklistItems = Number(limits.maxChecklistItemsPerNode) || 999999;
            
            const nNodes = Number(nodesCount) || 0;
            const nEdges = Number(edgesArray.length) || 0;
            const nNotes = Number(notesCount) || 0;
            const nVars = Number(totalVariables) || 0;
            const nChecklist = Number(maxChecklist) || 0;

            if (hasSubworkflow && !limits.canUseSubworkflows) { isLocked = true; }
            else if (nNodes > maxNodes) { isLocked = true; }
            else if (nEdges > maxEdges) { isLocked = true; }
            else if (nNotes > maxNotes) { isLocked = true; }
            else if (nVars > maxVars) { isLocked = true; }
            else if (nChecklist > maxChecklistItems) { isLocked = true; }

            if (isLocked) {
                lockedIds.push(p.id);
            }
        }

        return e.json(200, lockedIds);

    } catch (err) {
        return e.json(500, { message: err.message || "Internal server error" });
    }
});

// =====================================================
// ROUTE: GET /api/process-links/{workspaceId}
// MED-9: Server-side cross-workflow link extraction
// Avoids downloading full nodes JSON to the client.
// =====================================================
routerAdd("GET", "/api/process-links/{workspaceId}", (e) => {
    if (!e.auth) {
        return e.json(401, { message: "Not authenticated" });
    }

    try {
        var workspaceId = e.request.pathValue("workspaceId");
        if (!workspaceId) {
            return e.json(400, { message: "workspaceId is required" });
        }

        // Access check: user must be owner or active member
        var ws;
        try {
            ws = e.app.findRecordById("WORKFLOW_workspaces", workspaceId);
        } catch(err) {
            return e.json(404, { message: "Workspace not found" });
        }

        var hasAccess = false;
        if (ws.get("owner") === e.auth.id) {
            hasAccess = true;
        } else {
            try {
                var members = e.app.findRecordsByFilter(
                    "WORKFLOW_workspace_members",
                    "workspace = {:ws} && user = {:u} && status = 'active'",
                    "", 1, 0,
                    { ws: workspaceId, u: e.auth.id }
                );
                if (members && members.length > 0) hasAccess = true;
            } catch(err) {}
        }
        if (!hasAccess) {
            return e.json(403, { message: "No access to this workspace" });
        }

        // Fetch all processes in workspace (only id, name, nodes needed)
        var processes = e.app.findRecordsByFilter(
            "WORKFLOW_processes",
            "workspace = {:ws}",
            "", 99999, 0,
            { ws: workspaceId }
        );

        // Build name map and extract links
        var nameMap = {};
        for (var i = 0; i < processes.length; i++) {
            nameMap[processes[i].id] = processes[i].get("name") || "Unnamed";
        }

        var links = [];
        for (var p = 0; p < processes.length; p++) {
            var proc = processes[p];
            var nodesStr = proc.getString("nodes");
            var nodes = [];
            try { nodes = typeof nodesStr === "string" && nodesStr ? JSON.parse(nodesStr) : []; } catch(err) {}
            
            var nodesArray = [];
            try { nodesArray = Array.from(nodes); } catch(err) { nodesArray = nodes || []; }

            for (var n = 0; n < nodesArray.length; n++) {
                var node = nodesArray[n];
                var data = node.data || {};
                if (data.targetWorkflowId && data.targetWorkflowId !== proc.id) {
                    links.push({
                        sourceProcessId: proc.id,
                        sourceProcessName: nameMap[proc.id],
                        targetProcessId: data.targetWorkflowId,
                        targetProcessName: nameMap[data.targetWorkflowId] || data.targetWorkflowName || "Unknown",
                        targetNodeLabel: data.targetNodeLabel || "",
                        linkType: node.type === "subworkflow" ? "subworkflow" : "handoff"
                    });
                }
            }
        }

        return e.json(200, { links: links });

    } catch (err) {
        return e.json(500, { message: "Error extracting process links: " + String(err.message || err) });
    }
});

// =====================================================
// ROUTE: POST /api/workspaces/join-by-code
// =====================================================
routerAdd("POST", "/api/workspaces/join-by-code", (e) => {
    if (!e.auth) {
        return e.json(401, { message: "Nie jesteś zalogowany / Not authenticated" });
    }

    try {
        const body = e.requestInfo().body || {};
        const code = (body.code || "").trim().toUpperCase();
        if (!code) {
            return e.json(400, { message: "Brak kodu / No code provided" });
        }

        const userId = e.auth.id;

        // Znajdź workspace po kodzie
        const workspaces = e.app.findRecordsByFilter(
            "WORKFLOW_workspaces",
            "join_code = {:code}",
            "", 1, 0,
            { code: code }
        );

        if (!workspaces || workspaces.length === 0) {
            return e.json(404, { message: "Nie znaleziono workspace o podanym kodzie. / Workspace with the given code not found." });
        }

        const ws = workspaces[0];
        const wsId = ws.id;

        // Sprawdź, czy uzytkownik jest juz czlonkiem lub wyslal zaproszenie
        const existing = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "workspace = {:ws} && user = {:user}",
            "", 1, 0,
            { ws: wsId, user: userId }
        );

        if (existing && existing.length > 0) {
            return e.json(400, { message: "Jesteś już członkiem tego workspace lub wysłałeś prośbę. / You are already a member or pending." });
        }

        // Sprawdź, czy uzytkownik jest wlascicielem
        if (ws.get("owner") === userId) {
            return e.json(400, { message: "Jesteś właścicielem tego workspace. / You are the owner of this workspace." });
        }

        // --- ENFORCE MEMBER TIER LIMITS ---
        try {
            const ownerId = ws.get("owner");
            const ownerRec = e.app.findRecordById("WORKFLOW_users", ownerId);
            let userTier = (ownerRec.get("tier") || "FREE").toUpperCase();
            let tierExpiry = ownerRec.get("tier_expires_at");
            if (userTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) {
                userTier = "FREE";
            }
            
            let maxMembers = 2; // FREE default
            const configs = e.app.findRecordsByFilter("WORKFLOW_tier_config", "tier = {:tier}", "", 1, 0, { tier: userTier });
            if (configs && configs.length > 0) {
                maxMembers = Number(configs[0].get("max_members_per_workspace")) || 2;
            }
            
            if (maxMembers < 999999) {
                const currentMembers = e.app.findRecordsByFilter("WORKFLOW_workspace_members", "workspace = {:ws} && status = 'active'", "", 5000, 0, { ws: wsId });
                const currentCount = currentMembers ? currentMembers.length : 0;
                if (currentCount >= maxMembers) {
                    return e.json(400, { message: "Workspace osiągnął limit aktywnych członków dla obecnego planu (" + maxMembers + "). / Workspace reached active member limit for current plan (" + maxMembers + ")." });
                }
            }
        } catch(err) {
            console.log("Error checking member limit in join-by-code: " + err);
        }

        // Utworz prosbe o dolaczenie (jako pending — wymaga zatwierdzenia przez ownera/admina)
        const collection = e.app.findCollectionByNameOrId("WORKFLOW_workspace_members");
        const newRecord = new Record(collection);
        newRecord.set("workspace", wsId);
        newRecord.set("user", userId);
        newRecord.set("role", "viewer");
        newRecord.set("status", "pending");
        e.app.save(newRecord);

        // Powiadomienie mailowe dla wlasciciela — prośba o zatwierdzenie
        try {
            const ownerId = ws.get("owner");
            if (ownerId && ownerId !== userId) {
                const owner = e.app.findRecordById("WORKFLOW_users", ownerId);
                const ownerEmail = owner.get("email");
                const joinedUser = e.app.findRecordById("WORKFLOW_users", userId);
                const joinedEmail = joinedUser.get("email");
                const joinedName = joinedUser.get("name") || joinedEmail;
                const wsName = ws.get("name") || "Workspace";

                if (ownerEmail) {
                    const escapeHtml = function(str) {
                        if (!str) return '';
                        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
                    };
                    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>'
                        + '<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,system-ui,-apple-system,sans-serif;">'
                        + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">'
                        + '<tr><td align="center">'
                        + '<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">'
                        + '<tr><td style="padding:36px 36px 20px;text-align:center;border-bottom:1px solid #f0f0f0;">'
                        + '<img src="https://gryf.ai/gryf-ai-logo.svg" alt="Gryf.ai" width="44" height="40" style="display:block;margin:0 auto 16px;" />'
                        + '<h1 style="margin:0;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">Prośba o dołączenie</h1>'
                        + '<p style="margin:2px 0 0;font-size:14px;color:#9ca3af;font-weight:500;">Join Request</p>'
                        + '<p style="margin:16px 0 0;font-size:14px;color:#6b7280;line-height:1.5;">Ktoś chce dołączyć do Twojego workspace używając kodu. Zaakceptuj go w panelu Członków.<br/><span style="color:#9ca3af;font-size:13px;display:block;margin-top:6px;">Someone wants to join your workspace using the join code. Approve them in the Members panel.</span></p>'
                        + '</td></tr>'
                        + '<tr><td style="padding:28px 36px;">'
                        + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #f0ede6;border-radius:12px;overflow:hidden;">'
                        + '<tr><td style="padding:18px 20px;border-bottom:1px solid #f0ede6;">'
                        + '<span style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;font-weight:600;">Workspace</span><br/>'
                        + '<span style="font-size:16px;font-weight:700;color:#1a1a1a;line-height:1.6;">' + escapeHtml(wsName) + '</span>'
                        + '</td></tr>'
                        + '<tr><td style="padding:18px 20px;">'
                        + '<span style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;font-weight:600;">Użytkownik / User</span><br/>'
                        + '<span style="font-size:16px;font-weight:700;color:#1a1a1a;line-height:1.6;">' + escapeHtml(joinedName) + '</span>'
                        + '<br/><span style="font-size:13px;color:#6b7280;">' + escapeHtml(joinedEmail) + '</span>'
                        + '</td></tr>'
                        + '</table>'
                        + '</td></tr>'
                        + '<tr><td style="padding:4px 36px 36px;text-align:center;">'
                        + '<a href="https://gryf.ai" style="display:inline-block;padding:14px 44px;background:#bc9b59;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">Zaakceptuj / Approve</a>'
                        + '</td></tr>'
                        + '<tr><td style="padding:20px 36px;border-top:1px solid #f0f0f0;text-align:center;background:#fafaf9;">'
                        + '<p style="margin:0;font-size:11px;color:#c4c4c4;">Ten email został wysłany automatycznie. / This email was sent automatically.</p>'
                        + '</td></tr>'
                        + '</table>'
                        + '</td></tr></table>'
                        + '</body></html>';

                    let message = new MailerMessage({
                        from: {
                            address: e.app.settings().meta.senderAddress,
                            name: e.app.settings().meta.senderName || "Gryf.ai"
                        },
                        to: [{ address: ownerEmail }],
                        subject: "Prośba o dołączenie / Join request — " + wsName,
                        html: html,
                    });

                    try {
                        e.app.newMailClient().send(message);
                    } catch (mailSendErr) {
                        console.log("Error sending join email: " + String(mailSendErr.message || mailSendErr));
                    }
                }

                // Powiadomienie w aplikacji dla ownera i wszystkich adminów
                try {
                    const notifCollection = e.app.findCollectionByNameOrId("WORKFLOW_notifications");
                    const title = "Prośba o dołączenie / Join request";
                    const message = `Użytkownik ${joinedName} prosi o dołączenie do obszaru roboczego "${wsName}". Zaakceptuj go w zakładce Członkowie. / User ${joinedName} requested to join workspace "${wsName}". Approve in Members tab.`;
                    
                    let notifyIds = [ownerId];
                    try {
                        let admins = e.app.findRecordsByFilter(
                            "WORKFLOW_workspace_members",
                            "workspace = {:ws} && role = 'admin' && status = 'active'",
                            "", 100, 0,
                            { ws: wsId }
                        );
                        if (admins) {
                            for (let i = 0; i < admins.length; i++) {
                                let adminUserId = admins[i].get("user");
                                if (adminUserId && notifyIds.indexOf(adminUserId) === -1) {
                                    notifyIds.push(adminUserId);
                                }
                            }
                        }
                    } catch(err) {}

                    for (let i = 0; i < notifyIds.length; i++) {
                        try {
                            const notifRecord = new Record(notifCollection);
                            notifRecord.set("user", notifyIds[i]);
                            notifRecord.set("title", title);
                            notifRecord.set("message", message);
                            notifRecord.set("type", "info");
                            notifRecord.set("isRead", false);
                            e.app.save(notifRecord);
                        } catch(err) {}
                    }
                } catch(notifErr) {
                    console.log("Error creating join request in-app notif: " + notifErr);
                }
            }
        } catch (mailErr) {
            console.log("Error sending join notification: " + mailErr);
        }

        return e.json(200, { success: true, workspaceId: wsId });
    } catch (err) {
        return e.json(500, { message: err.message || "Internal server error" });
    }
});

// =====================================================
// ROUTE: GET /api/workspaces/pending-invitations
// =====================================================
routerAdd("GET", "/api/workspaces/pending-invitations", (e) => {
    if (!e.auth) {
        return e.json(401, { message: "Nie jesteś zalogowany / Not authenticated" });
    }

    try {
        const memberships = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "user = {:userId} && status = 'pending'",
            "-created", 100, 0,
            { userId: e.auth.id }
        );

        let results = [];
        for (let i = 0; i < memberships.length; i++) {
            let m = memberships[i];
            let wsName = "Workspace";
            try {
                let ws = e.app.findRecordById("WORKFLOW_workspaces", m.get("workspace"));
                wsName = ws.get("name") || "Workspace";
            } catch(err) {}

            results.push({
                id: m.id,
                workspaceName: wsName
            });
        }
        return e.json(200, results);
    } catch(err) {
        return e.json(500, { message: err.message || "Internal server error" });
    }
});

// =====================================================
// HOOK: Cascade Delete for WORKFLOW_processes
// =====================================================
onRecordDeleteRequest((e) => {
    try {
        const processId = e.record.id;
        const workspaceId = e.record.get("workspace");
        const db = e.app.db();

        // 1. Delete versions & comments
        db.newQuery("DELETE FROM WORKFLOW_versions WHERE process = {:processId}").bind({ processId: processId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_comments WHERE process = {:processId}").bind({ processId: processId }).execute();

        // 2. Clean up SubworkflowLinks in siblings
        if (workspaceId) {
            const siblings = e.app.findRecordsByFilter(
                "WORKFLOW_processes",
                "workspace = {:workspace} && id != {:id}",
                "", 1000, 0,
                { workspace: workspaceId, id: processId }
            );

            if (siblings && siblings.length > 0) {
                for (let s = 0; s < siblings.length; s++) {
                    let proc = siblings[s];
                    let sNodesStr = proc.getString("nodes");
                    let sNodes = [];
                    try { sNodes = typeof sNodesStr === "string" && sNodesStr ? JSON.parse(sNodesStr) : []; } catch(err) { continue; }

                    let changed = false;
                    for (let n = 0; n < sNodes.length; n++) {
                        let node = sNodes[n];
                        if (node && node.data && node.data.targetWorkflowId === processId) {
                            node.data.targetWorkflowId = "";
                            node.data.targetWorkflowName = "";
                            node.data.targetNodeId = "";
                            node.data.targetNodeLabel = "";
                            changed = true;
                        }
                    }

                    if (changed) {
                        proc.set("nodes", JSON.stringify(sNodes));
                        e.app.save(proc);
                    }
                }
            }
        }
    } catch (err) {
        console.error("Cascade Delete Error: " + err);
    }
    
    e.next();
}, "WORKFLOW_processes");

// =====================================================
// HOOK: Cleanup orphaned comments when nodes are removed
// =====================================================
onRecordUpdateRequest((e) => {
    // Capture old node IDs BEFORE save (DB still has previous data)
    const processId = e.record.id;
    const oldNodeIds = {};
    try {
        const oldRecord = e.app.findRecordById("WORKFLOW_processes", processId);
        let oldNodesRaw = oldRecord.getString("nodes");
        let oldNodes = [];
        try { oldNodes = typeof oldNodesRaw === "string" && oldNodesRaw ? JSON.parse(oldNodesRaw) : []; } catch(pe) {}
        for (let i = 0; i < oldNodes.length; i++) {
            if (oldNodes[i] && oldNodes[i].id) oldNodeIds[oldNodes[i].id] = true;
        }
    } catch(err) {}

    e.next();

    // Get new node IDs AFTER save
    const newNodeIds = {};
    try {
        let newNodesRaw = e.record.getString("nodes");
        let newNodes = [];
        try { newNodes = typeof newNodesRaw === "string" && newNodesRaw ? JSON.parse(newNodesRaw) : []; } catch(pe) {}
        for (let i = 0; i < newNodes.length; i++) {
            if (newNodes[i] && newNodes[i].id) newNodeIds[newNodes[i].id] = true;
        }
    } catch(err) {}

    // Find removed node IDs and delete their orphaned comments
    const removedIds = [];
    for (const id in oldNodeIds) {
        if (!newNodeIds[id]) removedIds.push(id);
    }

    if (removedIds.length > 0) {
        try {
            const db = e.app.db();
            for (let i = 0; i < removedIds.length; i++) {
                db.newQuery("DELETE FROM WORKFLOW_comments WHERE process = {:processId} AND node_id = {:nodeId}")
                    .bind({ processId: processId, nodeId: removedIds[i] })
                    .execute();
            }
            console.log("Cleaned up orphaned comments for " + removedIds.length + " removed node(s) in process " + processId);
        } catch(err) {
            console.error("Error cleaning orphaned node comments: " + err);
        }
    }
}, "WORKFLOW_processes");

// =====================================================
// HOOK: Propagate Node Labels on WORKFLOW_processes Save
// =====================================================
onRecordUpdateRequest((e) => {
    e.next();
    try {
        const savedProcess = e.record;
        const savedId = savedProcess.id;
        const processName = savedProcess.get("name") || "";
        const workspaceId = savedProcess.get("workspace") || "";

        if (!workspaceId) return;

        let nodesStr = savedProcess.getString("nodes");
        let nodes = [];
        try { nodes = typeof nodesStr === "string" && nodesStr ? JSON.parse(nodesStr) : []; } catch(err) {}

        const nodeLabelsMap = {};
        for (let i = 0; i < nodes.length; i++) {
            let n = nodes[i];
            if (n && n.id && n.data && n.data.label) {
                nodeLabelsMap[n.id] = n.data.label;
            }
        }

        const siblings = e.app.findRecordsByFilter(
            "WORKFLOW_processes",
            "workspace = {:workspace} && id != {:id}",
            "", 1000, 0,
            { workspace: workspaceId, id: savedId }
        );

        if (siblings && siblings.length > 0) {
            for (let s = 0; s < siblings.length; s++) {
                let proc = siblings[s];
                let sNodesStr = proc.getString("nodes");
                let sNodes = [];
                try { sNodes = typeof sNodesStr === "string" && sNodesStr ? JSON.parse(sNodesStr) : []; } catch(err) { continue; }

                let changed = false;
                for (let n = 0; n < sNodes.length; n++) {
                    let node = sNodes[n];
                    if (node && node.data && node.data.targetWorkflowId === savedId) {
                        if (node.data.targetWorkflowName !== processName) {
                            node.data.targetWorkflowName = processName;
                            changed = true;
                        }
                        if (node.data.targetNodeId && nodeLabelsMap[node.data.targetNodeId]) {
                            let freshLabel = nodeLabelsMap[node.data.targetNodeId];
                            if (node.data.targetNodeLabel !== freshLabel) {
                                node.data.targetNodeLabel = freshLabel;
                                changed = true;
                            }
                        }
                    }
                }

                if (changed) {
                    proc.set("nodes", JSON.stringify(sNodes));
                    e.app.save(proc);
                }
            }
        }
    } catch (err) {
        console.error("Propagate Labels Error: " + err);
    }
}, "WORKFLOW_processes");

// =====================================================
// HOOK: Fast Server-Side Account Deletion
// =====================================================
routerAdd("POST", "/api/ai/delete-account", (e) => {
    try {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new Error("Unauthorized");
        }
        
        const userId = authRecord.id;
        const db = e.app.db();
        
        // 1. Delete user's comments and versions
        db.newQuery("DELETE FROM WORKFLOW_comments WHERE author = {:userId}").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_versions WHERE created_by = {:userId}").bind({ userId: userId }).execute();

        // 2. Clear locked_by & lastEditedBy
        db.newQuery("UPDATE WORKFLOW_processes SET locked_by = '', locked_at = '' WHERE locked_by = {:userId}").bind({ userId: userId }).execute();
        db.newQuery("UPDATE WORKFLOW_processes SET lastEditedBy = '' WHERE lastEditedBy = {:userId}").bind({ userId: userId }).execute();

        // 3. Transfer orphaned processes
        db.newQuery(`
            UPDATE WORKFLOW_processes 
            SET owner = (SELECT owner FROM WORKFLOW_workspaces WHERE id = WORKFLOW_processes.workspace)
            WHERE owner = {:userId}
        `).bind({ userId: userId }).execute();

        // 4. Delete memberships
        db.newQuery("DELETE FROM WORKFLOW_workspace_members WHERE user = {:userId} OR invited_by = {:userId}").bind({ userId: userId }).execute();

        // 5. Delete notifications for this user
        db.newQuery("DELETE FROM WORKFLOW_notifications WHERE user = {:userId}").bind({ userId: userId }).execute();

        // 6. Delete workspaces and all their related records
        db.newQuery("DELETE FROM WORKFLOW_versions WHERE process IN (SELECT id FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId}))").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_comments WHERE process IN (SELECT id FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId}))").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId})").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_process_map_layouts WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId})").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_process_groups WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId})").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_groups WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId})").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_workspace_members WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:userId})").bind({ userId: userId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_workspaces WHERE owner = {:userId}").bind({ userId: userId }).execute();

        // 6. Finally delete the user
        e.app.delete(authRecord);

        return e.json(200, { success: true });
    } catch (err) {
        return e.json(500, { message: err.message });
    }
});

// =====================================================
// HOOK: Auto-cleanup of unverified (abandoned) accounts
// =====================================================
cronAdd("cleanUnverifiedUsers", "0 0 * * *", () => {
    try {
        const app = $app;
        const date = new Date();
        date.setDate(date.getDate() - 1);
        const dateString = date.toISOString().replace("T", " ");
        
        // Znajdź użytkowników, którzy mają verified = false i zostali utworzeni ponad 24h temu
        const unverified = app.findRecordsByFilter(
            "WORKFLOW_users",
            "verified = false && created < {:date}",
            "-created",
            1000,
            0,
            { date: dateString }
        );
        
        const db = app.db();
        for (let i = 0; i < unverified.length; i++) {
            try {
                const uid = unverified[i].id;
                // Cascade-delete all related records before deleting the user
                db.newQuery("DELETE FROM WORKFLOW_comments WHERE author = {:uid}").bind({ uid: uid }).execute();
                db.newQuery("DELETE FROM WORKFLOW_versions WHERE created_by = {:uid}").bind({ uid: uid }).execute();
                db.newQuery("UPDATE WORKFLOW_processes SET locked_by = '', locked_at = '' WHERE locked_by = {:uid}").bind({ uid: uid }).execute();
                db.newQuery("UPDATE WORKFLOW_processes SET lastEditedBy = '' WHERE lastEditedBy = {:uid}").bind({ uid: uid }).execute();
                db.newQuery("DELETE FROM WORKFLOW_workspace_members WHERE user = {:uid} OR invited_by = {:uid}").bind({ uid: uid }).execute();
                db.newQuery("DELETE FROM WORKFLOW_notifications WHERE user = {:uid}").bind({ uid: uid }).execute();
                // Delete owned workspaces and their children
                db.newQuery("DELETE FROM WORKFLOW_versions WHERE process IN (SELECT id FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:uid}))").bind({ uid: uid }).execute();
                db.newQuery("DELETE FROM WORKFLOW_comments WHERE process IN (SELECT id FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:uid}))").bind({ uid: uid }).execute();
                db.newQuery("DELETE FROM WORKFLOW_processes WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:uid})").bind({ uid: uid }).execute();
                db.newQuery("DELETE FROM WORKFLOW_process_map_layouts WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:uid})").bind({ uid: uid }).execute();
                db.newQuery("DELETE FROM WORKFLOW_process_groups WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:uid})").bind({ uid: uid }).execute();
                db.newQuery("DELETE FROM WORKFLOW_groups WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:uid})").bind({ uid: uid }).execute();
                db.newQuery("DELETE FROM WORKFLOW_workspace_members WHERE workspace IN (SELECT id FROM WORKFLOW_workspaces WHERE owner = {:uid})").bind({ uid: uid }).execute();
                db.newQuery("DELETE FROM WORKFLOW_workspaces WHERE owner = {:uid}").bind({ uid: uid }).execute();
                app.delete(unverified[i]);
            } catch (delErr) {
                console.error("Failed to delete unverified user " + unverified[i].id + ":", delErr);
            }
        }
        console.log("Cleaned up " + unverified.length + " abandoned unverified accounts.");
    } catch (err) {
        console.error("Cron cleanUnverifiedUsers error:", err);
    }
});

// =====================================================
// CRON: cleanStaleLocks
// =====================================================
cronAdd("cleanStaleLocks", "*/5 * * * *", () => {
    try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const dateString = fiveMinAgo.toISOString().replace("T", " ");

        $app.db().newQuery("UPDATE WORKFLOW_processes SET locked_by = '', locked_at = '' WHERE locked_by != '' AND locked_at < {:date}")
            .bind({ date: dateString })
            .execute();
            
    } catch (err) {
        console.error("Cron cleanStaleLocks error:", err);
    }
});

onRecordUpdateRequest((e) => {
    const record = e.record;
    
    // Capture original values BEFORE e.next() saves to DB
    // Use findRecordById for compatibility with PocketBase v0.38 (record.original() may not be available)
    let originalStatus = record.get("status");
    let originalRole = record.get("role");
    try {
        const orig = e.app.findRecordById(record.collection().name, record.id);
        if (orig) {
            originalStatus = orig.get("status");
            originalRole = orig.get("role");
        }
    } catch(err) {}
    
    e.next();
    
    try {
        const userId = record.get("user");
        const wsId = record.get("workspace");
        if (!userId || !wsId) return;

        let wsName = "Workspace";
        try {
            let ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
            wsName = ws.get("name") || wsName;
        } catch(err) {}

        const notifCollection = e.app.findCollectionByNameOrId("WORKFLOW_notifications");

        // Status changed to active (Accepted invitation)
        if (originalStatus !== "active" && record.get("status") === "active") {
            const title = "Zaakceptowano zaproszenie / Invitation accepted";
            const message = `Dołączyłeś do obszaru roboczego "${wsName}". / You joined workspace "${wsName}".`;
            const notifRecord = new Record(notifCollection);
            notifRecord.set("user", userId);
            notifRecord.set("title", title);
            notifRecord.set("message", message);
            notifRecord.set("type", "success");
            notifRecord.set("isRead", false);
            e.app.save(notifRecord);
        }

        // Role changed
        if (originalStatus === "active" && record.get("status") === "active" && String(originalRole) !== String(record.get("role"))) {
            const oldRole = originalRole;
            const newRole = record.get("role");
            const title = "Zmiana roli / Role change";
            const message = `Twoja rola w "${wsName}" została zmieniona z ${oldRole} na ${newRole}. / Your role in "${wsName}" changed from ${oldRole} to ${newRole}.`;
            const notifRecord = new Record(notifCollection);
            notifRecord.set("user", userId);
            notifRecord.set("title", title);
            notifRecord.set("message", message);
            notifRecord.set("type", "info");
            notifRecord.set("isRead", false);
            e.app.save(notifRecord);
        }

    } catch(err) {
        console.log("Error handling member update notif: " + err);
    }
}, "WORKFLOW_workspace_members");

// =====================================================
// HOOK: Notifications for Workspace Deletion & Cleanup
// =====================================================
onRecordDeleteRequest((e) => {
    const ws = e.record;
    const wsId = ws.id;
    const wsName = ws.get("name") || "Workspace";
    const authRecord = e.auth;

    try {
        const db = e.app.db();
        
        // 1. Delete all related records for this workspace
        db.newQuery("DELETE FROM WORKFLOW_versions WHERE process IN (SELECT id FROM WORKFLOW_processes WHERE workspace = {:wsId})").bind({ wsId: wsId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_comments WHERE process IN (SELECT id FROM WORKFLOW_processes WHERE workspace = {:wsId})").bind({ wsId: wsId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_processes WHERE workspace = {:wsId}").bind({ wsId: wsId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_process_map_layouts WHERE workspace = {:wsId}").bind({ wsId: wsId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_process_groups WHERE workspace = {:wsId}").bind({ wsId: wsId }).execute();
        db.newQuery("DELETE FROM WORKFLOW_groups WHERE workspace = {:wsId}").bind({ wsId: wsId }).execute();
        
        // 2. Delete notifications for users in this workspace (cleanup orphaned notifs)
        // Note: we can't easily filter by workspace, so we delete notifs whose link references processes in this workspace
        // For simplicity, individual user notif cleanup happens in user delete hook

        // We fetch members to notify before deleting them
        const members = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "workspace = {:wsId} && status = 'active'",
            "", 5000, 0,
            { wsId: wsId }
        );

        // Now delete memberships
        db.newQuery("DELETE FROM WORKFLOW_workspace_members WHERE workspace = {:wsId}").bind({ wsId: wsId }).execute();

        let userIdsToNotify = Array.from(members).map(m => m.get("user")).filter(id => id);
        
        // Ensure the owner of the workspace is also notified
        const ownerId = ws.get("owner");
        if (ownerId && !userIdsToNotify.includes(ownerId)) {
            userIdsToNotify.push(ownerId);
        }

        let authorName = "Administrator";
        if (authRecord) {
            authorName = authRecord.get("name") || authRecord.get("email") || "Administrator";
        }

        const notifCollection = e.app.findCollectionByNameOrId("WORKFLOW_notifications");

        for (let i = 0; i < userIdsToNotify.length; i++) {
            const userId = userIdsToNotify[i];

            const notifRecord = new Record(notifCollection);
            notifRecord.set("user", userId);
            notifRecord.set("title", "Obszar roboczy usunięty / Workspace deleted");
            notifRecord.set("message", `Obszar roboczy "${wsName}" został usunięty przez ${authorName}. / Workspace "${wsName}" was deleted by ${authorName}.`);
            notifRecord.set("type", "warning");
            notifRecord.set("isRead", false);
            e.app.save(notifRecord);
        }
    } catch (err) {
        console.log("Error during workspace deletion & cleanup: " + err);
    }
    
    e.next();
}, "WORKFLOW_workspaces");

// =====================================================
// HOOK: Notifications for Process Deletion
// =====================================================
onRecordDeleteRequest((e) => {
    const process = e.record;
    const processName = process.get("name") || "Proces";
    const wsId = process.get("workspace");
    if (!wsId) return e.next();

    try {
        let wsName = "Workspace";
        try {
            let ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
            wsName = ws.get("name") || wsName;
        } catch(err) {}

        const members = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "workspace = {:wsId} && status = 'active'",
            "", 5000, 0,
            { wsId: wsId }
        );

        let userIdsToNotify = Array.from(members).map(m => m.get("user")).filter(id => id);

        // Ensure the owner of the workspace is also notified
        let wsOwnerId = null;
        try {
            let ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
            wsOwnerId = ws.get("owner");
        } catch(err) {}

        if (wsOwnerId && !userIdsToNotify.includes(wsOwnerId)) {
            userIdsToNotify.push(wsOwnerId);
        }

        let authorName = "Administrator";
        if (e.auth) {
            authorName = e.auth.get("name") || e.auth.get("email") || "Administrator";
        }

        const notifCollection = e.app.findCollectionByNameOrId("WORKFLOW_notifications");

        for (let i = 0; i < userIdsToNotify.length; i++) {
            const userId = userIdsToNotify[i];

            // if (e.auth && e.auth.id === userId) continue;

            const notifRecord = new Record(notifCollection);
            notifRecord.set("user", userId);
            notifRecord.set("title", "Proces usunięty / Process deleted");
            notifRecord.set("message", `Proces "${processName}" w zespole "${wsName}" został usunięty przez ${authorName}. / Process "${processName}" in "${wsName}" was deleted by ${authorName}.`);
            notifRecord.set("type", "warning");
            notifRecord.set("isRead", false);
            e.app.save(notifRecord);
        }
    } catch (err) {
        console.log("Error creating process deletion notifs: " + err);
    }
    
    e.next();
}, "WORKFLOW_processes");

// =====================================================
// HOOK: Secure WORKFLOW_groups (Update & Delete)
// =====================================================
onRecordUpdateRequest((e) => {
    if (typeof e.hasSuperuserAuth === "function" && e.hasSuperuserAuth()) return e.next();
    const wsId = e.record.get("workspace");
    if (!wsId || !e.auth) throw new Error("Unauthorized");
    try {
        const ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
        if (ws.get("owner") === e.auth.id) return e.next();
        
        const adminsOrEditors = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "workspace = {:wsId} && user = {:userId} && status = 'active' && (role = 'admin' || role = 'editor')",
            "", 1, 0, { wsId: wsId, userId: e.auth.id }
        );
        if (adminsOrEditors && adminsOrEditors.length > 0) return e.next();
    } catch(err) {}
    throw new BadRequestError("Tylko admin lub edytor może edytować grupy. / Only admin or editor can edit groups.");
}, "WORKFLOW_groups");

onRecordDeleteRequest((e) => {
    if (typeof e.hasSuperuserAuth === "function" && e.hasSuperuserAuth()) return e.next();
    const wsId = e.record.get("workspace");
    if (!wsId || !e.auth) throw new BadRequestError("Unauthorized");
    try {
        const ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
        if (ws.get("owner") === e.auth.id) return e.next();
        
        const admins = e.app.findRecordsByFilter(
            "WORKFLOW_workspace_members",
            "workspace = {:wsId} && user = {:userId} && status = 'active' && role = 'admin'",
            "", 1, 0, { wsId: wsId, userId: e.auth.id }
        );
        if (admins && admins.length > 0) return e.next();
    } catch(err) {}
    throw new BadRequestError("Tylko admin może usuwać grupy. / Only admin can delete groups.");
}, "WORKFLOW_groups");

// =====================================================
// HOOK: Secure WORKFLOW_users (Prevent self-upgrade)
// =====================================================
onRecordUpdateRequest((e) => {
    // Allow superusers to bypass this check
    if (typeof e.hasSuperuserAuth === "function" && e.hasSuperuserAuth()) {
        return e.next();
    }

    const original = e.app.findRecordById(e.record.collection().name, e.record.id);
    const record = e.record;
    
    if (original && record) {
        if (String(original.get("tier")) !== String(record.get("tier")) || 
            String(original.get("tier_expires_at")) !== String(record.get("tier_expires_at")) ||
            String(original.get("role")) !== String(record.get("role"))) {
            throw new BadRequestError("Nie możesz samodzielnie modyfikować swojego planu / ról. / You cannot modify your own plan or roles.");
        }
    }
    return e.next();
}, "WORKFLOW_users");

// =====================================================
// HOOK: Strip sensitive fields from WORKFLOW_users
// Prevents User A from reading User B's ai_api_key etc.
// Keeps expand (comment authors, lock info) working.
// =====================================================


onRecordViewRequest((e) => {
    e.next();
    try {
        var authId = e.auth ? e.auth.id : "";
        var SENSITIVE_USER_FIELDS = ["ai_api_key", "ai_provider", "ai_model", "ai_temperature", "ai_custom_memory", "ai_source"];
        var stripSensitiveFields = function(record, authId) {
            if (!record || record.id === authId) return;
            for (var i = 0; i < SENSITIVE_USER_FIELDS.length; i++) {
                record.set(SENSITIVE_USER_FIELDS[i], "");
            }
        };
        stripSensitiveFields(e.record, authId);
    } catch(err) {}
}, "WORKFLOW_users");

onRecordsListRequest((e) => {
    e.next();
    try {
        var authId = e.auth ? e.auth.id : "";
        var SENSITIVE_USER_FIELDS = ["ai_api_key", "ai_provider", "ai_model", "ai_temperature", "ai_custom_memory", "ai_source"];
        var stripSensitiveFields = function(record, authId) {
            if (!record || record.id === authId) return;
            for (var i = 0; i < SENSITIVE_USER_FIELDS.length; i++) {
                record.set(SENSITIVE_USER_FIELDS[i], "");
            }
        };
        if (e.records && e.records.length) {
            for (var i = 0; i < e.records.length; i++) {
                stripSensitiveFields(e.records[i], authId);
            }
        }
    } catch(err) {}
}, "WORKFLOW_users");


// =====================================================
// HOOK: Enforce Workspace Tier Limits (Added to seal the loophole)
// =====================================================
onRecordCreateRequest(function(e) {
    var authRecord = e.auth;
    if (!authRecord) return e.next();
    var ownerId = e.record.get('owner');
    if (!ownerId) return e.next();
    var userTier = (authRecord.get('tier') || 'FREE').toUpperCase();
    var tierExpiry = authRecord.get('tier_expires_at');
    if (userTier !== 'FREE' && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) {
        userTier = 'FREE';
    }
    var maxWorkspaces = 1;
    try {
        var configs = e.app.findRecordsByFilter('WORKFLOW_tier_config', 'tier = {:tier}', '', 1, 0, { tier: userTier });
        if (configs && configs.length > 0) {
            maxWorkspaces = Number(configs[0].get('max_workspaces')) || 1;
        }
    } catch(err) {}
    if (maxWorkspaces < 999999) {
        try {
            var db = e.app.db();
            var wRows = arrayOf(new DynamicModel({ cnt: 0 }));
            db.newQuery("SELECT COUNT(DISTINCT id) as cnt FROM WORKFLOW_workspaces WHERE owner = {:owner} OR id IN (SELECT workspace FROM WORKFLOW_workspace_members WHERE user = {:owner} AND status = 'active')").bind({ owner: ownerId }).all(wRows);
            var currentCount = wRows.length > 0 ? wRows[0].cnt : 0;
            if (currentCount >= maxWorkspaces) {
                throw new BadRequestError('Limit obszarów roboczych (' + maxWorkspaces + ') został osiągnięty. / Workspace limit (' + maxWorkspaces + ') reached.');
            }
        } catch(err) { throw err; }
    }
    return e.next();
}, 'WORKFLOW_workspaces');
// =====================================================
// HOOK: Enforce Folder Tier Limits
// =====================================================
onRecordCreateRequest(function(e) {
    var wsId = e.record.get("workspace");
    if (!wsId) return e.next();
    try {
        var ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
        var ownerId = ws.get("owner");
        var ownerRec = e.app.findRecordById("WORKFLOW_users", ownerId);
        var userTier = (ownerRec.get("tier") || "FREE").toUpperCase();
        var tierExpiry = ownerRec.get("tier_expires_at");
        if (userTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) userTier = "FREE";
        var maxGroups = 2;
        var configs = e.app.findRecordsByFilter("WORKFLOW_tier_config", "tier = {:tier}", "", 1, 0, { tier: userTier });
        if (configs && configs.length > 0) maxGroups = Number(configs[0].get("max_groups_per_workspace")) || 2;
        if (maxGroups < 999999) {
            var db = e.app.db();
            var wRows = arrayOf(new DynamicModel({ cnt: 0 }));
            db.newQuery("SELECT COUNT(*) as cnt FROM WORKFLOW_process_groups WHERE workspace = {:ws}").bind({ ws: wsId }).all(wRows);
            var currentCount = wRows.length > 0 ? wRows[0].cnt : 0;
            if (currentCount >= maxGroups) throw new BadRequestError("Limit folderow (" + maxGroups + ") osiagniety. / Folders limit reached.");
        }
    } catch(err) { throw err; }
    return e.next();
}, "WORKFLOW_process_groups");

// =====================================================
// HOOK: Enforce Comments Tier Limits
// =====================================================
onRecordCreateRequest(function(e) {
    var processId = e.record.get("process");
    if (!processId) return e.next();
    try {
        var proc = e.app.findRecordById("WORKFLOW_processes", processId);
        var wsId = proc.get("workspace");
        var ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
        var ownerId = ws.get("owner");
        var ownerRec = e.app.findRecordById("WORKFLOW_users", ownerId);
        var userTier = (ownerRec.get("tier") || "FREE").toUpperCase();
        var tierExpiry = ownerRec.get("tier_expires_at");
        if (userTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) userTier = "FREE";
        var maxComments = 10;
        var configs = e.app.findRecordsByFilter("WORKFLOW_tier_config", "tier = {:tier}", "", 1, 0, { tier: userTier });
        if (configs && configs.length > 0) maxComments = Number(configs[0].get("max_comments_per_process")) || 10;
        if (maxComments < 999999) {
            var db = e.app.db();
            var wRows = arrayOf(new DynamicModel({ cnt: 0 }));
            db.newQuery("SELECT COUNT(*) as cnt FROM WORKFLOW_comments WHERE process = {:proc}").bind({ proc: processId }).all(wRows);
            var currentCount = wRows.length > 0 ? wRows[0].cnt : 0;
            if (currentCount >= maxComments) throw new BadRequestError("Limit komentarzy (" + maxComments + ") osiagniety. / Comments limit reached.");
        }
    } catch(err) { throw err; }
    return e.next();
}, "WORKFLOW_comments");

// =====================================================
// HOOK: Enforce Versions Tier Limits
// =====================================================
onRecordCreateRequest(function(e) {
    var processId = e.record.get("process");
    if (!processId) return e.next();
    try {
        var proc = e.app.findRecordById("WORKFLOW_processes", processId);
        var wsId = proc.get("workspace");
        var ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
        var ownerId = ws.get("owner");
        var ownerRec = e.app.findRecordById("WORKFLOW_users", ownerId);
        var userTier = (ownerRec.get("tier") || "FREE").toUpperCase();
        var tierExpiry = ownerRec.get("tier_expires_at");
        if (userTier !== "FREE" && tierExpiry && new Date(tierExpiry).getTime() <= Date.now()) userTier = "FREE";
        var maxVersions = 5;
        var configs = e.app.findRecordsByFilter("WORKFLOW_tier_config", "tier = {:tier}", "", 1, 0, { tier: userTier });
        if (configs && configs.length > 0) maxVersions = Number(configs[0].get("max_versions_per_process")) || 5;
        if (maxVersions < 999999) {
            var db = e.app.db();
            var wRows = arrayOf(new DynamicModel({ cnt: 0 }));
            db.newQuery("SELECT COUNT(*) as cnt FROM WORKFLOW_versions WHERE process = {:proc}").bind({ proc: processId }).all(wRows);
            var currentCount = wRows.length > 0 ? wRows[0].cnt : 0;
            if (currentCount >= maxVersions) throw new BadRequestError("Limit wersji (" + maxVersions + ") osiagniety. / Versions limit reached.");
        }
    } catch(err) { throw err; }
    return e.next();
}, "WORKFLOW_versions");


// Removed onAfterBootstrap hook as it was causing a ReferenceError in this version of PocketBase.

// =====================================================
// HOOK: Notifications for new comments
// =====================================================
onRecordCreateRequest((e) => {
    e.next();
    
    try {
        const comment = e.record;
        const authorId = comment.get("author");
        const processId = comment.get("process");
        const parentId = comment.get("parent_id");
        const nodeId = comment.get("node_id");
        
        let processName = "Proces";
        let nodeName = "";
        let proc = null;
        try {
            proc = e.app.findRecordById("WORKFLOW_processes", processId);
            processName = proc.get("name") || processName;
            
            // Pobierz nazwę węzła z JSON-a nodes (wzorzec z Propagate Node Labels hook)
            if (nodeId) {
                let nodesStr = proc.getString("nodes");
                let nodes = [];
                try {
                    nodes = nodesStr ? JSON.parse(nodesStr) : [];
                    // Podwójnie zakodowany JSON
                    while (typeof nodes === "string") {
                        nodes = JSON.parse(nodes);
                    }
                } catch(pe) {
                    console.error("COMMENT NOTIF v4: parse error:", pe);
                    nodes = [];
                }
                
                if (nodes && nodes.length) {
                    for (let n = 0; n < nodes.length; n++) {
                        let nd = nodes[n];
                        if (nd && nd.id === nodeId) {
                            var d = nd.data || {};
                            nodeName = d.label || d.title || nd.type || d.type || nodeId;
                            break;
                        }
                    }
                }

            }
        } catch(err) {
            console.error("COMMENT NOTIF: Error fetching process/node info:", err);
        }
        
        // Buduj czytelny opis lokalizacji komentarza
        let locationPl = "w procesie \"" + processName + "\"";
        let locationEn = "in process \"" + processName + "\"";
        if (nodeName) {
            locationPl = "na wezle \"" + nodeName + "\" w procesie \"" + processName + "\"";
            locationEn = "on node \"" + nodeName + "\" in process \"" + processName + "\"";
        }
        
        // Link do procesu z parametrem węzła
        var notifLink = "/app/" + processId;
        if (nodeId) notifLink += "?node=" + nodeId;
        
        const notifCollection = e.app.findCollectionByNameOrId("WORKFLOW_notifications");

        if (!parentId) {
            // Główny komentarz - powiadom członków workspace
            let wsId = null;
            if (proc) wsId = proc.get("workspace");
            
            let userIdsToNotify = [];
            
            if (wsId) {
                try {
                    const members = e.app.findRecordsByFilter(
                        "WORKFLOW_workspace_members",
                        "workspace = {:wsId} && status = 'active'",
                        "", 5000, 0,
                        { wsId: wsId }
                    );
                    userIdsToNotify = Array.from(members).map(m => m.get("user")).filter(id => id && id !== authorId);
                } catch(err) {}
                
                // Dodaj też właściciela workspace jeśli nie jest autorem komentarza
                try {
                    const ws = e.app.findRecordById("WORKFLOW_workspaces", wsId);
                    const wsOwner = ws.get("owner");
                    if (wsOwner && wsOwner !== authorId && userIdsToNotify.indexOf(wsOwner) === -1) {
                        userIdsToNotify.push(wsOwner);
                    }
                } catch(err) {}
            } else if (proc) {
                const procOwner = proc.get("owner");
                if (procOwner && procOwner !== authorId) {
                    userIdsToNotify.push(procOwner);
                }
            }
            
            for (let i = 0; i < userIdsToNotify.length; i++) {
                try {
                    const notifRecord = new Record(notifCollection);
                    notifRecord.set("user", userIdsToNotify[i]);
                    notifRecord.set("title", "Nowy komentarz / New Comment");
                    let commentMsgPl = "Dodano komentarz w procesie <strong>" + processName + "</strong>";
                    let commentMsgEn = "A comment was added in process <strong>" + processName + "</strong>";
                    if (nodeName) {
                        commentMsgPl = "Dodano komentarz na węźle <strong>" + nodeName + "</strong> w procesie <strong>" + processName + "</strong>";
                        commentMsgEn = "A comment was added on node <strong>" + nodeName + "</strong> in process <strong>" + processName + "</strong>";
                    }
                    notifRecord.set("message", commentMsgPl + " / " + commentMsgEn);
                    notifRecord.set("type", "info");
                    notifRecord.set("isRead", false);
                    notifRecord.set("link", notifLink);
                    e.app.save(notifRecord);
                } catch(err) {}
            }
            
        } else {
            // Odpowiedź na komentarz - powiadom wszystkich autorów w wątku
            try {
                // Zbierz unikalnych autorów: autor rodzica + autorzy wszystkich odpowiedzi w wątku
                var threadAuthors = {};

                // 1. Autor komentarza-rodzica
                const parentComment = e.app.findRecordById("WORKFLOW_comments", parentId);
                const parentAuthor = parentComment.get("author");
                if (parentAuthor && parentAuthor !== authorId) {
                    threadAuthors[parentAuthor] = true;
                }

                // 2. Autorzy wszystkich odpowiedzi w tym wątku (rodzeństwo)
                try {
                    const siblings = e.app.findRecordsByFilter(
                        "WORKFLOW_comments",
                        "parent_id = {:parentId}",
                        "", 5000, 0,
                        { parentId: parentId }
                    );
                    for (let s = 0; s < siblings.length; s++) {
                        const sibAuthor = siblings[s].get("author");
                        if (sibAuthor && sibAuthor !== authorId) {
                            threadAuthors[sibAuthor] = true;
                        }
                    }
                } catch(err) {}

                // Wyślij powiadomienia do wszystkich unikalnych autorów w wątku
                var authorsToNotify = Object.keys(threadAuthors);
                for (let a = 0; a < authorsToNotify.length; a++) {
                    try {
                        const notifRecord = new Record(notifCollection);
                        notifRecord.set("user", authorsToNotify[a]);
                        notifRecord.set("title", "Nowa odpowiedz / New Reply");
                        let replyMsgPl = "Odpowiedziano na komentarz w procesie <strong>" + processName + "</strong>";
                        let replyMsgEn = "Someone replied in a comment thread in process <strong>" + processName + "</strong>";
                        if (nodeName) {
                            replyMsgPl = "Odpowiedziano na komentarz na węźle <strong>" + nodeName + "</strong> w procesie <strong>" + processName + "</strong>";
                            replyMsgEn = "Someone replied in a comment thread on node <strong>" + nodeName + "</strong> in process <strong>" + processName + "</strong>";
                        }
                        notifRecord.set("message", replyMsgPl + " / " + replyMsgEn);
                        notifRecord.set("type", "info");
                        notifRecord.set("isRead", false);
                        notifRecord.set("link", notifLink);
                        e.app.save(notifRecord);
                    } catch(err) {}
                }
            } catch(err) {}
        }
    } catch (err) {
        console.error("Error sending comment notifications: " + err);
    }
}, "WORKFLOW_comments");

// =====================================================
// ROUTE: POST /api/confirm-email-change
// Custom endpoint for MagicLink (OTP) users who have no password.
// PocketBase's built-in confirmEmailChange requires a password,
// so we decode the JWT token server-side and update the email directly.
// =====================================================
routerAdd("POST", "/api/confirm-email-change", (e) => {
    try {
        const data = e.requestInfo().body || {};
        const token = data.token || "";

        if (!token) {
            return e.json(400, { message: "Token is required." });
        }

        // Decode the JWT token to extract claims
        // PocketBase email change tokens contain: id, collectionId, email, newEmail, type, exp
        let claims;
        try {
            const parts = token.split(".");
            if (parts.length !== 3) {
                throw new Error("Invalid token format");
            }
            let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            while (payload.length % 4 !== 0) payload += "=";
            
            // Custom base64 decode since atob() might not be available in Goja
            const b64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            let decodedBytes = [];
            payload = payload.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            for (let i = 0; i < payload.length;) {
                let enc1 = b64chars.indexOf(payload.charAt(i++));
                let enc2 = b64chars.indexOf(payload.charAt(i++));
                let enc3 = b64chars.indexOf(payload.charAt(i++));
                let enc4 = b64chars.indexOf(payload.charAt(i++));
                let chr1 = (enc1 << 2) | (enc2 >> 4);
                let chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                let chr3 = ((enc3 & 3) << 6) | enc4;
                decodedBytes.push(chr1);
                if (enc3 !== 64 && enc3 !== -1) decodedBytes.push(chr2);
                if (enc4 !== 64 && enc4 !== -1) decodedBytes.push(chr3);
            }
            // Simple utf8 decode
            let decodedStr = "";
            for (let i = 0; i < decodedBytes.length; i++) {
                decodedStr += String.fromCharCode(decodedBytes[i]);
            }
            // Handle UTF-8 encoding
            let finalDecoded = decodedStr;
            try { finalDecoded = decodeURIComponent(escape(decodedStr)); } catch(decErr) {}
            
            claims = JSON.parse(finalDecoded);
        } catch (err) {
            return e.json(400, { message: "Invalid or malformed token." });
        }

        // Validate token type
        if (claims.type !== "emailChange") {
            return e.json(400, { message: "Invalid token type." });
        }

        // Check expiration
        if (claims.exp && claims.exp * 1000 < Date.now()) {
            return e.json(400, { message: "Token has expired." });
        }

        // Extract user ID and new email
        const userId = claims.id || "";
        const newEmail = claims.newEmail || "";

        if (!userId || !newEmail) {
            return e.json(400, { message: "Token is missing required fields." });
        }

        // Find the user
        let user;
        try {
            user = e.app.findRecordById("WORKFLOW_users", userId);
        } catch (err) {
            return e.json(404, { message: "User not found." });
        }

        // Verify the token was issued for the correct current email
        const currentEmail = user.getString("email");
        if (claims.email && claims.email.toLowerCase() !== currentEmail.toLowerCase()) {
            return e.json(400, { message: "Token does not match current email." });
        }

        // Verify the full JWT signature using PocketBase's built-in method
        // This ensures the token was actually signed by this PocketBase instance
        try {
            e.app.findAuthRecordByToken(token, "emailChange");
        } catch (err) {
            return e.json(400, { message: "Invalid or expired token signature." });
        }

        // Update the email
        user.set("email", newEmail.toLowerCase());
        user.set("verified", true);
        e.app.save(user);

        return e.json(200, { success: true, message: "Email changed successfully." });
    } catch (err) {
        console.error("Confirm email change error:", err);
        return e.json(400, { message: "Failed to confirm email change: " + String(err.message || err) });
    }
});

