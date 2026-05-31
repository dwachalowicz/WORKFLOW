import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X as XIcon } from 'lucide-react';
import { getAllTierConfigs, formatLimit, type TierConfig } from '@/lib/tierLimits';
import { ModalOverlay, ModalContainer, ModalHeader, ModalBody } from '@/components/ui/ModalWrapper';

interface TierComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
}

interface FeatureRow {
  key: string;
  getValue: (config: TierConfig) => string | number | boolean;
  type: 'number' | 'boolean';
}

export const TierComparisonModal = ({ isOpen, onClose, currentTier = 'FREE' }: TierComparisonModalProps) => {
  const { t } = useTranslation();

  const configs = getAllTierConfigs();

  const features: FeatureRow[] = [
    // Workspace & processes
    { key: 'maxWorkspaces', getValue: (c) => c.maxWorkspaces, type: 'number' },
    { key: 'maxProcesses', getValue: (c) => c.maxProcesses, type: 'number' },
    { key: 'maxNodesPerProcess', getValue: (c) => c.maxNodesPerProcess, type: 'number' },
    { key: 'maxEdgesPerProcess', getValue: (c) => c.maxEdgesPerProcess, type: 'number' },
    { key: 'maxNotesPerProcess', getValue: (c) => c.maxNotesPerProcess, type: 'number' },
    // Team
    { key: 'maxMembersPerWorkspace', getValue: (c) => c.maxMembersPerWorkspace, type: 'number' },
    { key: 'maxGroupsPerWorkspace', getValue: (c) => c.maxGroupsPerWorkspace, type: 'number' },
    // Per-process
    { key: 'maxCommentsPerProcess', getValue: (c) => c.maxCommentsPerProcess, type: 'number' },
    { key: 'maxVariablesPerProcess', getValue: (c) => c.maxVariablesPerProcess, type: 'number' },
    { key: 'maxChecklistItemsPerNode', getValue: (c) => c.maxChecklistItemsPerNode, type: 'number' },
    { key: 'maxVersionsPerProcess', getValue: (c) => c.maxVersionsPerProcess, type: 'number' },
    // AI
    { key: 'aiAccess', getValue: (c) => c.aiAccess !== 'none', type: 'boolean' },
    { key: 'aiMemoryLength', getValue: (c) => c.aiMemoryLength, type: 'number' },
    // Features
    { key: 'canUseTemplates', getValue: (c) => c.canUseTemplates, type: 'boolean' },
    { key: 'canPresent', getValue: (c) => c.canPresent, type: 'boolean' },
    { key: 'canUseSubworkflows', getValue: (c) => c.canUseSubworkflows, type: 'boolean' },
    { key: 'canUseCrossWorkflowTriggers', getValue: (c) => c.canUseCrossWorkflowTriggers, type: 'boolean' },
    { key: 'canUseProcessMap', getValue: (c) => c.canUseProcessMap, type: 'boolean' },
    { key: 'canSharePublic', getValue: (c) => c.canSharePublic, type: 'boolean' },
    { key: 'canShareWithPassword', getValue: (c) => c.canShareWithPassword, type: 'boolean' },
    { key: 'canUseAdvancedStats', getValue: (c) => c.canUseAdvancedStats, type: 'boolean' },
  ];

  // Group features into categories
  const categories = [
    { labelKey: 'tierCompare.catWorkspace', features: features.slice(0, 5) },
    { labelKey: 'tierCompare.catTeam', features: features.slice(5, 7) },
    { labelKey: 'tierCompare.catProcess', features: features.slice(7, 11) },
    { labelKey: 'tierCompare.catAi', features: features.slice(11, 13) },
    { labelKey: 'tierCompare.catFeatures', features: features.slice(13) },
  ];

  const renderValue = (row: FeatureRow, config: TierConfig) => {
    const val = row.getValue(config);
    
    if (row.type === 'boolean') {
      return val ? (
        <Check size={16} className="text-emerald-400 mx-auto" />
      ) : (
        <XIcon size={14} className="text-muted-foreground/30 mx-auto" />
      );
    }
    
    // Special: aiMemoryLength 
    if (row.key === 'aiMemoryLength') {
      return <span className="text-xs">{val} {t('tierCompare.messages')}</span>;
    }

    return <span className="text-xs font-medium">{formatLimit(val as number)}</span>;
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} closeOnOverlayClick>
      <ModalContainer size="lg">
        <ModalHeader
          title={t('tierCompare.title')}
          onClose={onClose}
        />
        <ModalBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              {/* Header — tier names */}
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 w-[40%]" />
                  {configs.map(config => {
                    const tierKey = Object.entries({ FREE: 'FREE', MEDIUM: 'MEDIUM', PRO: 'PRO' })
                      .find(([, v]) => config.label === v || config.label?.toLowerCase() === v.toLowerCase())?.[0]
                      || config.label?.toUpperCase() || 'FREE';
                    const isCurrent = tierKey === currentTier.toUpperCase();
                    return (
                      <th key={config.label} className={`text-center px-3 py-3 ${isCurrent ? 'bg-brand-gold/5' : ''}`}>
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-sm font-bold text-foreground">
                            {config.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full">
                              {t('tierCompare.currentPlan')}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {categories.map((cat, ci) => (
                  <React.Fragment key={ci}>
                    {/* Category header */}
                    <tr>
                      <td
                        colSpan={1 + configs.length}
                        className="px-4 pt-4 pb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest"
                      >
                        {t(cat.labelKey)}
                      </td>
                    </tr>

                    {/* Feature rows */}
                    {cat.features.map((row, fi) => (
                      <tr
                        key={row.key}
                        className={`border-b border-border/20 ${fi % 2 === 0 ? 'bg-secondary/10' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-xs text-foreground/80">
                          {t(`tierCompare.feat_${row.key}`)}
                        </td>
                        {configs.map(config => {
                          const tierKey = config.label?.toUpperCase() || 'FREE';
                          const isCurrent = tierKey === currentTier.toUpperCase();
                          return (
                            <td
                              key={config.label}
                              className={`text-center px-3 py-2.5 ${isCurrent ? 'bg-brand-gold/5' : ''}`}
                            >
                              {renderValue(row, config)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};

