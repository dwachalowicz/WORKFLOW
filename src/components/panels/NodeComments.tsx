import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/dateUtils';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getAvatarUrl } from '@/lib/pocketbase';
import { fetchComments, addComment, deleteComment, toggleResolveComment, type Comment } from '@/lib/commentService';
import { Send, Trash2, CheckCircle2, Circle, Loader2, ChevronDown, Reply } from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useCanvasStore } from "@/store/canvasStore";
import { useToastStore } from '@/store/toastStore';
import { usePBSubscription } from '@/hooks/usePBSubscription';
import { sanitizeForFilter } from '@/lib/parseUtils';

interface NodeCommentsProps {
  nodeId: string;
}

import type { TFunction } from 'i18next';

const formatCommentDate = (dateStr: string | undefined, t: TFunction) =>
  formatDate(dateStr, { relative: true, t, noDateKey: 'comments.noDate' });

// --- Extracted single comment component (design pattern) ---
interface CommentItemProps {
  comment: Comment;
  isViewMode: boolean;
  user: { id?: string } | null;
  isAdminOrOwner: boolean;
  onResolve: (c: Comment) => void;
  onDelete: (id: string) => void;
  onReply: (parentId: string) => void;
  isChild?: boolean;
}

const CommentItem = ({ comment, isViewMode, user, isAdminOrOwner, onResolve, onDelete, onReply, isChild }: CommentItemProps) => {
  const { t } = useTranslation();
  const author = comment.expand?.author;
  const isOwn = author?.id === user?.id;
  const canDelete = isOwn || isAdminOrOwner;
  const dateStr = comment.created || comment.updated || (comment as Record<string, unknown>).createdAt || (comment as Record<string, unknown>).created_at || (comment as Record<string, unknown>).createdat;
  const dateText = formatCommentDate(dateStr, t);
  const parentIdForReply = isChild ? (comment.parent_id || comment.id) : comment.id;

  return (
    <div
      className={`group relative p-3 rounded-xl border transition-all duration-200 ${
        comment.resolved
          ? 'bg-secondary/20 border-border/20 opacity-50'
          : 'bg-card border-border/40 hover:border-border/60'
      } ${isChild ? 'ml-8 relative before:absolute before:-left-4 before:top-5 before:w-4 before:h-px before:bg-border/50' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full bg-secondary overflow-hidden shrink-0 mt-0.5 ring-1 ring-border/30">
          {author?.avatar ? (
            <img loading="lazy" src={getAvatarUrl(author, 100)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-muted-foreground bg-secondary">
              {(author?.name || author?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-foreground truncate">
              {author?.name || author?.email || t('common.user')}
            </span>
            {dateText && (
              <span className="text-[10px] text-muted-foreground/50 shrink-0">
                {dateText}
              </span>
            )}
          </div>
          <p className={`text-xs leading-relaxed mt-0.5 break-words ${comment.resolved ? 'line-through text-muted-foreground' : 'text-foreground/80'}`}>
            {comment.content}
          </p>
        </div>

        {/* Actions — visible on hover */}
        {!isViewMode && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <SimpleTooltip content={t('comments.reply')}>
              <button
                onClick={() => onReply(parentIdForReply)}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <Reply size={12} className="text-muted-foreground" />
              </button>
            </SimpleTooltip>
            <SimpleTooltip content={comment.resolved ? t('comments.unresolve') : t('comments.resolve')}>
              <button
                onClick={() => onResolve(comment)}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
              >
                {comment.resolved ? (
                  <Circle size={12} className="text-muted-foreground" />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                )}
              </button>
            </SimpleTooltip>
            {canDelete && (
              <SimpleTooltip content={t('comments.deleteComment')}>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={12} className="text-destructive/70" />
                </button>
              </SimpleTooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const NodeComments = ({ nodeId }: NodeCommentsProps) => {
  const { t } = useTranslation();
  const { user, activeWorkspace } = useAuthStore();
  const isAdminOrOwner = (activeWorkspace?.owner === user?.id) || activeWorkspace?.role === 'admin';
  const processId = useCanvasStore((s) => s.currentProcessId);
  const refreshCommentCounts = useCanvasStore((s) => s.refreshCommentCounts);
  const isViewMode = useCanvasStore((s) => s.isViewMode);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  
  // Threads (replies)
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const unresolvedCount = comments.filter(c => !c.resolved).length;

  useEffect(() => {
    const loadComments = async () => {
      if (!processId) return;
      setIsLoading(true);
      try {
        const data = await fetchComments(processId, nodeId);
        setComments(data);
      } catch (err) {
        console.error('Error loading comments:', err);
        useToastStore.getState().showToast(t('common.error'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && processId && nodeId) {
      loadComments();
    }
  }, [isOpen, processId, nodeId, t]);

  // Realtime panel updates for comments
  const commentOptions = useMemo(() => ({ filter: processId ? `process = "${sanitizeForFilter(processId)}"` : '' }), [processId]);
  
  const handleCommentRealtime = useCallback((e: import('pocketbase').RecordSubscription<Record<string, unknown>>) => {
    if (e.record && e.record.node_id === nodeId) {
      if (processId) {
        fetchComments(processId, nodeId)
          .then(setComments)
          .catch(() => {});
      }
    }
  }, [nodeId, processId]);

  usePBSubscription('WORKFLOW_comments', '*', handleCommentRealtime, !!processId && !!nodeId, commentOptions);

  const handleSend = async () => {
    if (!newComment.trim() || !user || !processId) return;
    setIsSending(true);
    try {
      const comment = await addComment(processId, nodeId, user.id, newComment.trim());
      setComments(prev => {
        if (prev.some(c => c.id === comment.id)) return prev;
        return [comment, ...prev];
      });
      setNewComment('');
      inputRef.current?.focus();
      refreshCommentCounts();
    } catch (err) {
      if (err instanceof Error) {
        // PocketBase errors often have the message inside the response data
        const pbErr = err as Error & { response?: { message?: string } };
        if (pbErr.response && pbErr.response.message) {
          useToastStore.getState().showToast(pbErr.response.message, 'error');
        } else {
          useToastStore.getState().showToast(err.message, 'error');
        }
      } else {
        useToastStore.getState().showToast(t('common.error'), 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSendReply = async (parentId: string) => {
    if (!replyText.trim() || !user || !processId) return;
    setIsSending(true);
    try {
      const comment = await addComment(processId, nodeId, user.id, replyText.trim(), parentId);
      setComments(prev => {
        if (prev.some(c => c.id === comment.id)) return prev;
        return [comment, ...prev];
      });
      setReplyText('');
      setReplyingToId(null);
      refreshCommentCounts();
    } catch (err) {
      if (err instanceof Error) {
        // PocketBase errors often have the message inside the response data
        const pbErr = err as Error & { response?: { message?: string } };
        if (pbErr.response && pbErr.response.message) {
          useToastStore.getState().showToast(pbErr.response.message, 'error');
        } else {
          useToastStore.getState().showToast(err.message, 'error');
        }
      } else {
        useToastStore.getState().showToast(t('common.error'), 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
      refreshCommentCounts();
    } catch (err) {
      console.error('Error deleting comment:', err);
      if (err instanceof Error) {
        const pbErr = err as Error & { status?: number, response?: { message?: string } };
        if (pbErr.status === 403 || pbErr.status === 400 || pbErr.status === 404) {
          useToastStore.getState().showToast(t('comments.deleteErrorNoPermission'), 'error');
        } else if (pbErr.response && pbErr.response.message) {
          useToastStore.getState().showToast(pbErr.response.message, 'error');
        } else {
          useToastStore.getState().showToast(err.message, 'error');
        }
      } else {
        useToastStore.getState().showToast(t('common.error'), 'error');
      }
    }
  };

  const handleToggleResolve = async (comment: Comment) => {
    try {
      await toggleResolveComment(comment.id, !comment.resolved);
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, resolved: !c.resolved } : c));
      refreshCommentCounts();
    } catch (err) {
      console.error('Error toggling comment:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }
  };

  const handleReplyClick = (parentId: string) => {
    setReplyingToId(parentId);
    setReplyText('');
    setTimeout(() => {
      replyInputRef.current?.focus();
    }, 50);
  };

  // Grouping into parents and children
  const topLevelComments = comments.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => comments.filter(c => c.parent_id === parentId).reverse();

  return (
    <div className="bg-secondary/20 rounded-xl border border-border/40 p-3">
      {/* Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        {t('properties.comments')}
        {unresolvedCount > 0 && (
          <span className="bg-brand-gold/20 text-brand-gold text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {unresolvedCount}
          </span>
        )}
        <ChevronDown size={14} className={`ml-auto text-muted-foreground transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
      </button>

      {isOpen && (
        <div className="pt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Not saved yet */}
          {!processId ? (
            <p className="text-xs text-muted-foreground text-center py-3 bg-secondary/30 rounded-xl">
              {t('comments.saveProcessFirst')}
            </p>
          ) : (
            <>
              {/* Main Input */}
              {!isViewMode && (
                <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2.5 border border-border/30">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder={t('properties.addComment')}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  <SimpleTooltip content={t('comments.sendComment')}>
                    <button
                      onClick={handleSend}
                      disabled={!newComment.trim() || isSending}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-brand-gold hover:bg-secondary transition-all disabled:opacity-30"
                    >
                      {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </SimpleTooltip>
                </div>
              )}

              {/* Comments list */}
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <GryfSpinner size={18} />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3 opacity-60">{t('comments.noComments')}</p>
              ) : (
                <div className="space-y-4 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-border pr-1">
                  {topLevelComments.map(parent => (
                    <div key={parent.id} className="space-y-2 relative">
                      {/* Main comment */}
                      <CommentItem
                        comment={parent}
                        isViewMode={isViewMode}
                        user={user}
                        isAdminOrOwner={isAdminOrOwner}
                        onResolve={handleToggleResolve}
                        onDelete={handleDelete}
                        onReply={handleReplyClick}
                      />

                      {/* Replies and reply input */}
                      <div className="space-y-2 relative">
                        {/* Line connecting replies */}
                        {getChildren(parent.id).length > 0 && (
                          <div className="absolute left-4 top-0 bottom-4 w-px bg-border/50 z-0"></div>
                        )}

                        {getChildren(parent.id).map(child => (
                          <CommentItem
                            key={child.id}
                            comment={child}
                            isViewMode={isViewMode}
                            user={user}
                            isAdminOrOwner={isAdminOrOwner}
                            onResolve={handleToggleResolve}
                            onDelete={handleDelete}
                            onReply={handleReplyClick}
                            isChild={true}
                          />
                        ))}

                        {/* Input for replying to this thread */}
                        {replyingToId === parent.id && !isViewMode && (
                          <div className="ml-8 relative flex items-center gap-2 bg-secondary/30 rounded-xl px-3 py-2 border border-border/30 animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Horizontal line for thread connection */}
                            <div className="absolute -left-4 top-1/2 w-4 h-px bg-border/50"></div>
                            <input
                              ref={replyInputRef}
                              type="text"
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSendReply(parent.id);
                                if (e.key === 'Escape') {
                                  setReplyingToId(null);
                                  setReplyText('');
                                }
                              }}
                              placeholder={t('comments.replyPlaceholder')}
                              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
                            />
                            <button
                              onClick={() => handleSendReply(parent.id)}
                              disabled={!replyText.trim() || isSending}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-brand-gold hover:bg-secondary transition-all disabled:opacity-30"
                            >
                              {isSending && replyingToId === parent.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
