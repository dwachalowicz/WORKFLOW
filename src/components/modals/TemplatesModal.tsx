import { useState, useEffect, lazy, Suspense, type ComponentType, useCallback, useMemo } from 'react';
import { pb, type WorkflowTemplate } from '@/lib/pocketbase';
import { useAuthStore } from '@/store/authStore';
import { Sparkles, FileText, LayoutTemplate, type LucideProps } from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ModalOverlay, ModalContainer, ModalHeader, ModalBody } from '@/components/ui/ModalWrapper';
import { useToastStore } from '@/store/toastStore';

type Template = WorkflowTemplate;

// Cache for dynamically imported icon components
const iconCache = new Map<string, ComponentType<LucideProps>>();

const getIconComponent = (name?: string): ComponentType<LucideProps> => {
  if (!name) return FileText;
  if (iconCache.has(name)) return iconCache.get(name)!;
  
  const LazyIcon = lazy(() =>
    import('lucide-react').then(mod => {
      const Icon = (mod as Record<string, ComponentType<LucideProps>>)[name];
      if (Icon) {
        return { default: Icon };
      }
      return { default: FileText };
    })
  );
  iconCache.set(name, LazyIcon);
  return LazyIcon;
};

/** Resolve a Lucide icon name (e.g. "Users", "DollarSign") to a lazy component. */
const DynamicIcon = ({ name, ...props }: { name?: string } & LucideProps) => {
  const IconComponent = useMemo(() => getIconComponent(name), [name]);

  return (
    <Suspense fallback={<FileText {...props} />}>
      {/* eslint-disable-next-line react-hooks/static-components */}
      <IconComponent {...props} />
    </Suspense>
  );
};

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplatesModal = ({ isOpen, onClose }: TemplatesModalProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, activeWorkspace } = useAuthStore();

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await pb.collection('WORKFLOW_templates').getList<Template>(1, 200, {
        sort: 'category,name',
        filter: 'active = true',
        requestKey: null,
      });
      setTemplates(records.items);
    } catch (err) {
      console.error('Error fetching templates:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => fetchTemplates(), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchTemplates]);

  const handleUseTemplate = async (template: Template) => {
    if (!user || !activeWorkspace) return;

    // Tier check: compare user tier against template requirement
    const TIER_ORDER: Record<string, number> = { FREE: 0, MEDIUM: 1, PRO: 2 };
    const userTierLevel = TIER_ORDER[(user.tier || 'FREE').toUpperCase()] ?? 0;
    const requiredTierLevel = TIER_ORDER[(template.tier_required || 'FREE').toUpperCase()] ?? 0;
    if (userTierLevel < requiredTierLevel) {
      useToastStore.getState().showToast(
        t('tierLimits.templateTierRequired', {
          tier: template.tier_required,
          defaultValue: `Ten szablon wymaga planu ${template.tier_required}. Zaktualizuj swój plan, aby go użyć. / This template requires ${template.tier_required} plan. Upgrade to use it.`
        }),
        'error'
      );
      return;
    }

    try {
      // Create a new process from this template
      let nodes: unknown;
      let edges: unknown;
      try {
        nodes = typeof template.nodes_data === 'string' 
          ? JSON.parse(template.nodes_data) 
          : template.nodes_data;
        edges = typeof template.edges_data === 'string' 
          ? JSON.parse(template.edges_data) 
          : template.edges_data;
      } catch {
        useToastStore.getState().showToast(t('common.error'), 'error');
        return;
      }

      const record = await pb.collection('WORKFLOW_processes').create({
        name: template.name,
        owner: user.id,
        workspace: activeWorkspace.id,
        nodes: nodes,
        edges: edges,
      });

      onClose();
      navigate(`/app/${record.id}`);
    } catch (err) {
      console.error('Error creating from template:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }
  };

  const categories = [...new Set(templates.map(t => t.category))].filter(Boolean);
  const filtered = selectedCategory 
    ? templates.filter(t => t.category === selectedCategory) 
    : templates;

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} zIndex="high">
      <ModalContainer size="lg" className="max-h-[80vh]">
        <ModalHeader
          icon={LayoutTemplate}
          iconBrandBg
          title={t('templates.title')}
          subtitle={t('templates.subtitle')}
          onClose={onClose}
        />

        <div className="flex items-center gap-2 px-6 py-3 border-b border-border/50 overflow-x-auto">
          <Button
            variant={!selectedCategory ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="rounded-full h-8"
          >
            {t('templates.all')}
          </Button>
          {categories.map(cat => {
            const catTemplate = templates.find(t => t.category === cat);
            return (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="rounded-full h-8 flex items-center gap-1.5"
              >
                <DynamicIcon name={catTemplate?.icon} size={12} />
                {cat}
              </Button>
            );
          })}
        </div>

        {/* Templates Grid */}
        <ModalBody className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <GryfSpinner size={36} />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={LayoutTemplate} title={t('templates.noTemplates')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(template => {
                return (
                  <div 
                    key={template.id} 
                    className="group bg-secondary/30 border border-border/50 rounded-2xl p-5 hover:border-brand-gold/30 hover:bg-secondary/50 transition-all cursor-pointer"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:bg-brand-gold/20 transition-colors">
                        <DynamicIcon name={template.icon} size={18} className="text-muted-foreground group-hover:text-brand-gold transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-sm mb-0.5 truncate">{template.name}</h3>
                        <span className="text-[10px] font-semibold text-brand-gold/70 uppercase tracking-wider">{template.category}</span>
                      </div>
                      {template.tier_required !== 'FREE' && (
                        <Badge variant="warning" className="shrink-0">
                          {template.tier_required}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Sparkles size={12} className="text-brand-gold" />
                      <span className="text-[11px] text-muted-foreground">
                        {(() => {
                          try {
                            const nodes = typeof template.nodes_data === 'string' ? JSON.parse(template.nodes_data) : template.nodes_data;
                            return `${nodes?.length || 0} ${t('versionsExt.nodesCount')}`;
                          } catch {
                            return `0 ${t('versionsExt.nodesCount')}`;
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};
