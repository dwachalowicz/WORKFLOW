import type { Node } from '@xyflow/react';

export function getDefaultProcessNodes(): Node[] {
  return [
    {
      id: 'start-1',
      type: 'startstop',
      position: { x: 250, y: 50 },
      deletable: false,
      data: { type: 'start', label: 'Start' }
    },
    {
      id: '1',
      type: 'simple',
      position: { x: 250, y: 200 },
      data: {
        label: 'Process Start',
        description: 'Process start',
        maxDuration: '2h',
        editors: [
          { name: 'Manager', avatar: 'https://ui-avatars.com/api/?name=Mg&background=bc9b59&color=fff' },
          { name: 'Developer', avatar: 'https://ui-avatars.com/api/?name=Dev&background=3b82f6&color=fff' }
        ],
        readers: [
          { name: 'Auditor', avatar: 'https://ui-avatars.com/api/?name=Au&background=1f2937&color=fff' }
        ],
        checklist: [{ id: 'c1', label: 'Verify document correctness', required: true }],
        variables: [{ id: 'v1', name: 'NIP', type: 'text', required: true }]
      }
    }
  ];
}
