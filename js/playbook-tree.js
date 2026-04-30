// Playbook tree rendering, drag/drop helpers, and tree event handlers.
function treeActionButton(action, text, title, dataset = {}, danger = false) {
  const button = document.createElement('button');
  button.className = `tree-action${danger ? ' danger' : ''}`;
  button.type = 'button';
  button.dataset.playbookAction = action;
  Object.entries(dataset).forEach(([key, value]) => { button.dataset[key] = value; });
  button.title = title;
  button.textContent = text;
  return button;
}

function renderPlaybookSelectors() {
  controls.playbookTree.replaceChildren();

  state.playbook.folders.forEach((folder) => {
    const folderNode = document.createElement('div');
    folderNode.className = 'tree-folder';
    folderNode.setAttribute('role', 'group');

    const isOpen = state.openFolderIds.has(folder.id);
    const isActiveFolder = folder.id === state.activeFolderId;
    const folderRow = document.createElement('div');
    folderRow.className = `tree-row tree-folder-row${isActiveFolder ? ' is-folder-active' : ''}`;
    folderRow.dataset.folderId = folder.id;
    folderRow.dataset.dragKind = 'folder';
    folderRow.draggable = true;
    folderRow.setAttribute('role', 'treeitem');
    folderRow.setAttribute('aria-expanded', String(isOpen));
    folderRow.title = 'Drag to reorder folder';

    const toggle = document.createElement('button');
    toggle.className = 'tree-toggle';
    toggle.type = 'button';
    toggle.dataset.playbookAction = 'toggle-folder';
    toggle.dataset.folderId = folder.id;
    toggle.title = isOpen ? '閉じる' : '開く';
    toggle.textContent = isOpen ? '▾' : '▸';

    const label = document.createElement('button');
    label.className = 'tree-label tree-folder-label';
    label.type = 'button';
    label.dataset.playbookAction = 'select-folder';
    label.dataset.folderId = folder.id;
    label.innerHTML = `<span class="tree-icon">□</span><span class="tree-name"></span>`;
    label.querySelector('.tree-name').textContent = folder.name;

    const actions = document.createElement('div');
    actions.className = 'tree-actions';
    actions.append(
      treeActionButton('new-play', '+', 'Add a play to this folder', { folderId: folder.id }),
      treeActionButton('rename-folder', '✎', 'Rename folder', { folderId: folder.id }),
      treeActionButton('delete-folder', '×', 'Delete folder', { folderId: folder.id }, true)
    );
    folderRow.append(toggle, label, actions);
    folderNode.append(folderRow);

    if (isOpen) {
      const children = document.createElement('div');
      children.className = 'tree-children';
      if (!folder.plays.length) {
        const empty = document.createElement('div');
        empty.className = 'tree-empty';
        empty.textContent = 'Empty';
        children.append(empty);
      }
      folder.plays.forEach((play) => {
        const isActivePlay = isActiveFolder && play.id === state.activePlayId;
        const playRow = document.createElement('div');
        playRow.className = `tree-row tree-play-row${isActivePlay ? ' is-active' : ''}`;
        playRow.dataset.folderId = folder.id;
        playRow.dataset.playId = play.id;
        playRow.dataset.dragKind = 'play';
        playRow.draggable = true;
        playRow.setAttribute('role', 'treeitem');
        playRow.title = 'Drag to reorder play or move between folders';

        const spacer = document.createElement('span');
        spacer.className = 'tree-spacer';
        spacer.textContent = '⋮';

        const playLabel = document.createElement('button');
        playLabel.className = 'tree-label tree-play-label';
        playLabel.type = 'button';
        playLabel.dataset.playbookAction = 'select-play';
        playLabel.dataset.folderId = folder.id;
        playLabel.dataset.playId = play.id;
        playLabel.innerHTML = `<span class="tree-icon">•</span><span class="tree-name"></span>`;
        playLabel.querySelector('.tree-name').textContent = play.name || 'Untitled';

        const playActions = document.createElement('div');
        playActions.className = 'tree-actions';
        playActions.append(
          treeActionButton('rename-play', '✎', 'Rename play', { folderId: folder.id, playId: play.id }),
          treeActionButton('duplicate-play', '⧉', 'Duplicate', { folderId: folder.id, playId: play.id }),
          treeActionButton('delete-play', '×', 'Delete', { folderId: folder.id, playId: play.id }, true)
        );

        playRow.append(spacer, playLabel, playActions);
        children.append(playRow);
      });
      folderNode.append(children);
    }

    controls.playbookTree.append(folderNode);
  });
}
function clearTreeDropIndicators(includeDragging = false) {
  controls.playbookTree.querySelectorAll('.is-drop-before, .is-drop-after, .is-drop-into')
    .forEach((row) => row.classList.remove('is-drop-before', 'is-drop-after', 'is-drop-into'));
  if (includeDragging) {
    controls.playbookTree.querySelectorAll('.is-dragging')
      .forEach((row) => row.classList.remove('is-dragging'));
  }
}

