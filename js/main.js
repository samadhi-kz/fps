// Browser event binding and app startup.
field.addEventListener('pointerdown', handlePointerDown);
field.addEventListener('pointermove', handlePointerMove);
field.addEventListener('pointerup', handlePointerUp);
field.addEventListener('pointercancel', cancelPointerInteraction);
field.addEventListener('dblclick', (event) => {
  if (state.routeDraft?.input === 'poly') {
    event.preventDefault();
    finishRoute();
    return;
  }
  const hit = targetFromEvent(event);
  if (hit?.kind === 'annotation') {
    selectThing('annotation', hit.id);
    editSelectedAnnotation();
  }
});

function syncToolButtons() {
  document.querySelectorAll('.tool-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tool === state.tool);
  });
}

document.querySelectorAll('.tool-button').forEach((button) => {
  button.addEventListener('click', () => {
    state.tool = button.dataset.tool;
    state.pendingPreset = null;
    if (state.tool !== 'select') {
      state.selectedId = null;
      state.selectedType = null;
    }
    syncToolEndCapDefault(state.tool);
    syncToolButtons();
    syncPresetButtons();
    render();
    setStatus(button.title);
  });
});

controls.playbookTree.addEventListener('click', handlePlaybookTreeClick);
controls.playbookTree.addEventListener('dblclick', handlePlaybookTreeDoubleClick);
controls.playbookTree.addEventListener('dragstart', handlePlaybookTreeDragStart);
controls.playbookTree.addEventListener('dragover', handlePlaybookTreeDragOver);
controls.playbookTree.addEventListener('drop', handlePlaybookTreeDrop);
controls.playbookTree.addEventListener('dragend', handlePlaybookTreeDragEnd);
controls.playbookTree.addEventListener('dragleave', handlePlaybookTreeDragLeave);

controls.endCap.addEventListener('change', () => {
  if (state.selectedType !== 'route') return;
  const route = state.routes.find((item) => item.id === state.selectedId);
  if (!route) return;
  route.end = controls.endCap.value;
  saveLocal(false, { historyKey: `route-end-${route.id}` });
  render();
});

controls.snapToggle.addEventListener('change', () => {
  state.snap = controls.snapToggle.checked;
  setStatus(state.snap ? 'Snap ON' : 'Snap OFF');
});

controls.defenseToggle.addEventListener('change', () => {
  state.defenseVisible = controls.defenseToggle.checked;
  if (!state.defenseVisible && state.selectedType === 'defender') {
    state.selectedId = null;
    state.selectedType = null;
  }
  saveLocal(false);
  render();
  setStatus(state.defenseVisible ? 'Defense ON' : 'Defense OFF');
});

controls.playerSize.addEventListener('input', () => {
  state.playerSize = normalizePlayerSize(controls.playerSize.value);
  syncPlayerSizeControl();
  saveLocal(false, { historyKey: 'player-size' });
  drawPlayers();
});

controls.endCapSize.addEventListener('input', () => {
  state.endCapSize = normalizeEndCapSize(controls.endCapSize.value);
  syncEndCapSizeControl();
  saveLocal(false, { historyKey: 'end-cap-size' });
  drawRoutes();
});

controls.lineColor.addEventListener('input', () => {
  updateLineStyle({ color: controls.lineColor.value });
});

controls.lineWidth.addEventListener('input', () => {
  updateLineStyle({ width: controls.lineWidth.value });
});

controls.lineOpacity.addEventListener('input', () => {
  updateLineStyle({ opacity: controls.lineOpacity.value });
});

controls.routeShape.addEventListener('change', () => {
  updateRouteMode(controls.routeShape.value);
});

document.querySelectorAll('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => activateRoutePreset(button.dataset.preset));
});

document.querySelectorAll('[data-formation]').forEach((button) => {
  button.addEventListener('click', () => applyOffenseFormation(button.dataset.formation));
});

controls.playNotes.addEventListener('input', () => {
  state.notes = controls.playNotes.value;
  saveLocal(false, { historyKey: 'play-notes' });
  render();
});

controls.selectedText.addEventListener('input', () => {
  if (state.selectedType !== 'annotation') return;
  const note = state.annotations.find((item) => item.id === state.selectedId);
  if (!note) return;
  note.text = controls.selectedText.value;
  saveLocal(false, { historyKey: `annotation-${note.id}` });
  drawText();
});

