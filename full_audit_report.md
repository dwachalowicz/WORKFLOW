# Full Database Audit Report
Generated: 2026-06-02T08:59:58.254Z

## 1. Collections Schema

### WORKFLOW_users
- Type: auth
- Total records: 3
- Fields:
  - `id` (text) [REQUIRED]
  - `password` (password) [REQUIRED]
  - `tokenKey` (text) [REQUIRED]
  - `email` (email) [REQUIRED]
  - `emailVisibility` (bool)
  - `verified` (bool)
  - `name` (text)
  - `avatar` (file)
  - `typ` (select)
  - `created` (autodate)
  - `updated` (autodate)
  - `tier` (select)
  - `tier_expires_at` (date)
  - `ai_source` (text)
  - `ai_provider` (text)
  - `ai_api_key` (text)
  - `ai_model` (text)
  - `ai_temperature` (number)
  - `ai_custom_memory` (number)
- Sample record keys: ai_api_key, ai_custom_memory, ai_model, ai_provider, ai_source, ai_temperature, avatar, collectionId, collectionName, created, email, emailVisibility, id, name, tier, tier_expires_at, typ, updated, verified

### KATALOG_NARZEDZI
- Type: base
- Total records: 123
- Fields:
  - `id` (text) [REQUIRED]
  - `NAZWA` (text)
  - `OPIS` (text)
  - `OPIS_PELNY` (text)
  - `URL` (url)
  - `url_film` (url)
  - `LOGO` (file)
  - `AKTYWNE` (bool)
  - `tagi` (relation)
    - Related collection: pbc_3792472518
    - Cascade delete: false
    - Max select: 999
  - `created` (autodate)
  - `updated` (autodate)
  - `DATA_DEBIUTU` (date)
  - `bole` (relation)
    - Related collection: pbc_2007120239
    - Cascade delete: false
    - Max select: 999
  - `potrzeby` (relation)
    - Related collection: pbc_975783338
    - Cascade delete: false
    - Max select: 999
- Sample record keys: AKTYWNE, DATA_DEBIUTU, LOGO, NAZWA, OPIS, OPIS_PELNY, URL, bole, collectionId, collectionName, created, id, potrzeby, tagi, updated, url_film

### WORKFLOW_processes
- Type: base
- Total records: 2
- Fields:
  - `id` (text) [REQUIRED]
  - `name` (text)
  - `owner` (relation)
    - Related collection: _pb_users_auth_
    - Cascade delete: false
    - Max select: 1
  - `nodes` (json)
  - `edges` (json)
  - `created` (autodate)
  - `updated` (autodate)
  - `workspace` (relation)
    - Related collection: pbc_247618204
    - Cascade delete: true
    - Max select: 1
  - `group` (relation)
    - Related collection: procgrps0000
    - Cascade delete: true
    - Max select: 1
  - `isPublic` (bool)
  - `publicPassword` (text)
  - `avatar` (file)
  - `lastEditedBy` (relation)
    - Related collection: _pb_users_auth_
    - Cascade delete: false
    - Max select: 1
  - `locked_by` (relation)
    - Related collection: _pb_users_auth_
    - Cascade delete: false
    - Max select: 1
  - `locked_at` (date)
  - `icon` (text)
- Sample record keys: avatar, collectionId, collectionName, created, edges, group, icon, id, isPublic, lastEditedBy, locked_at, locked_by, name, nodes, owner, publicPassword, updated, workspace

### WORKFLOW_workspaces
- Type: base
- Total records: 3
- Fields:
  - `id` (text) [REQUIRED]
  - `owner` (relation) [REQUIRED]
    - Related collection: _pb_users_auth_
    - Cascade delete: false
    - Max select: 1
  - `created` (autodate)
  - `updated` (autodate)
  - `name` (text) [REQUIRED]
  - `avatar` (file)
  - `join_code` (text)
  - `icon` (text)
- Sample record keys: avatar, collectionId, collectionName, created, icon, id, join_code, name, owner, updated

