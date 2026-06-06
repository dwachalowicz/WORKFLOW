 
 
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { X, Send, Loader2, RotateCcw, ExternalLink, ChevronLeft, ChevronRight, ArrowLeft, Download, Maximize2, Minimize2, Star } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAvatarUrl, pb, type WorkflowUser } from '@/lib/pocketbase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  sendChatMessage,
  fetchAllTools, fetchQuickPrompts, type ToolFromCatalog, type QuickPrompt 
} from '@/lib/aiService';
import { getTierLimits, getTierLabel } from '@/lib/tierLimits';

import { SidePanel } from '@/components/ui/side-panel';
import { SimpleTooltip } from '@/components/ui/tooltip';
const MotionSidePanel = motion.create(SidePanel);
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/store/toastStore';
import { useUiStore } from "@/store/uiStore";
import { useCanvasStore } from "@/store/canvasStore";
import type { Node, Edge } from '@xyflow/react';

const UserAvatar = ({ user, className }: { user: WorkflowUser | null, className?: string }) => {
  const { t } = useTranslation();
  const [error, setError] = useState(false);
  return (
    <div className={`rounded-full bg-secondary overflow-hidden shrink-0 ${className || 'w-6 h-6 mt-0.5'}`}>
      {user?.avatar && !error ? (
        <img loading="lazy" src={getAvatarUrl(user)} alt={t('aiExt.altYou')} className="w-full h-full object-cover" onError={() => setError(true)} />
      ) : (
        <div className="w-full h-full bg-brand-gold/20 flex items-center justify-center text-[10px] font-bold text-brand-gold">{user?.name?.[0] || 'U'}</div>
      )}
    </div>
  );
};

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  displayContent?: string;
  toolNames?: string[];
  workflowJson?: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] };
  workflowUpdate?: { updates: { id: string; data: Record<string, unknown> }[] };
  jsonParseError?: boolean;
}



function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const CARD_COLORS = [
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-green-600',
  'from-red-500 to-orange-600',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-cyan-600',
];

// ── AI Security: whitelist + sanitization ──────────────────────────────
const ALLOWED_NODE_TYPES = new Set(['simple', 'startstop', 'database', 'subworkflow', 'note', 'gateway']);
const MAX_AI_NODES = 50;
const MAX_AI_EDGES = 100;

/** Keys that AI is NEVER allowed to set on node.data */
const BLOCKED_DATA_KEYS = new Set([
  'editors', 'readers', 'owner', 'workspace',
  '__proto__', 'constructor', 'prototype',
]);

/** Whitelist of data keys AI can set via workflow-update */
const SAFE_UPDATE_KEYS = new Set([
  'label', 'description', 'color', 'sla', 'checklist',
  'priority', 'type', 'text', 'status', 'category',
  'targetWorkflowId', 'targetWorkflowName', 'targetNodeId', 'targetNodeLabel',
  'entryActions', 'exitActions', 'triggerActions', 'finalActions',
  'enterActionTypes', 'exitActionTypes', 'actionTypes', 'triggerTypes', 'triggerType', 'actionType',
  'rotation', 'maxDuration', 'maxDurationUnit', 'cost',
  'icon', 'externalLink', 'variables',
]);

/**
 * Strip dangerous keys and sanitize all string values in node data
 * to prevent XSS, prototype pollution, and privilege escalation.
 */
const sanitizeAiNodeData = (data: Record<string, unknown>): Record<string, unknown> => {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (BLOCKED_DATA_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      // Strip all HTML tags — AI data should be plain text
      safe[key] = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
    } else if (Array.isArray(value)) {
      // Sanitize arrays of strings (e.g. checklist labels)
      safe[key] = value.map(item =>
        typeof item === 'string'
          ? DOMPurify.sanitize(item, { ALLOWED_TAGS: [] })
          : typeof item === 'object' && item !== null
            ? sanitizeAiNodeData(item as Record<string, unknown>)
            : item
      );
    } else if (typeof value === 'object' && value !== null) {
      safe[key] = sanitizeAiNodeData(value as Record<string, unknown>);
    } else {
      safe[key] = value;
    }
  }
  return safe;
};
// ── End AI Security ────────────────────────────────────────────────────

/**
 * Fix common AI-generated JSON errors (trailing commas, unquoted keys,
 * single-quoted keys) WITHOUT corrupting string values.
 *
 * Uses a character-by-character walk that tracks whether we are inside
 * a double-quoted string.  Fixes are only applied to structural tokens,
 * so values like `"etap 1, cel: testowy"` are never touched.
 */