controls.playsetFileInput.addEventListener('change', async () => {
  const [file] = controls.playsetFileInput.files;
  controls.playsetFileInput.value = '';
  if (!file) return;
  await loadPlaysetFromText(await file.text(), file.name, null);
});

document.querySelector('#newPlayBtn').addEventListener('click', () => createNewPlay());
document.querySelector('#newFolderBtn').addEventListener('click', createNewFolder);
document.querySelector('#newPlayInFolderBtn').addEventListener('click', () => createNewPlay());
document.querySelector('#deleteBtn').addEventListener('click', deleteSelectedItem);
document.querySelectorAll('[data-action="finish-route"]').forEach((button) => {
  button.addEventListener('click', finishRoute);
});
document.querySelectorAll('[data-action="delete-selected"]').forEach((button) => {
  button.addEventListener('click', deleteSelectedItem);
});
document.querySelectorAll('[data-action="undo-history"]').forEach((button) => {
  button.addEventListener('click', undoCommand);
});
document.querySelectorAll('[data-action="redo-history"]').forEach((button) => {
  button.addEventListener('click', redoCommand);
});
document.querySelectorAll('[data-action="toggle-fullscreen"]').forEach((button) => {
  button.addEventListener('click', toggleFullscreen);
});
document.querySelector('#flipBtn').addEventListener('click', flipPlay);
document.querySelector('#clearRoutesBtn').addEventListener('click', clearRoutes);
document.querySelector('#openPlaysetBtn').addEventListener('click', openPlaysetFile);
document.querySelector('#savePlaysetFileBtn').addEventListener('click', savePlaysetFile);
document.querySelector('#savePlaysetAsBtn').addEventListener('click', savePlaysetAs);
document.querySelector('#exportPngBtn').addEventListener('click', exportPng);
document.querySelector('#pdfCurrentBtn').addEventListener('click', exportCurrentPdf);
document.querySelector('#pdfBookBtn').addEventListener('click', exportPlaybookPdf);

function undoCommand() {
  if (state.routeDraft?.input === 'poly') {
    if (state.routeDraft.points.length > 1) {
      state.routeDraft.points.pop();
      drawTemp();
      setStatus('Point Undo');
    } else {
      state.routeDraft = null;
      state.drag = null;
      render();
      setStatus('Cancelled');
    }
    return;
  }
  if (state.routeDraft) {
    state.routeDraft = null;
    state.drag = null;
    render();
    setStatus('Cancelled');
    return;
  }
  undoHistory();
}

function redoCommand() {
  if (state.routeDraft) {
    setStatus('Drawing');
    return;
  }
  redoHistory();
}

document.addEventListener('keydown', (event) => {
  const isTextEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    if (!isTextEditing) {
      event.preventDefault();
      if (event.shiftKey) redoCommand();
      else undoCommand();
    }
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
    if (!isTextEditing) {
      event.preventDefault();
      redoCommand();
    }
    return;
  }
  if (state.routeDraft?.input === 'poly' && !isTextEditing) {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishRoute();
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      if (state.routeDraft.points.length > 1) {
        state.routeDraft.points.pop();
        drawTemp();
      }
      return;
    }
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedId && !isTextEditing) {
    event.preventDefault();
    deleteSelectedItem();
  }
  if (event.key === 'Escape') {
    state.routeDraft = null;
    state.drag = null;
    state.selectedId = null;
    state.selectedType = null;
    state.pendingPreset = null;
    setStatus('準備OK');
    render();
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (state.fileHandle) savePlaysetFile();
    else downloadPlaysetJson(state.fileName || 'flag-playbook.json');
  }
});

window.addEventListener('afterprint', () => setStatus('準備OK'));
window.addEventListener('afterprint', cleanupPrintBook);
window.addEventListener('blur', cancelPointerInteraction);

let resizeRenderFrame = null;
window.addEventListener('resize', () => {
  if (resizeRenderFrame) window.cancelAnimationFrame(resizeRenderFrame);
  resizeRenderFrame = window.requestAnimationFrame(() => {
    resizeRenderFrame = null;
    render();
  });
});

window.addEventListener('fullscreenchange', () => {
  const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  const label = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
  document.querySelectorAll('[data-action="toggle-fullscreen"]').forEach((button) => {
    button.title = label;
  });
  setStatus(label);
});

function toggleFullscreen() {
  const el = document.documentElement;
  const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  if (isFullscreen) {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    return;
  }
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

loadInitialState();