### WORKFLOW_workspace_members
- Type: base
- Total records: 1
- Fields:
  - `id` (text) [REQUIRED]
  - `workspace` (relation) [REQUIRED]
    - Related collection: pbc_247618204
    - Cascade delete: true
    - Max select: 1
  - `user` (relation)
    - Related collection: _pb_users_auth_
    - Cascade delete: true
    - Max select: 1
  - `role` (select) [REQUIRED]
  - `status` (select) [REQUIRED]
  - `invited_email` (text)
  - `created` (autodate)
  - `updated` (autodate)
  - `invited_by` (relation)
    - Related collection: _pb_users_auth_
    - Cascade delete: false
    - Max select: 1
- Sample record keys: collectionId, collectionName, created, id, invited_by, invited_email, role, status, updated, user, workspace

### WORKFLOW_process_groups
- Type: base
- Total records: 3
- Fields:
  - `id` (text) [REQUIRED]
  - `name` (text) [REQUIRED]
  - `workspace` (relation) [REQUIRED]
    - Related collection: pbc_247618204
    - Cascade delete: true
    - Max select: 1
  - `avatar` (file)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: avatar, collectionId, collectionName, created, id, name, updated, workspace

### WORKFLOW_versions
- Type: base
- Total records: 4
- Fields:
  - `id` (text) [REQUIRED]
  - `process` (relation) [REQUIRED]
    - Related collection: pbc_1057243144
    - Cascade delete: true
    - Max select: 1
  - `version_number` (number) [REQUIRED]
  - `label` (text)
  - `nodes_data` (json)
  - `edges_data` (json)
  - `process_name` (text)
  - `created_by` (relation) [REQUIRED]
    - Related collection: _pb_users_auth_
    - Cascade delete: false
    - Max select: 1
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: collectionId, collectionName, created, created_by, edges_data, id, label, nodes_data, process, process_name, updated, version_number

### WORKFLOW_prompts
- Type: base
- Total records: 1
- Fields:
  - `id` (text) [REQUIRED]
  - `key` (text) [REQUIRED]
  - `content` (editor)
  - `active` (bool)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: active, collectionId, collectionName, content, created, id, key, updated

### WORKFLOW_quick_prompts
- Type: base
- Total records: 5
- Fields:
  - `id` (text) [REQUIRED]
  - `label` (text) [REQUIRED]
  - `prompt` (text) [REQUIRED]
  - `context` (select) [REQUIRED]
  - `active` (bool)
  - `sort_order` (number)
  - `created` (autodate)
  - `updated` (autodate)
  - `label_en` (text)
  - `prompt_en` (text)
- Sample record keys: active, collectionId, collectionName, context, created, id, label, label_en, prompt, prompt_en, sort_order, updated

### WORKFLOW_comments
- Type: base
- Total records: 1
- Fields:
  - `id` (text) [REQUIRED]
  - `process` (relation) [REQUIRED]
    - Related collection: pbc_1057243144
    - Cascade delete: false
    - Max select: 1
  - `node_id` (text) [REQUIRED]
  - `author` (relation) [REQUIRED]
    - Related collection: _pb_users_auth_
    - Cascade delete: false
    - Max select: 1
  - `content` (text) [REQUIRED]
  - `resolved` (bool)
  - `created` (autodate)
  - `updated` (autodate)
  - `parent_id` (relation)
    - Related collection: pbc_394420970
    - Cascade delete: true
    - Max select: 1
- Sample record keys: author, collectionId, collectionName, content, created, id, node_id, parent_id, process, resolved, updated

### WORKFLOW_site_settings
- Type: base
- Total records: 1
- Fields:
  - `id` (text) [REQUIRED]
  - `analytics_script` (text)
  - `marketing_script` (text)
  - `seo_title` (text)
  - `seo_description` (text)
  - `partner_view` (bool)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: analytics_script, collectionId, collectionName, created, id, marketing_script, partner_view, seo_description, seo_title, updated

### WORKFLOW_groups
- Type: base
- Total records: 0
- Fields:
  - `id` (text) [REQUIRED]
  - `name` (text) [REQUIRED]
  - `workspace` (relation) [REQUIRED]
    - Related collection: pbc_247618204
    - Cascade delete: true
    - Max select: 1
  - `process` (relation)
    - Related collection: pbc_1057243144
    - Cascade delete: false
    - Max select: 1
  - `avatar` (file)
  - `color` (text)
  - `created` (autodate)
  - `updated` (autodate)

