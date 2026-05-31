import { pb } from './pocketbase';


const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolFromCatalog {
  id: string;
  name: string;
  shortDesc: string;
  fullDesc: string;
  url: string;
  videoUrl: string;
  logoUrl: string;
  tags: string[];
}

// ===== BYOK AI config (per user) =====

export interface AiUserConfig {
  provider: 'openai' | 'openrouter';
  hasKey: boolean;
  model: string;
  temperature: number;
  memoryLength?: number;
}

/**
 * Client-side config fetch — never returns the API key itself.
 * The actual key is only used server-side in pb_hooks.
 */
export async function getAiUserConfig(userId: string): Promise<AiUserConfig | null> {
  if (!userId) return null;
  try {
    const userRecord = await pb.collection('WORKFLOW_users').getOne(userId, {
      fields: 'id,ai_provider,ai_model,ai_temperature,ai_custom_memory',
      requestKey: null,
    });

    // Check key existence via server-side endpoint
    let hasKey = false;
    try {
      const keyCheck = await pb.send('/api/ai/check-key', { method: 'POST', requestKey: null });
      hasKey = !!keyCheck?.hasKey;
    } catch (err) {
      console.warn('[AI Service] AI Key verification error:', err);
      // If endpoint fails, assume no key
    }

    return {
      provider: (userRecord.ai_provider === 'openrouter' ? 'openrouter' : 'openai') as 'openai' | 'openrouter',
      hasKey,
      model: userRecord.ai_model || 'gpt-4o-mini',
      temperature: userRecord.ai_provider ? (userRecord.ai_temperature ?? 0.7) : 0.7,
      memoryLength: userRecord.ai_custom_memory ? Number(userRecord.ai_custom_memory) : undefined,
    };
  } catch (err) {
    console.error('Failed to fetch user configuration:', err);
    return null;
  }
}



// ===== AI Model Catalog =====

export interface AiModelOption {
  id: string;
  label: string;
  modelId: string;
  provider: 'openai' | 'openrouter';
}

let cachedModels: AiModelOption[] | null = null;
let modelsCacheTimestamp = 0;

/**
 * Fetches available AI models from the database.
 * Results are cached for 5 minutes (CACHE_TTL).
 * 
 * @param provider - Optional provider to filter by (e.g., 'openai' or 'openrouter')
 * @returns An array of AI models configured in the system
 */
export async function fetchAiModels(provider?: 'openai' | 'openrouter'): Promise<AiModelOption[]> {
  const now = Date.now();
  if (cachedModels && (now - modelsCacheTimestamp) < CACHE_TTL) {
    return provider ? cachedModels.filter(m => m.provider === provider) : cachedModels;
  }
  try {
    const records = await pb.collection('WORKFLOW_ai_models').getFullList({
      filter: 'active = true',
      sort: 'sort_order',
      requestKey: null,
    });
    cachedModels = records.map((r) => ({
      id: r.id,
      label: r.label || r.model_id,
      modelId: r.model_id,
      provider: r.provider as 'openai' | 'openrouter',
    }));
    modelsCacheTimestamp = now;
    return provider ? cachedModels.filter(m => m.provider === provider) : cachedModels;
  } catch {
    return [];
  }
}

// ===== Quick Prompts from DB =====

export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
  label_en?: string;
  prompt_en?: string;
  context: 'workflow' | 'article' | 'general';
}

let cachedQuickPrompts: QuickPrompt[] | null = null;
let qpCacheTimestamp = 0;

/**
 * Fetches quick prompts configured in the database.
 * Results are cached to minimize database calls.
 * 
 * @param context - The UI context to filter prompts by (default: 'workflow')
 * @returns Array of quick prompt objects
 */
export async function fetchQuickPrompts(context: string = 'workflow'): Promise<QuickPrompt[]> {
  const now = Date.now();
  if (cachedQuickPrompts && (now - qpCacheTimestamp) < CACHE_TTL) {
    return cachedQuickPrompts.filter(qp => qp.context === context);
  }
  try {
    const records = await pb.collection('WORKFLOW_quick_prompts').getFullList({
      filter: 'active = true',
      sort: 'sort_order',
      requestKey: null,
    });
    cachedQuickPrompts = records.map((r: { id: string; label?: string; prompt?: string; label_en?: string; prompt_en?: string; context?: string }) => ({
      id: r.id,
      label: r.label || '',
      prompt: r.prompt || '',
      label_en: r.label_en || '',
      prompt_en: r.prompt_en || '',
      context: (r.context || 'workflow') as 'article' | 'workflow' | 'general',
    }));
    qpCacheTimestamp = now;
    return cachedQuickPrompts!.filter(qp => qp.context === context);
  } catch {
    return [];
  }
}

// ===== Tools from KATALOG_NARZEDZI =====

let cachedTools: ToolFromCatalog[] | null = null;
let toolsCacheTimestamp = 0;

/**
 * Fetches the tool catalog from the database for the UI carousel.
 */
export async function fetchAllTools(): Promise<ToolFromCatalog[]> {
  const now = Date.now();
  if (cachedTools && (now - toolsCacheTimestamp) < CACHE_TTL) {
    return cachedTools;
  }
  try {
    const records = await pb.collection('KATALOG_NARZEDZI').getFullList({
      sort: 'NAZWA',
      requestKey: null,
    });
    cachedTools = records.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      name: String(r.NAZWA || 'Unknown tool'),
      shortDesc: String(r.OPIS || ''),
      fullDesc: String(r.OPIS_PELNY || ''),
      url: String(r.URL || ''),
      videoUrl: String(r.url_film || ''),
      logoUrl: r.logo ? pb.files.getUrl(r as unknown as import('pocketbase').RecordModel, String(r.logo)) : '',
      tags: (r.tags as string[]) || [],
    }));
    toolsCacheTimestamp = now;
    return cachedTools;
  } catch (err) {
    if (err instanceof Error && !(err as Error & { isAbort?: boolean }).isAbort) {
      const is404 = (err as { status?: number }).status === 404;
      if (!is404) {
        console.warn('[AI Service] Error fetching tools from KATALOG_NARZEDZI:', err);
        throw err;
      }
    }
    return [];
  }
}

// ===== AI Chat via Backend Proxy =====

export interface AiContextData {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  toolNames: string[];
  lang: string;
  latestMessage: string;
}

/**
 * Sends a chat message sequence to the backend proxy for AI generation.
 * The backend securely manages the API key, provider routing, system prompt injection, and RAG.
 * 
 * @param workspaceId - The current workspace ID (for limits checking and logging)
 * @param messages - Array of user and assistant chat messages
 * @param contextData - Context payload injected into system prompt on the backend
 * @returns The AI's text response
 * @throws Error if the API request fails
 */
export async function sendChatMessage(
  workspaceId: string,
  messages: ChatMessage[],
  contextData: AiContextData,
  signal?: AbortSignal
): Promise<string> {
  try {
    const data = await pb.send('/api/ai/chat', {
      method: 'POST',
      body: {
        workspaceId,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        contextData,
      },
      requestKey: null,
      fetchOptions: signal ? { signal } : undefined,
    });
    
    return data.response || 'No response.';
  } catch (err) {
    const errorObj = err as { response?: { message?: string }, data?: { message?: string } };
    const backendMsg = errorObj.response?.message || errorObj.data?.message;
    if (backendMsg) {
      throw new Error(backendMsg, { cause: err });
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(errorMsg, { cause: err });
  }
}

