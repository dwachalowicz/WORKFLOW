import JSZip from 'jszip';
import { pb } from '@/lib/pocketbase';
import { sanitizeForFilter } from '@/lib/parseUtils';

/**
 * Cleans up internal PocketBase fields for clean export
 */
const cleanRecords = (records: Record<string, unknown>[]) => records.map(r => {
  const cleanRecord = { ...r };
  delete cleanRecord.expand;
  delete cleanRecord.collectionId;
  delete cleanRecord.collectionName;
  return cleanRecord;
});

/**
 * Exports all user-owned workspaces and user settings into a global ZIP file.
 */
export async function exportGlobalBackup(userId: string) {
  try {
    // 1. Fetch user data (exclude AI config and sensitive fields)
    const userRecord = await pb.collection('WORKFLOW_users').getOne(userId);
    const userExport = { ...userRecord };
    delete userExport.expand;
    delete userExport.collectionId;
    delete userExport.collectionName;
    
    // Exclude AI-related settings explicitly
    Object.keys(userExport).forEach((key) => {
      if (key.startsWith('ai_')) {
        delete userExport[key];
      }
    });

    // 2. Fetch all workspaces owned by the user
    const workspaces = await pb.collection('WORKFLOW_workspaces').getFullList({
      filter: `owner = "${sanitizeForFilter(userId)}"`,
    });

    // 3. For each workspace, fetch all related data
    const workspacesData = [];
    
    for (const ws of workspaces) {
      const wsId = ws.id;
      const processes = await pb.collection('WORKFLOW_processes').getFullList({ filter: `workspace = "${wsId}"` });
      const processGroups = await pb.collection('WORKFLOW_process_groups').getFullList({ filter: `workspace = "${wsId}"` });
      const groups = await pb.collection('WORKFLOW_groups').getFullList({ filter: `workspace = "${wsId}"` });
      const members = await pb.collection('WORKFLOW_workspace_members').getFullList({ filter: `workspace = "${wsId}"` });
      const layouts = await pb.collection('WORKFLOW_process_map_layouts').getFullList({ filter: `workspace = "${wsId}"` });

      let commentsData: Record<string, unknown>[] = [];
      try {
        commentsData = await pb.collection('WORKFLOW_comments').getFullList({ filter: `process.workspace = "${wsId}"` });
      } catch(e) { console.error('Failed to fetch comments for workspace', wsId, e); }

      const cleanWs = { ...ws };
      delete cleanWs.expand;
      delete cleanWs.collectionId;
      delete cleanWs.collectionName;

      workspacesData.push({
        workspace: cleanWs,
        processes: cleanRecords(processes),
        processGroups: cleanRecords(processGroups),
        groups: cleanRecords(groups),
        members: cleanRecords(members),
        layouts: cleanRecords(layouts),
        comments: cleanRecords(commentsData),
      });
    }

    const backupData = {
      version: 2,
      type: 'global',
      timestamp: new Date().toISOString(),
      user: userExport,
      workspacesData,
    };

    // 4. Create ZIP
    const zip = new JSZip();
    zip.file('global_backup.json', JSON.stringify(backupData, null, 2));

    // Fetch and add avatars concurrently
    const avatarPromises: Promise<void>[] = [];

    for (const wsData of workspacesData) {
      // Workspace avatar
      if (wsData.workspace.avatar) {
        avatarPromises.push((async () => {
          try {
            const url = `${pb.baseUrl}/api/files/WORKFLOW_workspaces/${wsData.workspace.id}/${wsData.workspace.avatar}`;
            const res = await fetch(url, { headers: { Authorization: pb.authStore.token } });
            if (res.ok) {
              const blob = await res.blob();
              zip.file(`avatars/${wsData.workspace.id}_${wsData.workspace.avatar}`, blob);
            }
          } catch (e) {
            console.error('Failed to export workspace avatar', e);
          }
        })());
      }

      // Group avatars
      for (const group of wsData.groups) {
        if (group.avatar) {
          avatarPromises.push((async () => {
            try {
              const url = `${pb.baseUrl}/api/files/WORKFLOW_groups/${group.id}/${group.avatar}`;
              const res = await fetch(url, { headers: { Authorization: pb.authStore.token } });
              if (res.ok) {
                const blob = await res.blob();
                zip.file(`avatars/${group.id}_${group.avatar}`, blob);
              }
            } catch (e) {
              console.error('Failed to export avatar', e);
            }
          })());
        }
      }
    }
    
    await Promise.all(avatarPromises);

    const content = await zip.generateAsync({ type: 'blob' });
    
    // 5. Download
    const fileName = `gryf_global_backup_${new Date().toISOString().split('T')[0]}.zip`;
    
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (err) {
    console.error('Export failed:', err);
    throw new Error('export_failed', { cause: err });
  }
}

/**
 * Imports a global backup from a ZIP file.
 * Clones the data by generating NEW IDs for all imported records, mapping relations,
 * and adds them to the current user's account safely without deleting existing workspaces.
 */
export async function importGlobalBackup(file: File, userId: string) {
  let importedCount = 0;
  
  try {
    // 1. Unzip and parse
    const zip = await JSZip.loadAsync(file);
    let backupFile = zip.file('global_backup.json');
    
    // Fallback for previous single-workspace backup format
    if (!backupFile) {
      backupFile = zip.file('backup.json');
      if (backupFile) {
        throw new Error('single_workspace_backup_not_supported_here');
      }
      throw new Error('invalid_zip');
    }
    
    const jsonStr = await backupFile.async('string');
    const backup = JSON.parse(jsonStr);

    if (backup.type !== 'global' || !backup.workspacesData || !backup.user) {
      throw new Error('invalid_format');
    }

    const oldUserId = backup.user.id;

    // We no longer delete existing workspaces. This allows safe cloning.

    // 2. Prepare ID mapping
    const idMap = new Map<string, string>(); // oldId -> newId

    // Helper to create collection records with new IDs and map them
    const insertRecords = async (
      collectionName: string, 
      records: Record<string, unknown>[], 
      transformFn?: (record: Record<string, unknown>) => Record<string, unknown>
    ) => {
      for (const record of records) {
        const oldId = record.id;
        delete record.id;
        delete record.created;
        delete record.updated;
        
        const transformed = transformFn ? transformFn({ ...record }) : { ...record };
        
        try {
          const created = await pb.collection(collectionName).create(transformed);
          if (oldId) idMap.set(oldId, created.id);
          // Add a small delay to prevent network saturation / rate limits during heavy imports
          await new Promise(resolve => setTimeout(resolve, 20));
        } catch (e) {
          throw e;
        }
      }
    };

    // 3. Restore data from backup (Order matters!)
    for (const wsData of backup.workspacesData) {
      // 3.1 Create Workspace
      const wsRecord: Record<string, unknown> = { ...wsData.workspace };
      const oldWsId = wsRecord.id;
      delete wsRecord.id;
      delete wsRecord.created;
      delete wsRecord.updated;
      wsRecord.owner = userId; // Transfer ownership to the importer
      
      let wsDataToUpload: Record<string, unknown> | FormData = wsRecord;

      if (wsRecord.avatar) {
        const avatarFile = zip.file(`avatars/${oldWsId}_${wsRecord.avatar}`);
        if (avatarFile) {
          const blob = await avatarFile.async('blob');
          const formData = new FormData();
          for (const key in wsRecord) {
            if (wsRecord[key] !== null && wsRecord[key] !== undefined && key !== 'avatar') {
              formData.append(key, String(wsRecord[key]));
            }
          }
          formData.append('avatar', blob, String(wsRecord.avatar));
          wsDataToUpload = formData;
        } else {
          delete wsRecord.avatar;
        }
      }

      let newWsId = '';
      try {
        const createdWs = await pb.collection('WORKFLOW_workspaces').create(wsDataToUpload);
        newWsId = createdWs.id;
        idMap.set(oldWsId, newWsId);
        importedCount++;
      } catch (e) {
        console.error(`Failed to restore workspace ${oldWsId}:`, e);
        
        throw e;
      }

      // 3.2 Create Groups (Folders)
      await insertRecords('WORKFLOW_process_groups', wsData.processGroups || [], (r) => ({
        ...r,
        workspace: newWsId
      }));

      // 3.3 Create Permission Groups
      for (const oldGroup of (wsData.groups || [])) {
        const transformed: Record<string, unknown> = { ...oldGroup, workspace: newWsId };
        const oldId = transformed.id;
        delete transformed.id;
        delete transformed.created;
        delete transformed.updated;
        
        let dataToUpload: Record<string, unknown> | FormData = transformed;
        
        if (oldGroup.avatar) {
          const avatarFile = zip.file(`avatars/${oldId}_${oldGroup.avatar}`);
          if (avatarFile) {
            const blob = await avatarFile.async('blob');
            const formData = new FormData();
            for (const key in transformed) {
              if (transformed[key] !== null && transformed[key] !== undefined && key !== 'avatar') {
                formData.append(key, String(transformed[key]));
              }
            }
            formData.append('avatar', blob, String(oldGroup.avatar));
            dataToUpload = formData;
          } else {
            delete transformed.avatar;
          }
        }

        try {
          const created = await pb.collection('WORKFLOW_groups').create(dataToUpload);
          if (oldId) idMap.set(oldId, created.id);
          await new Promise(resolve => setTimeout(resolve, 20));
        } catch (e) {
          console.error(`Failed to restore group:`, e);
        }
      }

      // 3.4 Create Members (Only preserve the importing user to create a safe, isolated clone)
      const ownerMembers = (wsData.members || []).filter((r: Record<string, unknown>) => r.user === oldUserId);
      await insertRecords('WORKFLOW_workspace_members', ownerMembers, (r) => {
        return {
          ...r,
          workspace: newWsId,
          user: userId // Assign membership to the importing user
        };
      });

      // 3.5 Create Processes
      await insertRecords('WORKFLOW_processes', wsData.processes || [], (r) => {
        const mappedGroup = r.group ? idMap.get(String(r.group)) : null;
        
        // Deep remap any triggerSubworkflow nodes
        let nodes = r.nodes;
        if (nodes && Array.isArray(nodes)) {
          nodes = nodes.map(node => {
            if (node.data && node.data.targetWorkflowId) {
              const mappedTargetId = idMap.get(node.data.targetWorkflowId) || node.data.targetWorkflowId;
              return { ...node, data: { ...node.data, targetWorkflowId: mappedTargetId } };
            }
            return node;
          });
        }

        // We don't export avatar files for processes, so we must remove the string filename to prevent PocketBase 400 Bad Request
        delete r.avatar;

        return {
          ...r,
          owner: userId, // Ensure new owner gets the processes
          workspace: newWsId,
          group: mappedGroup || '',
          nodes: nodes
        };
      });

      // 3.6 Create Comments
      // Filter out comments whose processes failed to restore to avoid attaching them to old processes
      const validComments = (wsData.comments || []).filter((r: Record<string, unknown>) => idMap.has(String(r.process)));
      await insertRecords('WORKFLOW_comments', validComments, (r) => {
        const mappedProcess = idMap.get(String(r.process));
        const isOriginalOwner = r.author === oldUserId;
        return {
          ...r,
          process: mappedProcess, // Use exclusively the new cloned process ID
          author: userId, // Safe impersonation prevention: importing user owns all restored comments
          content: !isOriginalOwner ? `<p><em>[Kopia - z innego konta]</em></p> ${r.content || ''}` : r.content
        };
      });

      // We need to do a second pass on Processes if there are circular triggerSubworkflow references
      // However, we just mapped them based on what was created so far. Wait, if Process A triggers Process B,
      // and Process A is created BEFORE Process B, idMap won't have Process B yet!
      // So we need to update nodes in a separate pass AFTER all processes are created.
    }

    // 4. Second Pass for Inter-Process References & Layouts
    for (const wsData of backup.workspacesData) {
      const newWsId = idMap.get(wsData.workspace.id);
      if (!newWsId) continue;

      // Update processes with mapped targetWorkflowIds now that all processes have new IDs
      for (const oldProc of (wsData.processes || [])) {
        const newProcId = idMap.get(oldProc.id);
        if (!newProcId) continue;

        let needsUpdate = false;
        let nodes = oldProc.nodes;
        if (nodes && Array.isArray(nodes)) {
          nodes = nodes.map((node: { data?: { targetWorkflowId?: string; [key: string]: unknown }; [key: string]: unknown }) => {
            if (node.data && node.data.targetWorkflowId && idMap.has(node.data.targetWorkflowId)) {
              needsUpdate = true;
              return { ...node, data: { ...node.data, targetWorkflowId: idMap.get(node.data.targetWorkflowId) } };
            }
            return node;
          });
        }

        if (needsUpdate) {
          await pb.collection('WORKFLOW_processes').update(newProcId, { nodes }).catch(console.error);
        }
      }

      // Remap Process Map Layouts
      for (const oldLayout of (wsData.layouts || [])) {
        const newPositions: Record<string, unknown> = {};
        if (oldLayout.positions && typeof oldLayout.positions === 'object') {
          for (const [oldProcId, pos] of Object.entries(oldLayout.positions)) {
            const mappedProcId = idMap.get(oldProcId) || oldProcId;
            newPositions[mappedProcId] = pos;
          }
        }

        try {
          await pb.collection('WORKFLOW_process_map_layouts').create({
            workspace: newWsId,
            positions: newPositions
          });
        } catch (e) {
          console.error('Failed to create layout', e);
        }
      }
    }

    // 5. Update user settings
    // Removed to prevent Privilege Escalation vulnerabilities via JSON modification.
    // A global backup import    // We are deliberately NOT updating the user profile from the backup.
    
    return { imported: importedCount,  };

  } catch (err) {
    console.error('Import failed:', err);
    throw err;
  }
}