const fixBrokenJson = (input: string): string => {
  const out: string[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // ── Double-quoted string → copy verbatim (including escapes) ──
    if (ch === '"') {
      out.push(ch);
      i++;
      while (i < len) {
        const c = input[i];
        out.push(c);
        if (c === '\\' && i + 1 < len) { i++; out.push(input[i]); }
        else if (c === '"') break;
        i++;
      }
      i++;
      continue;
    }

    // ── Trailing comma before } or ] ──
    if (ch === ',') {
      let j = i + 1;
      while (j < len && (input[j] === ' ' || input[j] === '\t' || input[j] === '\n' || input[j] === '\r')) j++;
      if (j < len && (input[j] === '}' || input[j] === ']')) {
        i++; // skip trailing comma
        continue;
      }
    }

    // ── Unquoted key (identifier followed by :) ──
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      let j = i;
      while (j < len && /[a-zA-Z0-9_]/.test(input[j])) { ident += input[j]; j++; }
      // skip spaces/tabs between identifier and potential colon
      let k = j;
      while (k < len && (input[k] === ' ' || input[k] === '\t')) k++;
      if (k < len && input[k] === ':') {
        // Only quote if preceded by a structural char ({  ,) to avoid
        // false-matching bare values like true / false / null
        let p = i - 1;
        while (p >= 0 && (input[p] === ' ' || input[p] === '\t' || input[p] === '\n' || input[p] === '\r')) p--;
        if (p < 0 || input[p] === '{' || input[p] === ',' || input[p] === '[') {
          out.push('"', ident, '"');
          i = j;
          continue;
        }
      }
      out.push(ch);
      i++;
      continue;
    }

    // ── Single-quoted key  'key':  →  "key":  ──
    if (ch === "'") {
      let key = '';
      let j = i + 1;
      while (j < len && input[j] !== "'") { key += input[j]; j++; }
      if (j < len) {
        j++; // past closing '
        let k = j;
        while (k < len && (input[k] === ' ' || input[k] === '\t')) k++;
        if (k < len && input[k] === ':') {
          out.push('"', key, '"');
          i = j;
          continue;
        }
      }
      out.push(ch);
      i++;
      continue;
    }

    out.push(ch);
    i++;
  }

  return out.join('');
};

const ENABLE_TOOL_SUGGESTIONS = true; // Set to true to restore tool suggestions in the carousel

