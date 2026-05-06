// JSON load/save, PNG export, and print/PDF export helpers.
function cleanExportSvg(clone) {
  clone.querySelectorAll('.route-hit, .route-handle, .route-insert, .selected-ring').forEach((node) => node.remove());
  clone.querySelectorAll('.is-selected').forEach((node) => node.classList.remove('is-selected'));

  let css = '';
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      Array.from(sheet.cssRules).forEach((rule) => {
        css += `${rule.cssText}\n`;
      });
    } catch {
      css += '';
    }
  });
  const style = svgEl('style');
  style.textContent = css;
  clone.insertBefore(style, clone.firstChild);
}

function safeFileBase(name, fallback = 'play') {
  return String(name || fallback).trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ') || fallback;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function cloneFieldForExport() {
  const clone = field.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.add('field-export');
  clone.setAttribute('width', '2000');
  clone.setAttribute('height', '1440');
  cleanExportSvg(clone);
  return clone;
}

function createPngBlob() {
  const clone = cloneFieldForExport();
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 1440;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob);
        else reject(new Error('PNG conversion failed'));
      }, 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('PNG image failed'));
    };
    image.src = url;
  });
}

async function exportPng() {
  saveLocal(false);
  try {
    const pngBlob = await createPngBlob();
    downloadBlob(pngBlob, `${safeFileBase(state.playName)}.png`);
    setStatus('PNG Exported');
  } catch (error) {
    console.error(error);
    setStatus('PNG Failed');
  }
}

async function savePhoto() {
  saveLocal(false);
  try {
    const filename = `${safeFileBase(state.playName)}.png`;
    const pngBlob = await createPngBlob();
    const file = new File([pngBlob], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: state.playName || 'Flag Play' });
      setStatus('Photo Ready');
      return;
    }
    downloadBlob(pngBlob, filename);
    setStatus('Photo Saved');
  } catch (error) {
    if (error?.name === 'AbortError') {
      setStatus('Cancelled');
      return;
    }
    console.error(error);
    setStatus('Photo Failed');
  }
}

function normalizeImportedPlaybook(data) {
  if (data?.formatVersion === PLAYBOOK_FORMAT_VERSION && Array.isArray(data.folders)) return normalizePlaybook(data);
  throw new Error('Invalid playset JSON');
}

function fileNameWithJsonExtension(name) {
  const base = String(name || 'flag-playbook.json').trim() || 'flag-playbook.json';
  return base.toLowerCase().endsWith('.json') ? base : `${base}.json`;
}

function currentPlaysetJson() {
  syncPlaybookState();
  return JSON.stringify(state.playbook, null, 2);
}

function downloadPlaysetJson(filename = 'flag-playbook.json') {
  const json = currentPlaysetJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileNameWithJsonExtension(filename);
  link.click();
  URL.revokeObjectURL(url);
  setStatus('Saving JSON');
}

async function ensureWritePermission(handle) {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  const options = { mode: 'readwrite' };
  if (await handle.queryPermission(options) === 'granted') return true;
  return (await handle.requestPermission(options)) === 'granted';
}

async function writePlaysetToHandle(handle) {
  if (!(await ensureWritePermission(handle))) {
    throw new Error('File write permission was denied');
  }
  const writable = await handle.createWritable();
  await writable.write(currentPlaysetJson());
  await writable.close();
}

function handleFileError(error, action) {
  if (error?.name === 'AbortError') {
    setStatus('Cancelled');
    return;
  }
  console.error(error);
  alert(`Failed to ${action} playset. Please check the JSON file.`);
  setStatus(`${action} Failed`);
}

