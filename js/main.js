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
  setDefenseVisible(controls.defenseToggle.checked);
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

document.querySelectorAll('[data-defense-formation]').forEach((button) => {
  button.addEventListener('click', () => applyDefenseFormation(button.dataset.defenseFormation));
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
function bindTouchFriendlyCommand(selector, handler) {
  document.querySelectorAll(selector).forEach((button) => {
    let touchStart = null;
    let handledTouchAt = 0;
    button.addEventListener('click', (event) => {
      if (Date.now() - handledTouchAt < 600) return;
      event.preventDefault();
      handler();
    });
    button.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches[0];
      touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }, { passive: true });
    button.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      if (!touch || !touchStart) return;
      const moved = Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y);
      touchStart = null;
      if (moved > 10) return;
      event.preventDefault();
      handledTouchAt = Date.now();
      handler();
    }, { passive: false });
  });
}

bindTouchFriendlyCommand('[data-action="undo-history"]', undoCommand);
bindTouchFriendlyCommand('[data-action="redo-history"]', redoCommand);
bindTouchFriendlyCommand('[data-action="clear-routes"]', clearRoutes);
document.querySelectorAll('[data-action="toggle-defense-visible"]').forEach((button) => {
  button.addEventListener('click', toggleDefenseVisible);
});
document.querySelectorAll('[data-action="toggle-fullscreen"]').forEach((button) => {
  button.addEventListener('click', toggleFullscreen);
});
document.querySelectorAll('[data-action="flip-play"]').forEach((button) => {
  button.addEventListener('click', flipPlay);
});
document.querySelectorAll('[data-action="rename-active-folder"]').forEach((button) => {
  button.addEventListener('click', () => renameFolderById());
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    renameFolderById();
  });
});
document.querySelectorAll('[data-action="rename-active-play"]').forEach((button) => {
  button.addEventListener('click', () => renamePlayById());
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    renamePlayById();
  });
});
document.querySelector('#openPlaysetBtn').addEventListener('click', openPlaysetFile);
document.querySelector('#savePlaysetFileBtn').addEventListener('click', savePlaysetFile);
document.querySelector('#savePlaysetAsBtn').addEventListener('click', savePlaysetAs);
document.querySelector('#exportPngBtn').addEventListener('click', exportPng);
document.querySelector('#savePhotoBtn').addEventListener('click', savePhoto);
document.querySelector('#pdfCurrentBtn').addEventListener('click', exportCurrentPdf);
document.querySelector('#pdfBookBtn').addEventListener('click', exportPlaybookPdf);

function undoCommand() {
  if (state.routeDraft?.input === 'poly') {
    undoPolylinePoint();
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

function undoPolylinePoint() {
  if (!state.routeDraft || state.routeDraft.input !== 'poly') return;
  if (state.routeDraft.points.length > 1) {
    state.routeDraft.points.pop();
    const last = state.routeDraft.points[state.routeDraft.points.length - 1];
    state.routeDraft.previewPoint = last ? [...last] : null;
    drawTemp();
    setStatus('Point Undo');
    return;
  }
  state.routeDraft = null;
  state.drag = null;
  render();
  setStatus('Cancelled');
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
      undoPolylinePoint();
      return;
    }
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedId && !isTextEditing) {
    event.preventDefault();
    deleteSelectedItem();
  }
  if (event.key === 'Escape') {
    if (isFocusMode()) {
      setFocusMode(false);
      return;
    }
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
    if (isFocusMode() && !isMobileLayout()) setFocusMode(false);
    else if (isFocusMode()) {
      setFocusFieldSize();
      clampFocusDock();
      centerFocusCanvas();
    }
    render();
  });
});

const mobileDock = document.querySelector('.mobile-dock');
const mobileDockHandle = document.querySelector('.mobile-dock-handle');
let focusDockDrag = null;

window.addEventListener('fullscreenchange', () => {
  syncFullscreenButtons();
  setStatus(isFullViewActive() ? 'Exit Fullscreen' : 'Fullscreen');
});

function isMobileLayout() {
  return window.matchMedia?.('(max-width: 860px)').matches || window.innerWidth <= 860;
}

function isFocusMode() {
  return document.body.classList.contains('is-focus-mode');
}