export const AiAssistantPanel = () => {
  const { t, i18n } = useTranslation();
  const isOpen = useUiStore((s) => s.isAiPanelOpen);
  const setOpen = useUiStore((s) => s.setAiPanelOpen);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const applyAiChanges = useCanvasStore((s) => s.applyAiChanges);
  const isViewMode = useCanvasStore((s) => s.isViewMode);
  const { activeWorkspace, user, setProfileModalOpen } = useAuthStore();
  const tierLimits = getTierLimits(user?.tier);
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  // Clear AI chat history when switching workspaces to prevent stale context
  const wsId = activeWorkspace?.id;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]);
  }, [wsId]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const [allTools, setAllTools] = useState<ToolFromCatalog[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolFromCatalog | null>(null);
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);



  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const toolsLoadedAt = useRef<number>(0);
  const qpLoadedAt = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const TOOLS_TTL = 5 * 60 * 1000; // 5 minutes
    if (isOpen && (allTools.length === 0 || (now - toolsLoadedAt.current) > TOOLS_TTL)) {
      toolsLoadedAt.current = Date.now();
      fetchAllTools().then(tools => {
        setAllTools(tools);
      }).catch(err => {
        console.warn('[AI Assistant] Failed to load tools:', err);
        useToastStore.getState().showToast(t('aiExt.toolsFetchError'), 'error');
        setAllTools([]); // Set empty to avoid retry loop
      });
    }
    if (isOpen && quickPrompts.length === 0 && hasKey && (now - qpLoadedAt.current) > TOOLS_TTL) {
      qpLoadedAt.current = Date.now();
      fetchQuickPrompts('workflow').then(qps => {
        if (qps.length > 0) setQuickPrompts(qps);
      });
    }
  }, [isOpen, allTools.length, quickPrompts.length, hasKey, t]);

  const checkKey = useCallback(async () => {
    if (!user?.id) { 
      Promise.resolve().then(() => setHasKey(false)); 
      return; 
    }
    try {
      const keyCheck = await pb.send('/api/ai/check-key', { method: 'POST', requestKey: null });
      if (import.meta.env.DEV) console.log('[AI] check-key response:', keyCheck);
      setHasKey(!!keyCheck?.hasKey);
    } catch (err) {
      console.error('[AI] check-key error:', err);
      setHasKey(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      checkKey();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, checkKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const findMentionedTools = useCallback((text: string): string[] => {
    const mentioned: string[] = [];
    for (const tool of allTools) {
      if (text.toLowerCase().includes(tool.name.toLowerCase())) {
        mentioned.push(tool.name);
      }
    }
    return [...new Set(mentioned)];
  }, [allTools]);

  /** Parse the workflow-tools JSON block returned by AI and extract tool names */
  const parseToolsFromJson = useCallback((text: string): string[] => {
    const match = text.match(/```(?:json)?\s*workflow-tools\s*([\s\S]*?)```/);
    if (!match) return [];
    try {
      const raw = match[1];
      const startIdx = raw.indexOf('{');
      const endIdx = raw.lastIndexOf('}');
      if (startIdx === -1 || endIdx <= startIdx) return [];
      const jsonStr = raw.slice(startIdx, endIdx + 1);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        parsed = JSON.parse(fixBrokenJson(jsonStr));
      }
      if (parsed && typeof parsed === 'object') {
        // Match JSON keys against the catalog (case-insensitive) and return exact catalog names
        return Object.keys(parsed)
          .map(name => allTools.find(tool => tool.name.toLowerCase() === name.toLowerCase()))
          .filter((tool): tool is ToolFromCatalog => !!tool)
          .map(tool => tool.name);
      }
    } catch (err) {
      console.warn('[AI Assistant] Failed to parse workflow-tools JSON block:', err);
    }
    return [];
  }, [allTools]);

  const extractJsonFromBlock = (block: string): Record<string, unknown> | null => {
    const startIdx = block.indexOf('{');
    const endIdx = block.lastIndexOf('}');
    if (startIdx === -1 || endIdx <= startIdx) return null;

    const jsonStr = block.slice(startIdx, endIdx + 1);

    // Fast path — AI usually produces valid JSON
    try {
      return JSON.parse(jsonStr);
    } catch (initialErr) {
      console.warn('[AI] JSON.parse failed, running fixBrokenJson…', initialErr);
    }

    // Slow path — fix structural issues without touching string values
    try {
      return JSON.parse(fixBrokenJson(jsonStr));
    } catch (fallbackErr) {
      console.error('[AI] parse error after fixBrokenJson:', fallbackErr);
      console.debug('[AI] raw JSON that failed:', jsonStr);
    }

    return null;
  };

  const parseWorkflowJson = (text: string): { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } | null => {
    // Try explicit workflow-json blocks first
    const explicitMatch = text.match(/```(?:json)?\s*workflow-json\s*([\s\S]*?)```/);
    if (explicitMatch) {
      const parsed = extractJsonFromBlock(explicitMatch[1]);
      if (parsed?.nodes && Array.isArray(parsed.nodes)) return parsed;
    }
    // Try any ```json block that has "nodes" and "edges"
    const allBlocks = [...text.matchAll(/```(?:json)?\s*\n?([\s\S]*?)```/g)];
    for (const m of allBlocks) {
      const parsed = extractJsonFromBlock(m[1]);
      if (parsed?.nodes && Array.isArray(parsed.nodes) && parsed?.edges) return parsed;
    }
    return null;
  };

  const parseWorkflowUpdate = (text: string): { updates: { id: string; data: Record<string, unknown> }[] } | null => {
    // Try explicit workflow-update blocks first
    const explicitMatch = text.match(/```(?:json)?\s*workflow-update\s*([\s\S]*?)```/);
    if (explicitMatch) {
      const parsed = extractJsonFromBlock(explicitMatch[1]);
      if (parsed?.updates && Array.isArray(parsed.updates)) return parsed;
    }
    // Try any ```json block that has "updates" 
    const allBlocks = [...text.matchAll(/```(?:json)?\s*\n?([\s\S]*?)```/g)];
    for (const m of allBlocks) {
      const parsed = extractJsonFromBlock(m[1]);
      if (parsed?.updates && Array.isArray(parsed.updates)) return parsed;
    }
    return null;
  };

  const handleApplyWorkflowUpdate = (update: { updates: { id: string; data: Record<string, unknown> }[] }) => {
    try {
      const updatedNodes = nodes.map(n => {
        const change = update.updates.find(u => u.id === n.id);
        if (!change) return n;

        // ── Security: whitelist allowed keys & sanitize values ──
        const filteredData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(change.data)) {
          // Normalize AI-generated keys
          let mappedKey = key;
          if (key === 'sla' || key === 'SLA') {
            if (typeof value === 'number' || !isNaN(Number(value))) {
               filteredData['maxDuration'] = Number(value);
               filteredData['maxDurationUnit'] = 'h';
               continue;
            } else if (typeof value === 'string') {
               const num = parseFloat(value);
               if (!isNaN(num)) {
                 filteredData['maxDuration'] = num;
                 filteredData['maxDurationUnit'] = value.toLowerCase().includes('d') ? 'd' : 'h';
               }
               continue;
            }
          }
          if (key === 'koszt' || key === 'koszty' || key === 'costs') mappedKey = 'cost';

          if (mappedKey === 'icon' && typeof value === 'string') {
            let iconName = value.replace(/^lucide[-_]?/i, '');
            if (iconName.includes('-') || iconName.includes('_')) {
              iconName = iconName.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
            } else {
              iconName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
            }
            filteredData[mappedKey] = iconName;
            continue;
          }

          if (!SAFE_UPDATE_KEYS.has(mappedKey)) {
            console.warn(`[AI Security] Blocked disallowed update key: "${mappedKey}"`);
            continue;
          }
          filteredData[mappedKey] = value;
        }
        const sanitizedData = sanitizeAiNodeData(filteredData);

        // Merge only safe, sanitized data fields; preserve position, type, id
        return {
          ...n,
          data: {
            ...n.data,
            ...sanitizedData,
          },
        };
      });
      // Keep edges exactly as they are
      applyAiChanges(updatedNodes, edges);
      useToastStore.getState().showToast(t('aiExt.changesApplied'), 'success');
    } catch (err) {
      console.error('Error applying update:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }
  };



  const handleSend = async (text?: string, includeTools: boolean = false, displayMsg?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const hasToolKeyword = (t: string) => /katalog|narzędz|narzedzi|tools|tool|catalog|recommend/i.test(t);
    const isRecentToolContext = messages.slice(-3).some(m => hasToolKeyword(m.content) || (m.toolNames && m.toolNames.length > 0));
    const shouldIncludeTools = includeTools || hasToolKeyword(msg) || isRecentToolContext;

    setInput('');
    setMessages(prev => {
      const updated = [...prev, { role: 'user', content: msg, displayContent: displayMsg }];
      // Cap message history to prevent memory leaks
      if (updated.length > 200) {
        return updated.slice(-200).map((m, i) =>
          i < updated.length - 50 ? { ...m, workflowJson: undefined, workflowUpdate: undefined } : m
        );
      }
      return updated;
    });
    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (!activeWorkspace?.id) throw new Error(t('aiExt.noWorkspace'));

      const toolNames = (ENABLE_TOOL_SUGGESTIONS && shouldIncludeTools) ? allTools.map(tool => tool.shortDesc ? `[${t('aiExt.toolLabel')}: ${tool.name}]\n${tool.shortDesc}` : `[${t('aiExt.toolLabel')}: ${tool.name}]`) : [];
      const promoToolNames = (ENABLE_TOOL_SUGGESTIONS && shouldIncludeTools) ? allTools.filter(tool => tool.promo).map(tool => tool.name) : [];
      const limits = getTierLimits(user?.tier);
      
      const contextData = {
        nodes,
        edges,
        toolNames,
        promoToolNames,
        lang: i18n.language,
        latestMessage: msg
      };

      // Trim conversation memory based on tier limit and user's custom limit
      const customMem = user?.ai_custom_memory ? Number(user.ai_custom_memory) : limits.aiMemoryLength;
      const actualMemoryLength = Math.min(customMem, limits.aiMemoryLength);
      const recentMessages = messages.slice(-actualMemoryLength);

      const chatHistory = recentMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      const response = await sendChatMessage(
        activeWorkspace.id,
        [...chatHistory, { role: 'user', content: msg }],
        contextData,
        abortControllerRef.current.signal
      );

      // Extract tools from structured workflow-tools JSON block first; fallback to text matching
      let mentionedTools: string[] = [];
      if (ENABLE_TOOL_SUGGESTIONS && shouldIncludeTools) {
        const toolNamesFromJson = parseToolsFromJson(response);
        mentionedTools = toolNamesFromJson.length > 0 ? toolNamesFromJson : findMentionedTools(response);
      }
      const workflowJson = parseWorkflowJson(response);
      const workflowUpdate = parseWorkflowUpdate(response);
      
      const hasWorkflowCodeBlock = /```(?:json)?\s*workflow-(?:json|update)[\s\S]*?```/.test(response);
      const jsonParseError = hasWorkflowCodeBlock && !workflowJson && !workflowUpdate;

      // Strip all code blocks that contain workflow data (any format variation)
      // Generic: cut workflow-tools block (model-text-agnostic)
      let cleanResponse = response
        .replace(/```(?:json)?\s*workflow-tools[\s\S]*?```[\s]*/gi, '')
        .replace(/[Oo]to podsumowanie[^.\n]*?:?\s*/gi, '')
        .replace(/(?:Oto |Podaję |Poniżej znajdziesz )?[^.\n]*w formacie JSON[^.\n]*:?\s*/gi, '');

      if (workflowJson || workflowUpdate || jsonParseError) {
        cleanResponse = cleanResponse
          .replace(/```(?:json)?\s*workflow-json[\s\S]*?```/g, '')
          .replace(/```(?:json)?\s*workflow-update[\s\S]*?```/g, '')
          .replace(/```[\s\S]*?```/g, '');
      }
      cleanResponse = cleanResponse.trim();

      setMessages(prev => {
        const updated = [...prev, {
          role: 'assistant' as const,
          content: cleanResponse || (workflowJson ? t('aiExt.generatedWorkflow') : workflowUpdate ? t('aiExt.updatedNodes') : response),
          toolNames: mentionedTools.length > 0 ? mentionedTools : undefined,
          workflowJson: workflowJson || undefined,
          workflowUpdate: workflowUpdate || undefined,
          jsonParseError
        }];
        // Cap message history to prevent memory leaks
        if (updated.length > 200) {
          return updated.slice(-200).map((m, i) =>
            i < updated.length - 50 ? { ...m, workflowJson: undefined, workflowUpdate: undefined } : m
          );
        }
        return updated;
      });
      // Server accepted the request → the key is valid
      setHasKey(true);
    } catch (err) {
      const errorObj = err as { name?: string; isAbort?: boolean };
      if (errorObj.name === 'AbortError' || errorObj.isAbort) {
        setMessages(prev => {
          const updated = [...prev, {
            role: 'assistant' as const,
            content: `🛑 ${t('aiExt.generationStopped')}`
          }];
          if (updated.length > 200) {
            return updated.slice(-200).map((m, i) =>
              i < updated.length - 50 ? { ...m, workflowJson: undefined, workflowUpdate: undefined } : m
            );
          }
          return updated;
        });
      } else {
        const errMsg = err instanceof Error ? err.message : String(err);
        let translatedMsg = errMsg;
        
        if (errMsg.includes('Something went wrong') || errMsg.includes('Failed to fetch') || errMsg.includes('API error')) {
          translatedMsg = t('aiExt.connectionError');
        } else if (errMsg.includes('not configured')) {
          translatedMsg = t('aiExt.noKeyMsg');
        } else if (errMsg.includes('FREE plan')) {
          translatedMsg = t('aiExt.tierBlocked', { tier: 'FREE' });
        } else if (errMsg.includes('decrypt API key')) {
          translatedMsg = t('aiExt.invalidKeyMsg');
        } else if (errMsg.includes('access to this workspace')) {
          translatedMsg = t('authStore.workspaceNotFound');
        } else if (errMsg.includes('Provider error') || errMsg.includes('po stronie dostawcy')) {
          translatedMsg = t('aiExt.providerError');
        }

        setMessages(prev => {
          const updated = [...prev, {
            role: 'assistant' as const,
            content: `❌ ${translatedMsg}`
          }];
          if (updated.length > 200) {
            return updated.slice(-200).map((m, i) =>
              i < updated.length - 50 ? { ...m, workflowJson: undefined, workflowUpdate: undefined } : m
            );
          }
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleApplyWorkflowJson = (json: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }, mode: 'merge' | 'replace' = 'merge') => {
    try {
      // ── Security: validate, limit & sanitize AI-generated nodes ──
      const safeNodes = json.nodes
        .slice(0, MAX_AI_NODES)                                              // DoS guard
        .map(n => {
          let t = (n.type as string) || 'simple';
          const d = { ...((n.data as Record<string, unknown>) || {}) };
          if (t === 'stop' || t === 'start') {
            d.type = t;
            t = 'startstop';
          } else if (t === 'gateway') {
            t = 'simple';
          }
          return { ...n, type: t, data: d };
        })
        .filter(n => ALLOWED_NODE_TYPES.has(n.type))  // type whitelist
        .map(n => {
          const mappedData: Record<string, unknown> = { ...(n.data as Record<string, unknown>) };
          
          // Map AI generated SLA/cost fields to internal format
          if (mappedData.sla !== undefined) {
             const slaVal = mappedData.sla;
             if (typeof slaVal === 'number' || !isNaN(Number(slaVal))) {
                mappedData.maxDuration = Number(slaVal);
                mappedData.maxDurationUnit = 'h';
             } else if (typeof slaVal === 'string') {
                const num = parseFloat(slaVal);
                if (!isNaN(num)) {
                  mappedData.maxDuration = num;
                  mappedData.maxDurationUnit = slaVal.toLowerCase().includes('d') ? 'd' : 'h';
                }
             }
             delete mappedData.sla;
          }
          if (mappedData.koszt !== undefined) { mappedData.cost = mappedData.koszt; delete mappedData.koszt; }
          if (mappedData.koszty !== undefined) { mappedData.cost = mappedData.koszty; delete mappedData.koszty; }
          if (mappedData.costs !== undefined) { mappedData.cost = mappedData.costs; delete mappedData.costs; }

          if (typeof mappedData.icon === 'string') {
            let iconName = mappedData.icon.replace(/^lucide[-_]?/i, '');
            if (iconName.includes('-') || iconName.includes('_')) {
              iconName = iconName.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
            } else {
              iconName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
            }
            mappedData.icon = iconName;
          }

          return {
            ...n,
            type: n.type || 'simple',
            data: sanitizeAiNodeData(mappedData),
          };
        });

      const safeEdges = (json.edges || []).slice(0, MAX_AI_EDGES).map((ed: Record<string, unknown>) => {
        const edData = (typeof ed.data === 'object' && ed.data !== null ? ed.data : {}) as Record<string, unknown>;
        let newLabel = (ed.label as string) || '';
        const currentConditionType = edData.conditionType || 'text';

        if (currentConditionType === 'rule') {
          const currentRules = (Array.isArray(edData.rules) ? edData.rules : []) as Record<string, unknown>[];
          if (currentRules.length > 0) {
            const parts = currentRules.map((r: Record<string, unknown>) => r.variable ? (r.operator === 'notEmpty' ? `${r.variable} ≠ ∅` : `${r.variable} ${r.operator || '=='} ${r.value || ''}`) : t('props.incomplete'));
            const joiner = edData.ruleCombinator === 'OR' ? t('props.orJoiner') : t('props.andJoiner');
            newLabel = parts.join(joiner);
          } else {
            newLabel = t('props.noConditionsLabel');
          }
        } else if (currentConditionType === 'else') {
          newLabel = t('props.elseAutoLabel');
        } else if (currentConditionType === 'text') {
          newLabel = edData.customText !== undefined ? edData.customText : newLabel;
        }

        return {
          ...ed,
          label: newLabel,
          data: { ...edData, label: newLabel }
        };
      });

      if (safeNodes.length < json.nodes.length) {
        console.warn(`[AI Security] Trimmed ${json.nodes.length - safeNodes.length} nodes (limit ${MAX_AI_NODES}, type whitelist)`);
      }

      // In replace mode, keep only START/STOP from existing canvas
      const baseNodes = mode === 'replace'
        ? nodes.filter(n => n.type === 'startstop')
        : nodes;
      const baseEdges = mode === 'replace' ? [] : edges;

      const existingNodeIds = new Set(baseNodes.map(n => n.id));
      const newNodes = safeNodes.filter(n => !existingNodeIds.has(n.id));
      if (newNodes.length === 0 && safeEdges.length === 0) return;

      const startNode = baseNodes.find(n => n.type === 'startstop' && n.data?.type === 'start');
      const stopNodes = baseNodes.filter(n => n.type === 'startstop' && n.data?.type === 'stop');
      const baseX = startNode ? startNode.position.x + 280 : 400;
      const baseY = startNode ? startNode.position.y : 300;

      const aiEdges = safeEdges;
      const newNodeIds = new Set(newNodes.map(n => n.id));
      const ordered: Record<string, unknown>[] = [];
      const remaining = new Map(newNodes.map(n => [n.id, n]));
      const inDegree = new Map<string, number>();
      newNodes.forEach(n => inDegree.set(n.id, 0));
      aiEdges.forEach(e => {
        if (newNodeIds.has(e.target)) inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      });
      while (remaining.size > 0) {
        let found: string | null = null;
        for (const [id] of remaining) { if ((inDegree.get(id) || 0) <= 0) { found = id; break; } }
        if (!found) found = remaining.keys().next().value!;
        ordered.push(remaining.get(found)!);
        remaining.delete(found);
        aiEdges.forEach(e => { if (e.source === found && remaining.has(e.target)) inDegree.set(e.target, (inDegree.get(e.target) || 0) - 1); });
      }

      // Horizontal layout: each node shifts right
      const HORIZONTAL_GAP = 280;
      ordered.forEach((n, i) => { n.position = { x: baseX + i * HORIZONTAL_GAP, y: baseY }; if (!n.type) n.type = 'simple'; });

      const existingEdgeKeys = new Set(baseEdges.map(e => `${e.source}->${e.target}`));
      const finalNewEdges: Record<string, unknown>[] = [];

      if (startNode && ordered.length > 0) {
        const key = `${startNode.id}->${ordered[0].id}`;
        if (!existingEdgeKeys.has(key) && !aiEdges.some(e => e.source === startNode.id && e.target === ordered[0].id))
      
          finalNewEdges.push({ id: `ai-edge-start-${crypto.randomUUID()}`, type: 'custom', source: startNode.id, target: ordered[0].id, sourceHandle: 'right', targetHandle: 'left' });
      }
      const allNodesContext = [...baseNodes, ...newNodes];
      aiEdges.forEach(e => {
        const key = `${e.source}->${e.target}`;
        if (!existingEdgeKeys.has(key)) {
          const targetNode = allNodesContext.find(n => n.id === e.target);
          const sourceNode = allNodesContext.find(n => n.id === e.source);
          const isDbEdge = targetNode?.type === 'database' || sourceNode?.type === 'database';
          const edgeData = typeof e.data === 'object' && e.data !== null ? e.data : {};
          finalNewEdges.push({ 
            ...e, 
            type: e.type || 'custom', 
            sourceHandle: isDbEdge ? 'db' : 'right', 
            targetHandle: isDbEdge ? 'db' : 'left',
            ...(isDbEdge ? { data: { ...edgeData, dbOperation: (edgeData as Record<string, unknown>).dbOperation || 'read' } } : {})
          }); 
          existingEdgeKeys.add(key); 
        }
      });
      if (stopNodes.length > 0 && ordered.length > 0) {
        const lastNode = ordered[ordered.length - 1];
        const canConnect = lastNode.type === 'simple' || lastNode.type === 'subworkflow' || (lastNode.type === 'startstop' && (lastNode.data as Record<string, unknown>)?.type === 'start');
        const key = `${lastNode.id}->${stopNodes[0].id}`;
        if (canConnect && !existingEdgeKeys.has(key) && !aiEdges.some(e => e.source === lastNode.id && e.target === stopNodes[0].id))
      
          finalNewEdges.push({ id: `ai-edge-stop-${crypto.randomUUID()}`, type: 'custom', source: lastNode.id, target: stopNodes[0].id, sourceHandle: 'right', targetHandle: 'left' });
      }

      // Move STOP node to the right of the last generated node
      const updatedNodes = baseNodes.map(n => {
        if (stopNodes.some(s => s.id === n.id) && ordered.length > 0) return { ...n, position: { x: baseX + ordered.length * HORIZONTAL_GAP, y: baseY } };
        return n;
      });

      applyAiChanges([...updatedNodes, ...ordered] as Node[], [...baseEdges, ...finalNewEdges] as Edge[]);
      setTimeout(() => {
        useCanvasStore.getState().autoLayout();
      }, 100);
      useToastStore.getState().showToast(t('aiExt.changesApplied'), 'success');
    } catch (err) { 
      console.error('Error applying JSON:', err); 
      useToastStore.getState().showToast(t('common.error'), 'error');
    }
  };

  const handleReset = () => { setMessages([]); setSelectedTool(null); };

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (carouselRef.current) carouselRef.current.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  // Use DB prompts exclusively per user request
  const isPl = i18n.language === 'pl';
  const activePrompts: (QuickPrompt & { includeTools?: boolean })[] = quickPrompts.map(qp => ({
    ...qp,
    label: isPl ? qp.label : (qp.label_en || qp.label),
    prompt: isPl ? qp.prompt : (qp.prompt_en || qp.prompt)
  }));

  /** Determines if a prompt should get brand (gold) styling — driven strictly by DB `variant` field. */
  const isBrandPrompt = (qp: QuickPrompt & { includeTools?: boolean }) => {
    return qp.variant === 'brand';
  };

  const sortedPrompts = [...activePrompts].sort((a, b) => {
    const aBrand = isBrandPrompt(a);
    const bBrand = isBrandPrompt(b);
    if (aBrand && !bBrand) return 1;
    if (!aBrand && bBrand) return -1;
    return 0;
  });

  if (!isOpen || isViewMode) return null;

  // Tier gate — block AI for tiers with aiAccess === 'none' (controllable from DB)
  if (tierLimits.aiAccess === 'none') {
    return (
      <MotionSidePanel
        position="left"
        width="md:w-[420px]"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground flex-1">{t('aiExt.title')}</h3>
          <button onClick={() => setOpen(false)} className="text-brand-gold hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-gold">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h4 className="text-lg font-bold text-foreground mb-2">{t('aiExt.unavailable')}</h4>
          <p className="text-sm text-muted-foreground mb-1">
            {t('aiExt.yourPlan')} <span className="text-foreground font-bold">{getTierLabel(user?.tier)}</span> {t('aiExt.tierNoAccess')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('aiExt.upgradeTo')} <span className="text-blue-400 font-bold">Medium</span> {t('common.or')} <span className="text-brand-gold font-bold">Pro</span> {t('aiExt.toUseAi')}
          </p>
        </div>
      </MotionSidePanel>
    );
  }

  // Tool detail view
  if (selectedTool) {
    const ytId = getYoutubeId(selectedTool.videoUrl);
    return (
      <MotionSidePanel
        position="left"
        width="md:w-[420px]"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <button onClick={() => setSelectedTool(null)} className="text-brand-gold hover:text-foreground transition-colors"><ArrowLeft size={18} /></button>
          <h3 className="text-sm font-bold text-foreground flex-1 truncate">{selectedTool.name}</h3>
          <button onClick={() => setOpen(false)} className="text-brand-gold hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-[#2a2a2a]">
          {selectedTool.logoUrl && (
            <div className="relative rounded-xl overflow-hidden -mx-5 -mt-4">
              {selectedTool.promo && (
                <div className="absolute top-2 left-2 z-10">
                  <SimpleTooltip content={t('aiExt.promoTool')}>
                    <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center shadow-lg text-white cursor-help">
                      <Star size={12} fill="currentColor" stroke="none" />
                    </div>
                  </SimpleTooltip>
                </div>
              )}
              <img loading="lazy" src={selectedTool.logoUrl} alt={selectedTool.name} className="w-full h-auto object-cover" />
            </div>
          )}
          <div className="text-[13px] text-muted-foreground leading-relaxed tool-detail-desc"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(
                selectedTool.fullDesc
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                  .replace(/\n{2,}/g, '</p><p class="mt-2">')
                  .replace(/\n/g, '<br/>')
                  .replace(/^/, '<p>')
                  .replace(/$/, '</p>')
              )
            }}
          />
          {ytId && (
            <div className="mt-4">
              <div className="aspect-video rounded-xl overflow-hidden border border-border">
                <iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${ytId}`} title={selectedTool.name} frameBorder="0" allowFullScreen />
              </div>
            </div>
          )}
          {selectedTool.url && (
            <a href={selectedTool.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-brand-gold hover:underline mt-2">
              {t('aiExt.visitPage')} <ExternalLink size={11} />
            </a>
          )}
        </div>
      </MotionSidePanel>
    );
  }

  // Main chat view
  const chatPanel = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: isMaximized ? 0 : -20, scale: isMaximized ? 0.97 : 1 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: isMaximized ? 0 : -20 }}
        transition={{ duration: 0.2 }}
        className={isMaximized
          ? 'w-full max-w-[1024px] mx-auto h-full flex flex-col bg-card overflow-hidden'
          : 'fixed left-0 top-0 bottom-14 w-full md:left-[88px] md:top-6 md:bottom-6 md:w-[420px] z-[110] flex flex-col bg-card md:rounded-2xl shadow-2xl overflow-hidden'
        }
      >
        {/* Header — clean, gold icons */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">{t('aiExt.title')}</h3>
          </div>
          <button onClick={handleReset} className="text-brand-gold hover:text-foreground transition-colors" title={t('aiExt.newConversation')}><RotateCcw size={18} /></button>
          <button onClick={() => setIsMaximized(!isMaximized)} className="text-brand-gold hover:text-foreground transition-colors" title={isMaximized ? t('ui.minimize') : t('ui.maximize')}>{isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
          <button onClick={() => { setOpen(false); setIsMaximized(false); }} className="text-brand-gold hover:text-foreground transition-colors"><X size={18} /></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin scrollbar-thumb-[#2a2a2a]">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-secondary overflow-hidden shrink-0 mt-0.5">
                  <img loading="lazy" src="/a1.webp" alt={t('aiExt.altGryf')} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-foreground font-semibold">{t('aiExt.greeting')}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('aiExt.intro')) }} />
                </div>
              </div>
              {hasKey && activePrompts.length > 0 && (
                <>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold pl-10">{t('ai.quickActions')}</p>
                  <div className="flex flex-wrap gap-2 pl-10">
                    {sortedPrompts.map((qp, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleSend(qp.prompt, !!qp.includeTools, qp.label)} 
                        className={`text-[12px] font-semibold px-4 py-2 rounded-full transition-all ${
                          isBrandPrompt(qp)
                            ? 'bg-brand-gold text-white hover:bg-brand-gold/90'
                            : 'text-muted-foreground hover:text-foreground bg-secondary hover:bg-surface-elevated'
                        }`}
                      >
                        {qp.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'items-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-secondary overflow-hidden shrink-0 mt-0.5">
                  <img loading="lazy" src="/a1.webp" alt={t('aiExt.altGryf')} className="w-full h-full object-cover" />
                </div>
              )}
              <div className={`max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-card text-foreground rounded-2xl rounded-br-md px-4 py-2.5'
                  : 'space-y-3'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground"
                   dangerouslySetInnerHTML={{
                     __html: DOMPurify.sanitize(
                       (msg.displayContent || msg.content)
                         .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                         .replace(/\n/g, '<br/>')
                     )
                   }}
                />

                {/* Tool Carousel */}
                {ENABLE_TOOL_SUGGESTIONS && msg.toolNames && msg.toolNames.length > 0 && (
                  <div className="relative mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t('aiExt.recommendedTools')}</span>
                      <div className="flex gap-1">
                        <button onClick={() => scrollCarousel('left')} className="w-6 h-6 rounded-full bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors border border-border"><ChevronLeft size={14} /></button>
                        <button onClick={() => scrollCarousel('right')} className="w-6 h-6 rounded-full bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors border border-border"><ChevronRight size={14} /></button>
                      </div>
                    </div>
                    <div ref={carouselRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                      {msg.toolNames.map((name, ti) => {
                        const tool = allTools.find(at => at.name === name);
                        if (!tool) return null;
                        const colorClass = CARD_COLORS[ti % CARD_COLORS.length];
                        return (
                          <div key={tool.id} className="min-w-[200px] max-w-[200px] shrink-0 rounded-xl overflow-hidden bg-secondary transition-all snap-start group flex flex-col">
                            <div className="relative h-[120px] overflow-hidden flex items-center justify-center">
                              {tool.promo && (
                                <div className="absolute top-2 left-2 z-10">
                                  <SimpleTooltip content={t('aiExt.promoTool')}>
                                    <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center shadow-lg text-white cursor-help">
                                      <Star size={12} fill="currentColor" stroke="none" />
                                    </div>
                                  </SimpleTooltip>
                                </div>
                              )}
                              {tool.logoUrl ? (
                                <img loading="lazy" src={tool.logoUrl} alt={tool.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                                  <span className="text-foreground text-xl font-black">{tool.name}</span>
                                </div>
                              )}
                            </div>
                            <div className="p-3 bg-secondary flex flex-col flex-1">
                              <h4 className="text-[12px] font-bold text-foreground mb-1">{tool.name}</h4>
                              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4 flex-1">{tool.shortDesc}</p>
                              <button onClick={() => setSelectedTool(tool)} className="w-full mt-3 text-[11px] font-bold text-foreground bg-surface-elevated hover:bg-border-strong py-2 rounded-xl transition-colors cursor-pointer">
                                {t('aiExt.moreAboutTool')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Workflow JSON apply — two options */}
                {msg.workflowJson && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] text-muted-foreground">{msg.workflowJson.nodes.length} {t('stats.nodesLower')}, {msg.workflowJson.edges?.length || 0} {t('stats.connectionsLower')}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleApplyWorkflowJson(msg.workflowJson!, 'replace')} className="flex items-center gap-2 text-[11px] font-bold bg-brand-gold text-background px-4 py-2 rounded-xl hover:bg-brand-gold/90 transition-colors">
                        <Download size={12} /> {t('aiExt.replaceCurrent')}
                      </button>
                      <button onClick={() => handleApplyWorkflowJson(msg.workflowJson!, 'merge')} className="flex items-center gap-2 text-[11px] font-bold text-foreground bg-surface-elevated hover:bg-border-strong px-4 py-2 rounded-xl transition-colors">
                        <Download size={12} /> {t('aiExt.mergeWithCurrent')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Workflow Update — merge data only */}
                {msg.workflowUpdate && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] text-muted-foreground">{t('aiExt.updateCount', { count: msg.workflowUpdate.updates.length })}</p>
                    <button onClick={() => handleApplyWorkflowUpdate(msg.workflowUpdate!)} className="flex items-center gap-2 text-[11px] font-bold bg-brand-gold text-background px-4 py-2 rounded-xl hover:bg-brand-gold/90 transition-colors">
                      <Download size={12} /> {t('aiExt.applyChanges')}
                    </button>
                  </div>
                )}

                {/* Parse Error Warning */}
                {msg.jsonParseError && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
                    <p className="font-bold mb-1">{t('aiExt.jsonParseErrorTitle')}</p>
                    <p>{t('aiExt.jsonParseErrorDesc')}</p>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <UserAvatar user={user} />
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col gap-3 items-start">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-secondary overflow-hidden shrink-0">
                  <img loading="lazy" src="/a1.webp" alt={t('aiExt.altGryf')} className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 size={12} className="animate-spin" /> {t('aiExt.thinking')}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-9 text-[11px] h-7 px-3 text-muted-foreground hover:text-destructive border-border/50 hover:bg-destructive/10 hover:border-destructive/30"
                onClick={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                }}
              >
                ■ {t('aiExt.stopGenerating')}
              </Button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>



        {/* Input — rounded rectangle, no border-top */}
        <div className="px-5 py-4">
          {!hasKey ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <p className="text-xs text-muted-foreground text-center">
                {t('aiExt.configureKey')}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs font-bold"
                onClick={() => setProfileModalOpen(true)}
              >
                {t('aiExt.openProfile')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={t('aiExt.inputPlaceholder')}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground py-1"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20"
              >
                <Send size={18} />
              </button>
            </div>
          )}

          {messages.length > 0 && hasKey && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {sortedPrompts.filter(qp => qp.prompt).map((qp, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSend(qp.prompt, !!qp.includeTools, qp.label)} 
                  disabled={isLoading} 
                  className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-full transition-all disabled:opacity-30 ${
                    isBrandPrompt(qp)
                      ? 'bg-brand-gold text-white hover:bg-brand-gold/90'
                      : 'text-muted-foreground hover:text-foreground bg-secondary hover:bg-surface-elevated'
                  }`}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );

  if (isMaximized) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-card flex items-stretch">
        {chatPanel}
      </div>,
      document.body
    );
  }
  // Portal to body so the panel escapes FloatingNavBar's stacking context
  // and renders above the top save bar
  return createPortal(chatPanel, document.body);
};
