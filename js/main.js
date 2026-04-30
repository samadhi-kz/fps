// Browser event binding and app startup.
field.addEventListener('pointerdown', handlePointerDown);
field.addEventListener('pointermove', handlePointerMove);
field.addEventListener('pointerup', handlePointerUp);
field.addEventListener('dblclick', (event) => {
  const hit = targetFromEvent(event);
  if (hit?.kind === 'annotation') {
    selectThing('annotation', hit.id);
    editSelectedAnnotation();
  }
});

document.querySelectorAll('.tool-button').forEach((button) => {
  button.addEventListener('click', () => {
    state.tool = button.dataset.tool;
    document.querySelectorAll('.tool-button').forEach((item) => item.classList.toggle('is-active', item === button));
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
  saveLocal(false);
  render();
});

controls.snapToggle.addEventListener('change', () => {
  state.snap = controls.snapToggle.checked;
  setStatus(state.snap ? 'Snap ON' : 'Snap OFF');
});

controls.playerSize.addEventListener('input', () => {
  state.playerSize = normalizePlayerSize(controls.playerSize.value);
  syncPlayerSizeControl();
  saveLocal(false);
  drawPlayers();
});

controls.endCapSize.addEventListener('input', () => {
  state.endCapSize = normalizeEndCapSize(controls.endCapSize.value);
  syncEndCapSizeControl();
  saveLocal(false);
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

controls.playNotes.addEventListener('input', () => {
  state.notes = controls.playNotes.value;
  saveLocal(false);
  render();
});

controls.selectedText.addEventListener('input', () => {
  if (state.selectedType !== 'annotation') return;
  const note = state.annotations.find((item) => item.id === state.selectedId);
  if (!note) return;
  note.text = controls.selectedText.value;
  saveLocal(false);
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
document.querySelector('#flipBtn').addEventListener('click', flipPlay);
document.querySelector('#clearRoutesBtn').addEventListener('click', clearRoutes);
document.querySelector('#openPlaysetBtn').addEventListener('click', openPlaysetFile);
document.querySelector('#savePlaysetFileBtn').addEventListener('click', savePlaysetFile);
document.querySelector('#savePlaysetAsBtn').addEventListener('click', savePlaysetAs);
document.querySelector('#exportPngBtn').addEventListener('click', exportPng);
document.querySelector('#pdfCurrentBtn').addEventListener('click', exportCurrentPdf);
document.querySelector('#pdfBookBtn').addEventListener('click', exportPlaybookPdf);

document.addEventListener('keydown', (event) => {
  if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedId && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    deleteSelectedItem();
  }
  if (event.key === 'Escape') {
    state.routeDraft = null;
    state.drag = null;
    state.selectedId = null;
    state.selectedType = null;
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

loadInitialState();