### WORKFLOW_templates
- Type: base
- Total records: 5
- Fields:
  - `id` (text) [REQUIRED]
  - `name` (text) [REQUIRED]
  - `description` (text)
  - `category` (text)
  - `nodes_data` (json)
  - `edges_data` (json)
  - `preview_image` (file)
  - `tier_required` (select)
  - `active` (bool)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: active, category, collectionId, collectionName, created, description, edges_data, id, name, nodes_data, preview_image, tier_required, updated

### WORKFLOW_pages
- Type: base
- Total records: 2
- Fields:
  - `id` (text) [REQUIRED]
  - `slug` (text) [REQUIRED]
  - `title` (text) [REQUIRED]
  - `content` (editor)
  - `published` (bool)
  - `sort_order` (number)
  - `seo_title` (text)
  - `seo_description` (text)
  - `title_en` (text)
  - `content_en` (editor)
  - `seo_title_en` (text)
  - `seo_description_en` (text)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: collectionId, collectionName, content, content_en, created, id, published, seo_description, seo_description_en, seo_title, seo_title_en, slug, sort_order, title, title_en, updated

### WORKFLOW_process_map_layouts
- Type: base
- Total records: 0
- Fields:
  - `id` (text) [REQUIRED]
  - `workspace` (relation) [REQUIRED]
    - Related collection: pbc_247618204
    - Cascade delete: true
    - Max select: 1
  - `positions` (json)
  - `created` (autodate)
  - `updated` (autodate)

### WORKFLOW_platform_settings
- Type: base
- Total records: 1
- Fields:
  - `id` (text) [REQUIRED]
  - `key` (text) [REQUIRED]
  - `ai_api_key` (text)
  - `ai_provider` (text)
  - `ai_model` (text)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: ai_api_key, ai_model, ai_provider, collectionId, collectionName, created, id, key, updated

### WORKFLOW_tier_config
- Type: base
- Total records: 3
- Fields:
  - `id` (text) [REQUIRED]
  - `tier` (text) [REQUIRED]
  - `label` (text) [REQUIRED]
  - `sort_order` (number)
  - `price_monthly` (number)
  - `price_annual` (number)
  - `color` (text)
  - `bg_color` (text)
  - `max_workspaces` (number)
  - `max_processes` (number)
  - `max_versions_per_process` (number)
  - `max_nodes_per_process` (number)
  - `max_edges_per_process` (number)
  - `max_notes_per_process` (number)
  - `max_members_per_workspace` (number)
  - `max_groups_per_workspace` (number)
  - `max_comments_per_process` (number)
  - `max_variables_per_process` (number)
  - `max_checklist_items_per_node` (number)
  - `ai_access` (text)
  - `ai_memory_length` (number)
  - `ai_multimodal` (bool)
  - `can_use_templates` (bool)
  - `can_present` (bool)
  - `can_use_subworkflows` (bool)
  - `can_use_cross_workflow_triggers` (bool)
  - `can_use_process_map` (bool)
  - `can_share_public` (bool)
  - `can_share_with_password` (bool)
  - `can_use_advanced_stats` (bool)
  - `audit_log_days` (number)
  - `support_level` (text)
  - `price_monthly_pln` (number)
  - `price_annual_pln` (number)
  - `price_monthly_eur` (number)
  - `price_annual_eur` (number)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: ai_access, ai_memory_length, ai_multimodal, audit_log_days, bg_color, can_present, can_share_public, can_share_with_password, can_use_advanced_stats, can_use_cross_workflow_triggers, can_use_process_map, can_use_subworkflows, can_use_templates, collectionId, collectionName, color, created, id, label, max_checklist_items_per_node, max_comments_per_process, max_edges_per_process, max_groups_per_workspace, max_members_per_workspace, max_nodes_per_process, max_notes_per_process, max_processes, max_variables_per_process, max_versions_per_process, max_workspaces, price_annual, price_annual_eur, price_annual_pln, price_monthly, price_monthly_eur, price_monthly_pln, sort_order, support_level, tier, updated

### WORKFLOW_ai_models
- Type: base
- Total records: 13
- Fields:
  - `id` (text) [REQUIRED]
  - `label` (text) [REQUIRED]
  - `model_id` (text) [REQUIRED]
  - `provider` (select) [REQUIRED]
  - `active` (bool)
  - `sort_order` (number)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: active, collectionId, collectionName, created, id, label, model_id, provider, sort_order, updated

