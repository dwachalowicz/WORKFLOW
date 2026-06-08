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
            showToast(t('canvas.tooManyNodes'), 'error');
            return;
          }
          if (json.edges.length > 1000) {
            showToast(t('canvas.tooManyEdges'), 'error');
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

  const handlePdfExport = async () => {
    try {
      const { toJpeg } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      const { getNodesBounds, getViewportForBounds } = await import('@xyflow/react');
      
      const state = useCanvasStore.getState();
      if (state.nodes.length === 0) {
        showToast(t('canvas.noNodesToExport') || t('canvas.exportError'), 'error');
        return;
      }

      showToast(t('canvas.exportingPdf') || t('common.loading'), 'info');

      const nodesBounds = getNodesBounds(state.nodes);
      const padding = 100;
      const imageWidth = nodesBounds.width + padding * 2;
      const imageHeight = nodesBounds.height + padding * 2;
      
      const transform = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.1,
        2,
        0.1
      );
      
      const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportElement) throw new Error('Viewport not found');

      // html-to-image allows overriding styles on the cloned node for capture
      const dataUrl = await toJpeg(viewportElement, {
        quality: 0.95,
        pixelRatio: 2.0,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f1115' : '#ffffff',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
        },
      });

      const pdf = new jsPDF({
        orientation: imageWidth > imageHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imageWidth, imageHeight]
      });
      
      pdf.addImage(dataUrl, 'JPEG', 0, 0, imageWidth, imageHeight);

      // Add gryf.ai logo and link
      try {
        const svgRes = await fetch('/gryf-ai-logo.svg');
        if (svgRes.ok) {
          let svgText = await svgRes.text();
          // Replace currentColor with brand gold hex if present
          svgText = svgText.replace(/currentColor/g, '#C4A052');
          
          const img = new Image();
          const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            img.src = url;
          });
          
          if (img.width > 0) {
            const canvas = document.createElement('canvas');
            const logoWidth = 24;
            const logoHeight = (img.height / img.width) * logoWidth || 24;
            // Higher resolution for canvas to avoid blurriness
            canvas.width = logoWidth * 4;
            canvas.height = logoHeight * 4;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.scale(4, 4);
              ctx.drawImage(img, 0, 0, logoWidth, logoHeight);
              const pngData = canvas.toDataURL('image/png');
              
              const startX = 30;
              const startY = imageHeight - 40;
              
              pdf.addImage(pngData, 'PNG', startX, startY, logoWidth, logoHeight);
              
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(18);
              pdf.setTextColor(196, 160, 82); // #C4A052 (Brand gold)
              pdf.text('gryf.ai', startX + logoWidth + 8, startY + 18);
              
              // Clickable link covering the logo and text
              pdf.link(startX, startY, logoWidth + 80, Math.max(logoHeight, 24), { url: 'https://gryf.ai' });
            }
          }
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        console.warn('Could not add logo to PDF', e);
      }

      pdf.save(`${state.processName || 'proces'}.pdf`);
      
      showToast(t('canvas.exported'), 'success');
    } catch (err) {
      console.error("Error exporting PDF:", err);
      showToast(t('canvas.exportError'), 'error');
    }
  };

  return { fileInputRef, handleExport, handleMarkdownExport, handlePdfExport, handleImport };
}
