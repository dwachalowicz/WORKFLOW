import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, SkipForward, SkipBack } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useSimulationStore } from "@/store/simulationStore";
import { useCanvasStore } from "@/store/canvasStore";

export const SimulationControl = () => {
  const { t } = useTranslation();
  const isSimulating = useSimulationStore(s => s.isSimulating);
  const simulationHistory = useSimulationStore(s => s.simulationHistory);
  const simulationPendingChoices = useSimulationStore(s => s.simulationPendingChoices);
  const makeSimulationChoice = useSimulationStore(s => s.makeSimulationChoice);
  const toggleSimulation = useSimulationStore(s => s.toggleSimulation);
  const nextSimulationStep = useSimulationStore(s => s.nextSimulationStep);
  const prevSimulationStep = useSimulationStore(s => s.prevSimulationStep);
  const resetSimulation = useSimulationStore(s => s.resetSimulation);
  const nodes = useCanvasStore(s => s.nodes);
  const edges = useCanvasStore(s => s.edges);

  if (!isSimulating) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-2"
      >
        <div className="bg-surface-nav/90 backdrop-blur-xl border border-brand-gold/30 shadow-2xl shadow-brand-gold/10 px-4 py-2.5 rounded-full flex items-center gap-4">
          
          <div className="flex items-center gap-1.5 border-r border-border pr-4">
            <SimpleTooltip content={t('sim.prevStep')} side="top">
              <Button 
                variant="iconGhost"
                size="icon"
                onClick={prevSimulationStep}
                disabled={simulationHistory.length === 0 && simulationPendingChoices.length === 0}
                className="text-foreground/70 hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <SkipBack size={14} />
              </Button>
            </SimpleTooltip>

            <SimpleTooltip content={t('sim.nextStep')} side="top">
              <Button 
                variant="default"
                size="icon"
                onClick={() => nextSimulationStep((nodeId: string) => edges.filter(e => e.source === nodeId && nodes.find(n => n.id === e.target)?.type !== 'database'))}
                disabled={simulationPendingChoices.length > 0}
                className="w-10 h-10 shadow-lg shadow-brand-gold/20"
              >
                <SkipForward size={18} />
              </Button>
            </SimpleTooltip>
          </div>

          <div className="flex items-center gap-3 px-2">
            <div className="text-center min-w-[70px]">
              <div className="text-xs text-brand-gold font-bold uppercase tracking-wider">{t('sim.step')}</div>
              <div className="text-sm font-mono text-foreground mt-0.5">
                {simulationHistory.length}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-l border-border pl-4">
            <SimpleTooltip content={t('sim.stopAndReset')} side="top">
              <Button 
                variant="iconGhost"
                size="icon"
                onClick={() => {
                  resetSimulation(null);
                  toggleSimulation(null);
                }}
                className="text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
              >
                <Square size={13} fill="currentColor" />
              </Button>
            </SimpleTooltip>
          </div>
        </div>

        <div className="text-[10px] text-brand-gold/80 uppercase tracking-widest font-semibold bg-surface-nav/80 backdrop-blur-xl px-4 py-1.5 rounded-full border border-brand-gold/20 flex flex-col items-center shadow-lg">
          {t('sim.modeActive')}
          {simulationPendingChoices.length > 0 && (
            <div className="mt-1.5 text-[11px] text-foreground/60 normal-case tracking-normal font-medium">{t('sim.chooseLogicPath')}</div>
          )}
        </div>

        {/* Choice Panel */}
        {simulationPendingChoices.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mt-1">
            {simulationPendingChoices.map(edge => {
              const targetNode = nodes.find(n => n.id === edge.target);
              const edgeLabel = edge.label || edge.data?.label || edge.data?.customText;
              const buttonLabel = edgeLabel ? String(edgeLabel) : `${t('sim.toNode', { label: targetNode?.data?.label || t('nodes.unnamed') })}`;
              
              return (
                <Button
                  key={edge.id}
                  variant="outline"
                  onClick={() => makeSimulationChoice(edge)}
                  className="bg-surface-nav/90 backdrop-blur-xl border-brand-gold/30 text-foreground/90 px-5 py-2.5 rounded-full shadow-lg shadow-brand-gold/5 hover:bg-brand-gold/15 hover:border-brand-gold/60 hover:text-foreground hover:shadow-brand-gold/15 font-semibold h-auto"
                >
                  {buttonLabel}
                </Button>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