### landing_translations
- Type: base
- Total records: 9
- Fields:
  - `id` (text) [REQUIRED]
- Sample record keys: collectionId, collectionName, id

### WORKFLOW_contact_messages
- Type: base
- Total records: 24
- Fields:
  - `id` (text) [REQUIRED]
  - `email` (email)
  - `message` (text)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: collectionId, collectionName, created, email, id, message, updated

### WORKFLOW_faq
- Type: base
- Total records: 28
- Fields:
  - `id` (text) [REQUIRED]
  - `category_pl` (text) [REQUIRED]
  - `category_en` (text) [REQUIRED]
  - `question_pl` (text) [REQUIRED]
  - `question_en` (text) [REQUIRED]
  - `answer_pl` (editor) [REQUIRED]
  - `answer_en` (editor) [REQUIRED]
  - `order` (number) [REQUIRED]
  - `is_active` (bool)
  - `icon` (text)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: answer_en, answer_pl, category_en, category_pl, collectionId, collectionName, created, icon, id, is_active, order, question_en, question_pl, updated

### WORKFLOW_process_cases
- Type: base
- Total records: 6
- Fields:
  - `id` (text) [REQUIRED]
  - `title_pl` (text) [REQUIRED]
  - `title_en` (text) [REQUIRED]
  - `shortTitle_pl` (text) [REQUIRED]
  - `shortTitle_en` (text) [REQUIRED]
  - `description_pl` (text) [REQUIRED]
  - `description_en` (text) [REQUIRED]
  - `avatar` (url)
  - `strokeColor` (text)
  - `strokeDasharray` (text)
  - `footerTitle_pl` (text)
  - `footerTitle_en` (text)
  - `footerSubtitle_pl` (text)
  - `footerSubtitle_en` (text)
  - `link` (url)
  - `order` (number) [REQUIRED]
  - `is_active` (bool)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: avatar, collectionId, collectionName, created, description_en, description_pl, footerSubtitle_en, footerSubtitle_pl, footerTitle_en, footerTitle_pl, id, is_active, link, order, shortTitle_en, shortTitle_pl, strokeColor, strokeDasharray, title_en, title_pl, updated

### WORKFLOW_ai_services
- Type: base
- Total records: 6
- Fields:
  - `id` (text) [REQUIRED]
  - `icon_name` (text)
  - `title_pl` (text)
  - `title_en` (text)
  - `description_pl` (text)
  - `description_en` (text)
  - `order` (number)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: collectionId, collectionName, created, description_en, description_pl, icon_name, id, order, title_en, title_pl, updated

### WORKFLOW_pricing
- Type: base
- Total records: 3
- Fields:
  - `id` (text) [REQUIRED]
  - `plan_name_pl` (text) [REQUIRED]
  - `plan_name_en` (text) [REQUIRED]
  - `description_pl` (text) [REQUIRED]
  - `description_en` (text) [REQUIRED]
  - `features_pl` (json)
  - `features_en` (json)
  - `order` (number) [REQUIRED]
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: collectionId, collectionName, created, description_en, description_pl, features_en, features_pl, id, order, plan_name_en, plan_name_pl, updated

### WORKFLOW_notifications
- Type: base
- Total records: 9
- Fields:
  - `id` (text) [REQUIRED]
  - `user` (relation) [REQUIRED]
    - Related collection: _pb_users_auth_
    - Cascade delete: true
    - Max select: 1
  - `title` (text) [REQUIRED]
  - `message` (text) [REQUIRED]
  - `type` (text) [REQUIRED]
  - `isRead` (bool)
  - `link` (text)
  - `created` (autodate)
  - `updated` (autodate)
- Sample record keys: collectionId, collectionName, created, id, isRead, link, message, title, type, updated, user

## 2. Orphaned Records Analysis

### Workspaces without valid owner: 0

### Processes with missing owner: 0
### Processes with missing workspace: 0

### Workspace members with missing user: 0
### Workspace members with missing workspace: 0
### Pending invitations: 0

### Comments with missing process: 0
### Comments with missing author: 0
### Comments with missing parent: 0

