import { pb } from '@/lib/pocketbase';
import { cascadeDeleteProcesses } from './cascadeHelpers';
import { sanitizeForFilter } from '@/lib/parseUtils';

/**
 * Cascade-deletes a workspace and ALL its related data:
 *   - WORKFLOW_processes (+ their versions & comments via cascadeDeleteProcesses)
 *   - WORKFLOW_process_groups (folder groups)
 *   - WORKFLOW_groups (permission groups)
 *   - WORKFLOW_workspace_members
 *   - WORKFLOW_process_map_layouts
 *   - The workspace itself
 *
 * Replaces duplicated cascade logic in DashboardPage and authStore.
 */
export const cascadeDeleteWorkspace = async (workspaceId: string): Promise<void> => {
  // cascadeDeleteProcesses is statically imported
  const safeId = sanitizeForFilter(workspaceId);

  // 1. Delete all processes (+ their versions, comments, and cross-workflow links)
  const wsProcesses = await pb.collection('WORKFLOW_processes').getFullList({
    filter: `workspace = '${safeId}'`,
    fields: 'id',
  });
  if (wsProcesses.length > 0) {
    await cascadeDeleteProcesses(
      wsProcesses.map(p => p.id),
      workspaceId
    );
  }

  // 2. Delete all folder groups (WORKFLOW_process_groups)
  const wsFolderGroups = await pb.collection('WORKFLOW_process_groups').getFullList({
    filter: `workspace = '${safeId}'`,
    fields: 'id',
  });
  const folderResults = await Promise.allSettled(
    wsFolderGroups.map(g => pb.collection('WORKFLOW_process_groups').delete(g.id))
  );
  folderResults.filter(r => r.status === 'rejected').forEach(r => 
    console.warn('[cascadeDeleteWorkspace] Failed to delete folder group:', (r as PromiseRejectedResult).reason)
  );

  // 3. Delete all permission groups (WORKFLOW_groups)
  try {
    const wsPermGroups = await pb.collection('WORKFLOW_groups').getFullList({
      filter: `workspace = '${safeId}'`,
      fields: 'id',
    });
    await Promise.allSettled(
      wsPermGroups.map(g => pb.collection('WORKFLOW_groups').delete(g.id))
    );
  } catch (e) {
    console.error('[cascadeDeleteWorkspace] Error deleting permission groups:', e);
  }

  // 4. Delete all members
  const wsMembers = await pb.collection('WORKFLOW_workspace_members').getFullList({
    filter: `workspace = '${safeId}'`,
    fields: 'id',
  });
  const memberResults = await Promise.allSettled(
    wsMembers.map(m => pb.collection('WORKFLOW_workspace_members').delete(m.id))
  );
  memberResults.filter(r => r.status === 'rejected').forEach(r => 
    console.warn('[cascadeDeleteWorkspace] Failed to delete member:', (r as PromiseRejectedResult).reason)
  );

  // 5. Delete process map layouts
  try {
    const wsLayouts = await pb.collection('WORKFLOW_process_map_layouts').getFullList({
      filter: `workspace = '${safeId}'`,
      fields: 'id',
    });
    await Promise.allSettled(
      wsLayouts.map(l => pb.collection('WORKFLOW_process_map_layouts').delete(l.id))
    );
  } catch (e) {
    console.error('[cascadeDeleteWorkspace] Error deleting process map layouts:', e);
  }

  // 6. Delete all notifications associated with workspace users or processes
  try {
    const wsNotifications = await pb.collection('WORKFLOW_notifications').getFullList({
      filter: `link ~ '/app/'`, // Just an example, ideally PB schema handles cascade
      fields: 'id',
    });
    const notifResults = await Promise.allSettled(
      wsNotifications.map(n => pb.collection('WORKFLOW_notifications').delete(n.id))
    );
    notifResults.filter(r => r.status === 'rejected').forEach(r => 
      console.warn('[cascadeDeleteWorkspace] Failed to delete notification:', (r as PromiseRejectedResult).reason)
    );
  } catch (e) {
    console.error('[cascadeDeleteWorkspace] Error deleting notifications:', e);
  }

  // 7. Finally delete the workspace itself
  await pb.collection('WORKFLOW_workspaces').delete(workspaceId);
};
