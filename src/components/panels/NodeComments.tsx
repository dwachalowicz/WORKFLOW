import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getAvatarUrl } from '@/lib/pocketbase';
import { fetchComments, addComment, deleteComment, toggleResolveComment, type Comment } from '@/lib/commentService';
import { Send, Trash2, CheckCircle2, Circle, Loader2, ChevronDown } from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useCanvasStore } from "@/store/canvasStore";
import { useToastStore } from '@/store/toastStore';
import { usePBSubscription } from '@/hooks/usePBSubscription';

interface NodeCommentsProps {
  nodeId: string;
}

export const NodeComments = ({ nodeId }: NodeCommentsProps) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const processId = useCanvasStore((s) => s.currentProcessId);
  const refreshCommentCounts = useCanvasStore((s) => s.refreshCommentCounts);
  const isViewMode = useCanvasStore((s) => s.isViewMode);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

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
  const commentOptions = useMemo(() => ({ filter: processId ? `process = "${processId}"` : '' }), [processId]);
  
  usePBSubscription('WORKFLOW_comments', '*', (e) => {
    // Only refresh if the comment belongs to this node
    if (e.record && e.record.node_id === nodeId) {
      // Re-fetch comments to get expanded author data
      if (isOpen && processId) {
        fetchComments(processId, nodeId)
          .then(setComments)
          .catch(() => {});
      }
    }
  }, !!processId && !!nodeId, commentOptions);

  const handleSend = async () => {
    if (!newComment.trim() || !user || !processId) return;
    setIsSending(true);
    try {
      const comment = await addComment(processId, nodeId, user.id, newComment.trim());
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      inputRef.current?.focus();
      // Refresh canvas badge counts
      refreshCommentCounts();
    } catch (err) {
      console.error('Error adding comment:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      refreshCommentCounts();
    } catch (err) {
      console.error('Error deleting comment:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t('comments.noDate');
    try {
      let dateObj: Date;
      if (dateStr.includes('T')) {
        dateObj = new Date(dateStr);
      } else {
        dateObj = new Date(dateStr.replace(' ', 'T'));
      }
      
      if (isNaN(dateObj.getTime())) {
        const parts = dateStr.split(/[ T]/);
        if (parts.length >= 2) {
          const [y, m, d] = parts[0].split('-');
          const [time] = parts[1].split('.');
          const [h, min] = time.split(':');
          return `${d}.${m}.${y}, ${h}:${min}`;
        }
        return dateStr;
      }
      
      const now = new Date();
      const diff = Math.max(0, now.getTime() - dateObj.getTime());
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return t('comments.now');
      if (mins < 60) return t('comments.minutesAgo', { count: mins });
      const hours = Math.floor(mins / 60);
      if (hours < 24) return t('comments.hoursAgo', { count: hours });
      const days = Math.floor(hours / 24);
      if (days < 7) return t('comments.daysAgo', { count: days });
      
      return dateObj.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ', ' + dateObj.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

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
              {/* Input */}
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

              {/* Comments List */}
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <GryfSpinner size={18} />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3 opacity-60">{t('comments.noComments')}</p>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-border pr-1">
                  {comments.map(comment => {
                    const author = comment.expand?.author;
                    const isOwn = author?.id === user?.id;
                    const dateStr = comment.created || comment.updated || (comment as Record<string, unknown>).createdAt || (comment as Record<string, unknown>).created_at || (comment as Record<string, unknown>).createdat as string;
                    const dateText = formatDate(dateStr);

                    return (
                      <div
                        key={comment.id}
                        className={`group relative p-3 rounded-xl border transition-all duration-200 ${
                          comment.resolved
                            ? 'bg-secondary/20 border-border/20 opacity-50'
                            : 'bg-card border-border/40 hover:border-border/60'
                        }`}
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
                            <p className={`text-xs leading-relaxed mt-0.5 ${comment.resolved ? 'line-through text-muted-foreground' : 'text-foreground/80'}`}>
                              {comment.content}
                            </p>
                          </div>

                          {/* Actions — visible on hover */}
                          {!isViewMode && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <SimpleTooltip content={comment.resolved ? t('comments.unresolve') : t('comments.resolve')}>
                                <button
                                  onClick={() => handleToggleResolve(comment)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
                                >
                                  {comment.resolved ? (
                                    <Circle size={12} className="text-muted-foreground" />
                                  ) : (
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                  )}
                                </button>
                              </SimpleTooltip>
                              {isOwn && (
                                <SimpleTooltip content={t('comments.deleteComment')}>
                                  <button
                                    onClick={() => handleDelete(comment.id)}
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
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