function treePayloadFromRow(row) {
  if (!row?.dataset.dragKind) return null;
  return {
    kind: row.dataset.dragKind,
    folderId: row.dataset.folderId,
    playId: row.dataset.playId || null
  };
}

function dropPositionForRow(event, row) {
  const rect = row.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

function folderRowForTreeRow(row) {
  if (row.classList.contains('tree-folder-row')) return row;
  return row.closest('.tree-folder')?.querySelector('.tree-folder-row') || null;
}

function treeDropTargetFromEvent(event) {
  const drag = state.treeDrag;
  if (!drag) return null;

  let row = event.target.closest('.tree-row');
  if (!row) row = event.target.closest('.tree-empty')?.closest('.tree-folder')?.querySelector('.tree-folder-row');
  if (!row || !controls.playbookTree.contains(row)) return null;

  if (drag.kind === 'folder') {
    const folderRow = folderRowForTreeRow(row);
    if (!folderRow || folderRow.dataset.folderId === drag.folderId) return null;
    return {
      kind: 'folder',
      row: folderRow,
      folderId: folderRow.dataset.folderId,
      position: dropPositionForRow(event, folderRow)
    };
  }

  if (drag.kind === 'play') {
    if (row.classList.contains('tree-folder-row')) {
      return {
        kind: 'folder',
        row,
        folderId: row.dataset.folderId,
        position: 'inside'
      };
    }

    if (row.classList.contains('tree-play-row') && row.dataset.playId !== drag.playId) {
      return {
        kind: 'play',
        row,
        folderId: row.dataset.folderId,
        playId: row.dataset.playId,
        position: dropPositionForRow(event, row)
      };
    }
  }

  return null;
}

function markTreeDropTarget(target) {
  if (!target) return;
  if (target.position === 'before') target.row.classList.add('is-drop-before');
  else if (target.position === 'after') target.row.classList.add('is-drop-after');
  else target.row.classList.add('is-drop-into');
}

function suppressTreeClickAfterDrop() {
  state.suppressTreeClick = true;
  window.setTimeout(() => {
    state.suppressTreeClick = false;
  }, 0);
}

function moveFolderByDrop(drag, target) {
  const folders = state.playbook.folders;
  const fromIndex = folders.findIndex((folder) => folder.id === drag.folderId);
  if (fromIndex === -1 || drag.folderId === target.folderId) return;

  saveLocal(false);
  const [folder] = folders.splice(fromIndex, 1);
  const targetIndex = folders.findIndex((item) => item.id === target.folderId);
  if (targetIndex === -1) {
    folders.splice(fromIndex, 0, folder);
    return;
  }

  folders.splice(target.position === 'after' ? targetIndex + 1 : targetIndex, 0, folder);
  saveLocal(true);
  setStatus('Folder Moved');
}

function movePlayByDrop(drag, target) {
  const sourceFolder = folderById(drag.folderId);
  const targetFolder = folderById(target.folderId);
  if (!sourceFolder || !targetFolder) return;

  saveLocal(false);
  const fromIndex = sourceFolder.plays.findIndex((play) => play.id === drag.playId);
  if (fromIndex === -1) return;

  const [play] = sourceFolder.plays.splice(fromIndex, 1);
  let insertIndex = targetFolder.plays.length;
  if (target.kind === 'play') {
    const targetIndex = targetFolder.plays.findIndex((item) => item.id === target.playId);
    if (targetIndex !== -1) insertIndex = target.position === 'after' ? targetIndex + 1 : targetIndex;
  }

  targetFolder.plays.splice(insertIndex, 0, play);
  state.openFolderIds.add(targetFolder.id);
  const movedActivePlay = state.activePlayId === play.id;
  const movedIntoActiveEmptyFolder = !state.activePlayId && state.activeFolderId === targetFolder.id;
  if (movedIntoActiveEmptyFolder) {
    state.activeFolderId = targetFolder.id;
    state.activePlayId = play.id;
    applyPlay(play);
    saveLocal(true);
    setStatus(sourceFolder === targetFolder ? 'Play Reordered' : 'Play Moved');
    return;
  }

  if (movedActivePlay) state.activeFolderId = targetFolder.id;

  saveLocal(true);
  render();
  setStatus(sourceFolder === targetFolder ? 'Play Reordered' : 'Play Moved');
}

function handlePlaybookTreeDragStart(event) {
  const row = event.target.closest('.tree-row[draggable="true"]');
  if (!row || !controls.playbookTree.contains(row) || event.target.closest('.tree-action, .tree-toggle')) {
    event.preventDefault();
    return;
  }

  state.treeDrag = treePayloadFromRow(row);
  if (!state.treeDrag) {
    event.preventDefault();
    return;
  }

  row.classList.add('is-dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', JSON.stringify(state.treeDrag));
}

function handlePlaybookTreeDragOver(event) {
  if (!state.treeDrag) return;
  const target = treeDropTargetFromEvent(event);
  clearTreeDropIndicators();
  if (!target) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  markTreeDropTarget(target);
}

function handlePlaybookTreeDrop(event) {
  if (!state.treeDrag) return;
  const drag = state.treeDrag;
  const target = treeDropTargetFromEvent(event);
  clearTreeDropIndicators(true);
  state.treeDrag = null;
  if (!target) return;

  event.preventDefault();
  suppressTreeClickAfterDrop();
  if (drag.kind === 'folder') moveFolderByDrop(drag, target);
  if (drag.kind === 'play') movePlayByDrop(drag, target);
}

function handlePlaybookTreeDragEnd() {
  clearTreeDropIndicators(true);
  state.treeDrag = null;
}

function handlePlaybookTreeDragLeave(event) {
  if (!controls.playbookTree.contains(event.relatedTarget)) clearTreeDropIndicators();
}

function handlePlaybookTreeClick(event) {
  if (state.suppressTreeClick) {
    event.preventDefault();
    state.suppressTreeClick = false;
    return;
  }

  const button = event.target.closest('[data-playbook-action]');
  if (!button || !controls.playbookTree.contains(button)) return;
  const { playbookAction, folderId, playId } = button.dataset;

  if (playbookAction === 'toggle-folder') {
    if (state.openFolderIds.has(folderId)) state.openFolderIds.delete(folderId);
    else state.openFolderIds.add(folderId);
    renderPlaybookSelectors();
    return;
  }

  if (playbookAction === 'select-folder') selectFolder(folderId);
  if (playbookAction === 'select-play') selectPlay(folderId, playId);
  if (playbookAction === 'new-play') createNewPlay(folderId);
  if (playbookAction === 'rename-folder') renameFolderById(folderId);
  if (playbookAction === 'rename-play') renamePlayById(folderId, playId);
  if (playbookAction === 'duplicate-play') duplicatePlayById(folderId, playId);
  if (playbookAction === 'delete-play') deletePlayById(folderId, playId);
  if (playbookAction === 'delete-folder') deleteFolderById(folderId);
}

function handlePlaybookTreeDoubleClick(event) {
  const playLabel = event.target.closest('[data-playbook-action="select-play"]');
  if (playLabel && controls.playbookTree.contains(playLabel)) {
    renamePlayById(playLabel.dataset.folderId, playLabel.dataset.playId);
    return;
  }
  const folderLabel = event.target.closest('[data-playbook-action="select-folder"]');
  if (!folderLabel || !controls.playbookTree.contains(folderLabel)) return;
  renameFolderById(folderLabel.dataset.folderId);
}
