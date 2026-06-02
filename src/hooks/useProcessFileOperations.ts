import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from '@/store/canvasStore';
import { useConfirmStore } from '@/store/confirmStore';
import { useToastStore } from '@/store/toastStore';

export function useProcessFileOperations() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);

  const handleExport = () => {
    try {
      const state = useCanvasStore.getState();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        nodes: state.nodes,
        edges: state.edges
      }, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${state.processName || 'proces'}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      showToast(t('canvas.exported'), 'success');
    } catch (err) {
      console.error("Error exporting JSON:", err);
      showToast(t('canvas.exportError'), 'error');
    }
  };

  const handleMarkdownExport = () => {
    try {
      const state = useCanvasStore.getState();
      let markdown = `# ${state.processName || t('markdown.untitledProcess')}\n\n`;
      
      markdown += `## ${t('markdown.nodesTitle')}\n\n`;
      if (state.nodes.length === 0) {
        markdown += `${t('markdown.noNodes')}\n`;
      } else {
        state.nodes.forEach(node => {
          const label = node.data?.label || node.type || t('markdown.unknownNode');
          let desc = node.data?.description || node.data?.content || '';
          markdown += `- **${label}** (${node.type})`;
          if (desc) {
            // Replace line breaks to format nicely as a sublist in markdown
            desc = String(desc).replace(/\n/g, '\n  > ');
            markdown += `\n  > ${desc}`;
          }
          markdown += `\n`;
        });
      }

      markdown += `\n## ${t('markdown.edgesTitle')}\n\n`;
      if (state.edges.length === 0) {
        markdown += `${t('markdown.noEdges')}\n`;
      } else {
        state.edges.forEach(edge => {
          const sourceNode = state.nodes.find(n => n.id === edge.source);
          const targetNode = state.nodes.find(n => n.id === edge.target);
          const sourceLabel = sourceNode?.data?.label || sourceNode?.type || edge.source;
          const targetLabel = targetNode?.data?.label || targetNode?.type || edge.target;
          markdown += `- ${sourceLabel} ➔ ${targetLabel}`;
          if (edge.label) markdown += ` *(${t('markdown.condition')}: ${edge.label})*`;
          markdown += `\n`;
        });
      }

      const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(markdown);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${state.processName || 'proces'}.md`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      showToast(t('canvas.exported'), 'success');
    } catch (err) {
      console.error("Error exporting Markdown:", err);
      showToast(t('canvas.exportError'), 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (useCanvasStore.getState().isDirty) {
      const confirmed = await useConfirmStore.getState().confirm({
        title: t('errors.confirmUnsavedImport'),
        confirmLabel: t('common.confirm'),
        cancelLabel: t('common.cancel'),
      });
      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.nodes && json.edges) {
          // Validate structure
          if (!Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
            showToast(t('canvas.invalidFile'), 'error');
            return;
          }
          // Size limits to prevent DoS
          if (json.nodes.length > 500) {
            showToast(t('canvas.tooManyNodes', 'Plik zawiera zbyt wiele węzłów (max 500)'), 'error');
            return;
          }
          if (json.edges.length > 1000) {
            showToast(t('canvas.tooManyEdges', 'Plik zawiera zbyt wiele połączeń (max 1000)'), 'error');
            return;
          }
          // Validate each node has required fields
          const validNodes = json.nodes.every((n: Record<string, unknown>) => 
            n && typeof n === 'object' && typeof n.id === 'string' && n.position && typeof n.position === 'object'
          );
          if (!validNodes) {
            showToast(t('canvas.invalidFile'), 'error');
            return;
          }
          useCanvasStore.setState({
            nodes: json.nodes,
            edges: json.edges,
            processName: file.name.replace('.json', ''),
            currentProcessId: null
          });
          showToast(t('errors.importedSuccess'), 'success');
        } else {
          showToast(t('canvas.invalidFile'), 'error');
        }
      } catch {
        showToast(t('canvas.importError'), 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return { fileInputRef, handleExport, handleMarkdownExport, handleImport };
}