async function loadPlaysetFromText(text, fileName = '', fileHandle = null) {
  try {
    const importedPlaybook = normalizeImportedPlaybook(JSON.parse(text));
    state.playbook = importedPlaybook;
    state.activeFolderId = importedPlaybook.activeFolderId;
    state.activePlayId = importedPlaybook.activePlayId;
    state.fileHandle = fileHandle;
    state.fileName = fileName;
    state.openFolderIds = new Set(importedPlaybook.folders.map((folder) => folder.id));
    const play = activePlay();
    if (play) applyPlay(play);
    else clearActivePlayView('No Play Selected');
    saveLocal(false);
    syncPlaysetFileBadge();
    resetHistory();
    setStatus(fileName ? `${fileName} Loaded` : 'Load Complete');
  } catch (error) {
    handleFileError(error, '読込');
  }
}

async function openPlaysetFile() {
  saveLocal(false);
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: PLAYSET_FILE_TYPES,
        excludeAcceptAllOption: false
      });
      const file = await handle.getFile();
      await loadPlaysetFromText(await file.text(), file.name, handle);
    } catch (error) {
      handleFileError(error, 'load');
    }
    return;
  }

  controls.playsetFileInput.click();
}

async function savePlaysetAs() {
  const suggestedName = fileNameWithJsonExtension(state.fileName || 'flag-playbook.json');
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: PLAYSET_FILE_TYPES,
        excludeAcceptAllOption: false
      });
      await writePlaysetToHandle(handle);
      state.fileHandle = handle;
      state.fileName = handle.name || suggestedName;
      syncPlaysetFileBadge();
      setStatus('Saved As');
    } catch (error) {
      handleFileError(error, 'save');
    }
    return;
  }

  downloadPlaysetJson(suggestedName);
  state.fileHandle = null;
  state.fileName = suggestedName;
  syncPlaysetFileBadge();
  setStatus('Exporting JSON');
}

async function savePlaysetFile() {
  if (!state.fileHandle) {
    setStatus('Overwrite Unavailable');
    return;
  }

  try {
    await writePlaysetToHandle(state.fileHandle);
    state.fileName = state.fileHandle.name || state.fileName;
    syncPlaysetFileBadge();
    setStatus('Overwrite Saved');
  } catch (error) {
    handleFileError(error, 'save');
  }
}

function exportCurrentPdf() {
  saveLocal(false);
  state.selectedId = null;
  state.selectedType = null;
  render();
  setStatus('PDF Play');
  window.print();
}

function playEntries() {
  return state.playbook.folders.flatMap((folder) => (
    folder.plays.map((play) => ({ folder, play }))
  ));
}

function restoreActivePlay(folderId, playId) {
  state.activeFolderId = folderId;
  state.activePlayId = playId;
  const play = activePlay();
  if (play) applyPlay(play);
  else clearActivePlayView(activeFolder()?.name ? `${activeFolder().name} Empty` : 'No Play Selected');
}

function cleanupPrintBook() {
  if (state.printCleanup) {
    state.printCleanup();
    state.printCleanup = null;
  }
}

function exportPlaybookPdf() {
  saveLocal(false);
  const entries = playEntries();
  if (!entries.length) {
    setStatus('No Plays');
    return;
  }

  const savedFolderId = state.activeFolderId;
  const savedPlayId = state.activePlayId;
  const printBook = document.querySelector('#printBook');
  printBook.replaceChildren();

  entries.forEach(({ folder, play }) => {
    state.activeFolderId = folder.id;
    state.activePlayId = play.id;
    applyPlay(play);
    state.selectedId = null;
    state.selectedType = null;
    render();

    const page = document.createElement('section');
    page.className = 'print-page';
    const heading = document.createElement('div');
    heading.className = 'print-page-title';
    heading.textContent = `${folder.name} / ${play.name || 'Untitled'}`;
    page.append(heading, cloneFieldForExport());
    printBook.append(page);
  });

  restoreActivePlay(savedFolderId, savedPlayId);
  document.body.classList.add('is-printing-book');
  state.printCleanup = () => {
    document.body.classList.remove('is-printing-book');
    printBook.replaceChildren();
  };
  setStatus('PDF Book');
  window.requestAnimationFrame(() => window.print());
}