### Versions with missing process: 0
### Versions with missing creator: 0

### Groups with missing workspace: 0

### Notifications with missing user: 0
### Unread notifications total: 9

### Process map layouts with missing workspace: 0

## 3. Data Integrity Checks

### Processes with non-array nodes: 0
### Processes with non-array edges: 0
### Empty processes (0 nodes): 0

### Stale locks (>30min): 1
  - Process "Nowy Proces" (hp79e24l2p1mug8) locked since 2026-05-31 19:41:35.460Z (2238min ago)

## 4. User Statistics

### Total users: 3
- PRO: 1
- UNKNOWN: 2

### Users with expired non-FREE tier: 0

## 5. Collection API Rules

### WORKFLOW_users
- List rule: `id = @request.auth.id`
- View rule: `@request.auth.id != ""`
- Create rule: `NONE (admin only)`
- Update rule: `id = @request.auth.id`
- Delete rule: `id = @request.auth.id`

### KATALOG_NARZEDZI
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_processes
- List rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- View rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active') || isPublic = true`
- Create rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor'))`
- Update rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor'))`
- Delete rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin')`

### WORKFLOW_workspaces
- List rule: `owner = @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= id && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active'`
- View rule: `owner = @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= id && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active'`
- Create rule: `@request.auth.id != ""`
- Update rule: `owner = @request.auth.id`
- Delete rule: `owner = @request.auth.id`

### WORKFLOW_workspace_members
- List rule: `workspace.owner = @request.auth.id || workspace.WORKFLOW_workspace_members_via_workspace.user ?= @request.auth.id`
- View rule: `workspace.owner = @request.auth.id || workspace.WORKFLOW_workspace_members_via_workspace.user ?= @request.auth.id`
- Create rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin')`
- Update rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin') || user = @request.auth.id`
- Delete rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin') || user = @request.auth.id`

### WORKFLOW_process_groups
- List rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- View rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- Create rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor'))`
- Update rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor'))`
- Delete rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin')`

### WORKFLOW_versions
- List rule: `@collection.WORKFLOW_processes.id ?= process && (@collection.WORKFLOW_processes.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- View rule: `@collection.WORKFLOW_processes.id ?= process && (@collection.WORKFLOW_processes.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- Create rule: `@collection.WORKFLOW_processes.id ?= process && (@collection.WORKFLOW_processes.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor'))`
- Update rule: `@collection.WORKFLOW_processes.id ?= process && (@collection.WORKFLOW_processes.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor'))`
- Delete rule: `@collection.WORKFLOW_processes.id ?= process && (@collection.WORKFLOW_processes.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin')`

### WORKFLOW_prompts
- List rule: `@request.auth.id != ''`
- View rule: `@request.auth.id != ''`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_quick_prompts
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_comments
- List rule: `@collection.WORKFLOW_processes.id ?= process && (@collection.WORKFLOW_processes.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- View rule: `@collection.WORKFLOW_processes.id ?= process && (@collection.WORKFLOW_processes.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- Create rule: `@collection.WORKFLOW_processes.id ?= process && (@collection.WORKFLOW_processes.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- Update rule: `@request.auth.id = author`
- Delete rule: `@request.auth.id = author`

### WORKFLOW_site_settings
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_groups
- List rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- View rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- Create rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor'))`
- Update rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor'))`
- Delete rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin')`

### WORKFLOW_templates
- List rule: `@request.auth.id != ''`
- View rule: `@request.auth.id != ''`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_pages
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_process_map_layouts
- List rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- View rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active')`
- Create rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor'))`
- Update rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor'))`
- Delete rule: `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin')`

### WORKFLOW_platform_settings
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_tier_config
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_ai_models
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### landing_translations
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_contact_messages
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_faq
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_process_cases
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_ai_services
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_pricing
- List rule: `NONE (admin only)`
- View rule: `NONE (admin only)`
- Create rule: `NONE (admin only)`
- Update rule: `NONE (admin only)`
- Delete rule: `NONE (admin only)`

### WORKFLOW_notifications
- List rule: `user = @request.auth.id`
- View rule: `user = @request.auth.id`
- Create rule: `NONE (admin only)`
- Update rule: `user = @request.auth.id`
- Delete rule: `user = @request.auth.id`

