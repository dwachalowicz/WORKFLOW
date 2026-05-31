import dagre from 'dagre';
import { type Node, type Edge } from '@xyflow/react';

// Standard node dimensions
const nodeWidth = 280;
const nodeHeight = 150;

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  const targetRotation = isHorizontal ? 0 : 90;

  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 80, // Decreased from 120 for a more compact layout
    ranksep: 200, // Decreased from 250 for a more compact layout
    edgesep: 50
  });

  nodes.forEach((node) => {
    if (node.type !== 'note') {
      // React Flow nodes do not physically change dimensions upon 'rotation'
      // Rotation in this system only means displacing connection points (handles)
      let w = nodeWidth;
      let h = nodeHeight;
      
      // Smaller dimensions for small nodes
      if (node.type === 'database' || node.type === 'startstop') {
        w = 64;
        h = 64;
      }

      dagreGraph.setNode(node.id, { width: w, height: h });
    }
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    if (node.type === 'note') {
      return node; // Return note in an unchanged position
    }
    
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // If for some reason the node lacks position in dagre, return unchanged
    if (!nodeWithPosition) return node;

    // Retrieve dimensions used for this node in Dagre
    const w = dagreGraph.node(node.id).width;
    const h = dagreGraph.node(node.id).height;

    const newNode = {
      ...node,
      data: {
        ...node.data,
        rotation: targetRotation // Force connection points rotation according to layout direction
      },
      position: {
        x: nodeWithPosition.x - w / 2, // React Flow oczekuje x,y oryginalnego top-left
        y: nodeWithPosition.y - h / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};