function isFullViewActive() {
  return isFocusMode() || Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

function syncFullscreenButtons() {
  const active = isFullViewActive();
  document.querySelectorAll('[data-action="toggle-fullscreen"]').forEach((button) => {
    button.title = active ? 'Exit full view' : 'Full view';
    const label = button.querySelector('span:last-child');
    if (label && label !== button.querySelector('.tool-icon')) {
      label.textContent = active ? 'Exit' : 'Full';
    } else {
      button.textContent = active ? 'Exit Fullscreen' : 'Fullscreen';
    }
  });
}

function clampFocusDockPosition(left, top) {
  const rect = mobileDock.getBoundingClientRect();
  const width = rect.width || 320;
  const height = rect.height || 120;
  return {
    left: clamp(left, 8, Math.max(8, window.innerWidth - width - 8)),
    top: clamp(top, 8, Math.max(8, window.innerHeight - height - 8))
  };
}

function setFocusDockPosition(left, top) {
  const next = clampFocusDockPosition(left, top);
  mobileDock.style.left = `${next.left}px`;
  mobileDock.style.top = `${next.top}px`;
}

function focusViewportSize() {
  const visual = window.visualViewport;
  return {
    width: Math.max(1, visual?.width || window.innerWidth || document.documentElement.clientWidth || 1),
    height: Math.max(1, visual?.height || window.innerHeight || document.documentElement.clientHeight || 1)
  };
}

function setFocusFieldSize() {
  const viewport = focusViewportSize();
  const isPortrait = viewport.height >= viewport.width;
  const baseWidth = viewport.width * (isPortrait ? 1.55 : 1.15);
  const targetHeight = isPortrait ? Math.max(baseWidth * 720 / 1000, viewport.height * 0.82) : baseWidth * 720 / 1000;
  const width = Math.round(targetHeight * 1000 / 720);
  const height = Math.round(targetHeight);
  field.style.setProperty('--focus-field-width', `${width}px`);
  field.style.setProperty('--focus-field-height', `${height}px`);
}

function clearFocusFieldSize() {
  field.style.removeProperty('--focus-field-width');
  field.style.removeProperty('--focus-field-height');
}

function centerFocusCanvas() {
  const wrap = document.querySelector('.canvas-wrap');
  if (!wrap) return;
  const maxLeft = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
  const maxTop = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
  const fieldHeight = field.getBoundingClientRect().height || wrap.scrollHeight;
  const playCenterY = fieldHeight * 0.62;
  wrap.scrollLeft = maxLeft / 2;
  wrap.scrollTop = clamp(playCenterY - wrap.clientHeight * 0.52, 0, maxTop);
}

function placeFocusDockDefault() {
  setFocusFieldSize();
  window.requestAnimationFrame(() => {
    const rect = mobileDock.getBoundingClientRect();
    setFocusDockPosition(
      Math.max(8, window.innerWidth - rect.width - 10),
      Math.max(8, window.innerHeight - rect.height - 12)
    );
    centerFocusCanvas();
  });
}

function clampFocusDock() {
  if (!mobileDock) return;
  const rect = mobileDock.getBoundingClientRect();
  setFocusDockPosition(rect.left, rect.top);
}

function setFocusMode(enabled) {
  document.body.classList.toggle('is-focus-mode', enabled);
  if (enabled) {
    placeFocusDockDefault();
    setStatus('Focus Mode');
  } else {
    clearFocusFieldSize();
    mobileDock.style.left = '';
    mobileDock.style.top = '';
    setStatus('準備OK');
  }
  syncFullscreenButtons();
  render();
}

function toggleFullscreen() {
  if (isMobileLayout()) {
    setFocusMode(!isFocusMode());
    return;
  }

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

mobileDockHandle?.addEventListener('pointerdown', (event) => {
  if (!isFocusMode()) return;
  event.preventDefault();
  const rect = mobileDock.getBoundingClientRect();
  focusDockDrag = {
    pointerId: event.pointerId,
    dx: event.clientX - rect.left,
    dy: event.clientY - rect.top
  };
  mobileDockHandle.setPointerCapture?.(event.pointerId);
});

mobileDockHandle?.addEventListener('pointermove', (event) => {
  if (!focusDockDrag || focusDockDrag.pointerId !== event.pointerId) return;
  event.preventDefault();
  setFocusDockPosition(event.clientX - focusDockDrag.dx, event.clientY - focusDockDrag.dy);
});

function endFocusDockDrag(event) {
  if (!focusDockDrag || focusDockDrag.pointerId !== event.pointerId) return;
  focusDockDrag = null;
}

mobileDockHandle?.addEventListener('pointerup', endFocusDockDrag);
mobileDockHandle?.addEventListener('pointercancel', endFocusDockDrag);

syncFullscreenButtons();
loadInitialState();
