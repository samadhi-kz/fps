// Data helpers, normalization, active-play snapshots, and initial state.
function makeId(prefix = 'id') {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function snapValue(value) {
  return state.snap ? Math.round(value / 10) * 10 : value;
}

function clampPoint(point) {
  return [clamp(snapValue(point[0]), 55, 945), clamp(snapValue(point[1]), 55, 665)];
}

function setStatus(text) {
  controls.statusText.textContent = text;
}

function syncPlayerSizeControl() {
  controls.playerSize.value = state.playerSize;
  controls.playerSizeValue.value = state.playerSize;
  controls.playerSizeValue.textContent = state.playerSize;
}

function syncEndCapSizeControl() {
  controls.endCapSize.value = state.endCapSize;
  controls.endCapSizeValue.value = state.endCapSize.toFixed(1);
  controls.endCapSizeValue.textContent = state.endCapSize.toFixed(1);
}

function activeRoute() {
  if (state.selectedType !== 'route') return null;
  return state.routes.find((route) => route.id === state.selectedId) || null;
}

function activeRouteStyle() {
  return normalizeRouteStyle(activeRoute() || state.routeStyle);
}

function syncLineStyleControls() {
  const style = activeRouteStyle();
  controls.lineColor.value = style.color;
  controls.lineWidth.value = style.width;
  controls.lineWidthValue.value = style.width;
  controls.lineWidthValue.textContent = style.width;
  controls.lineOpacity.value = style.opacity;
  controls.lineOpacityValue.value = style.opacity.toFixed(2);
  controls.lineOpacityValue.textContent = style.opacity.toFixed(2);
}

function syncRouteShapeControl() {
  const route = activeRoute();
  controls.routeShape.value = normalizeRouteMode(route?.mode || state.routeMode);
}

function syncPlaysetFileBadge() {
  const canWriteFile = Boolean(state.fileHandle);
  const hasFileSystemAccess = 'showSaveFilePicker' in window;
  controls.playsetFileName.textContent = state.fileName
    ? `${canWriteFile ? 'Save Location' : 'Load From'}: ${state.fileName}`
    : 'Save Location: Not Selected';
  controls.playsetFileName.title = state.fileName ? state.fileName : 'Save Location Not Selected';
  controls.savePlaysetFileBtn.disabled = !canWriteFile;
  controls.savePlaysetFileBtn.title = canWriteFile
    ? 'Overwrite the open JSON file'
    : 'Direct overwrite is unavailable in this browser. Use Save As.';

  if (canWriteFile) {
    controls.playsetFileHint.textContent = 'Overwrite Save will write directly to this JSON file.';
  } else if (hasFileSystemAccess) {
    controls.playsetFileHint.textContent = 'To save with overwrite, open a JSON file or choose a save location with "Save As".';
  } else {
    controls.playsetFileHint.textContent = 'This browser cannot overwrite files directly. Use "Save As" to download a JSON file.';
  }
}

function syncPlaybookState() {
  updateActivePlay();
  state.playbook.formatVersion = PLAYBOOK_FORMAT_VERSION;
  state.playbook.activeFolderId = state.activeFolderId;
  state.playbook.activePlayId = state.activePlayId;
}

function selectionLabel() {
  if (!state.selectedId) return 'Not Selected';
  if (state.selectedType === 'player') {
    const player = state.players.find((item) => item.id === state.selectedId);
    const marker = markLabel(playerMark(player));
    return player ? `Offense ${player.label}${marker ? ` / ${marker}` : ''}` : 'Offense';
  }
  if (state.selectedType === 'defender') return 'Defense X';
  if (state.selectedType === 'route') {
    const route = state.routes.find((item) => item.id === state.selectedId);
    const labels = { route: 'Route', motion: 'Motion', pass: 'Pass', block: 'Block' };
    return labels[route?.type] || 'Line';
  }
  if (state.selectedType === 'annotation') return 'Comment';
  return 'Selected';
}

function pointFromEvent(event) {
  const pt = field.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const transformed = pt.matrixTransform(field.getScreenCTM().inverse());
  const [x, y] = clampPoint([transformed.x, transformed.y]);
  return { x, y };
}

function activeFolder() {
  return state.playbook.folders.find((folder) => folder.id === state.activeFolderId);
}

function activePlay() {
  const folder = activeFolder();
  return folder?.plays.find((play) => play.id === state.activePlayId);
}

function currentPlaySnapshot() {
  return {
    id: state.activePlayId || makeId('play'),
    name: state.playName || 'Untitled',
    notes: state.notes || '',
    playerMarks: normalizePlayerMarks(state.playerMarks),
    playerSize: state.playerSize,
    endCapSize: state.endCapSize,
    routeMode: normalizeRouteMode(state.routeMode),
    routeStyle: normalizeRouteStyle(state.routeStyle),
    updatedAt: new Date().toISOString(),
    players: cloneData(state.players),
    defenders: cloneData(state.defenders),
    routes: cloneData(state.routes),
    annotations: cloneData(state.annotations)
  };
}

function normalizePlay(play) {
  const fallback = cloneData(defaultPlay);
  const sourcePlayers = play.players || fallback.players;
  const players = normalizePlayers(sourcePlayers);
  return {
    id: play.id || makeId('play'),
    name: play.name || fallback.name,
    notes: play.notes || '',
    playerMarks: normalizePlayerMarks(play.playerMarks || fallback.playerMarks),
    playerSize: normalizePlayerSize(play.playerSize ?? fallback.playerSize),
    endCapSize: normalizeEndCapSize(play.endCapSize ?? fallback.endCapSize),
    routeMode: normalizeRouteMode(play.routeMode || fallback.routeMode),
    routeStyle: normalizeRouteStyle(play.routeStyle || fallback.routeStyle),
    updatedAt: play.updatedAt || '',
    players,
    defenders: normalizeDefenders(play.defenders || fallback.defenders),
    routes: normalizeRoutes(play.routes || fallback.routes),
    annotations: cloneData(play.annotations || [])
  };
}

function normalizePlayerSize(size) {
  const value = Number(size);
  if (!Number.isFinite(value)) return PLAYER_SIZE.default;
  return clamp(value, PLAYER_SIZE.min, PLAYER_SIZE.max);
}

function normalizeEndCapSize(size) {
  const value = Number(size);
  if (!Number.isFinite(value)) return END_CAP_SIZE.default;
  return clamp(value, END_CAP_SIZE.min, END_CAP_SIZE.max);
}

function normalizeRouteColor(color) {
  const value = String(color || '').trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : ROUTE_STYLE.color;
}

function normalizeRouteWidth(width) {
  const value = Number(width);
  if (!Number.isFinite(value)) return ROUTE_STYLE.width;
  return clamp(Math.round(value), ROUTE_STYLE.minWidth, ROUTE_STYLE.maxWidth);
}

function normalizeRouteOpacity(opacity) {
  const value = Number(opacity);
  if (!Number.isFinite(value)) return ROUTE_STYLE.opacity;
  return clamp(value, ROUTE_STYLE.minOpacity, ROUTE_STYLE.maxOpacity);
}

function normalizeRouteMode(mode) {
  const value = String(mode || 'straight');
  return ROUTE_MODES.has(value) ? value : 'straight';
}

function normalizeRouteStyle(style = {}) {
  return {
    color: normalizeRouteColor(style.color),
    width: normalizeRouteWidth(style.width),
    opacity: normalizeRouteOpacity(style.opacity)
  };
}

function normalizePlayerMarks(marks) {
  if (!marks || typeof marks !== 'object' || Array.isArray(marks)) return {};
  return Object.entries(marks).reduce((result, [label, mark]) => {
    const cleanLabel = String(label);
    const cleanMark = String(mark || '');
    if (PLAYER_LABELS.includes(cleanLabel) && cleanMark && PLAYER_MARK_VALUES.has(cleanMark)) {
      result[cleanLabel] = cleanMark;
    }
    return result;
  }, {});
}

function normalizePlayers(players) {
  const source = cloneData(players || []);
  return defaultPlay.players.map((base, index) => {
    const incoming = source[index] || {};
    const role = index === 0 ? 'qb' : 'normal';
    return {
      id: incoming.id || base.id,
      label: String(index + 1),
      x: Number.isFinite(Number(incoming.x)) ? Number(incoming.x) : base.x,
      y: Number.isFinite(Number(incoming.y)) ? Number(incoming.y) : base.y,
      role
    };
  });
}

function normalizeDefenders(defenders) {
  const source = cloneData(defenders || []);
  return defaultPlay.defenders.map((base, index) => ({
    id: source[index]?.id || base.id,
    label: 'X',
    x: Number.isFinite(Number(source[index]?.x)) ? Number(source[index].x) : base.x,
    y: Number.isFinite(Number(source[index]?.y)) ? Number(source[index].y) : base.y
  }));
}

function normalizeRoutes(routes) {
  return cloneData(routes || []).map((route) => {
    const style = normalizeRouteStyle(route);
    return {
      ...route,
      ...style,
      type: route.type || 'route',
      end: route.end || 'arrow',
      mode: normalizeRouteMode(route.mode),
      points: Array.isArray(route.points) ? route.points : []
    };
  });
}

function normalizePlaybook(playbook) {
  if (!playbook?.folders?.length) {
    return {
      formatVersion: PLAYBOOK_FORMAT_VERSION,
      activeFolderId: 'folder-default',
      activePlayId: 'play-default',
      folders: [
        {
          id: 'folder-default',
          name: 'My Playbook',
          plays: [normalizePlay(cloneData(defaultPlay))]
        }
      ]
    };
  }

  const folders = playbook.folders.map((folder, index) => ({
      id: folder.id || makeId('folder'),
      name: folder.name || `Folder ${index + 1}`,
      plays: Array.isArray(folder.plays) ? folder.plays.map(normalizePlay) : []
    }));
  let activeFolderId = folders.some((folder) => folder.id === playbook.activeFolderId)
    ? playbook.activeFolderId
    : folders[0].id;
  let folder = folders.find((item) => item.id === activeFolderId);
  let activePlayId = folder?.plays.some((play) => play.id === playbook.activePlayId)
    ? playbook.activePlayId
    : folder?.plays[0]?.id || null;

  if (!activePlayId) {
    const firstPlayableFolder = folders.find((item) => item.plays.length);
    if (firstPlayableFolder) {
      activeFolderId = firstPlayableFolder.id;
      folder = firstPlayableFolder;
      activePlayId = folder.plays[0].id;
    }
  }

  return {
    formatVersion: PLAYBOOK_FORMAT_VERSION,
    activeFolderId,
    activePlayId,
    folders
  };
}

function updateActivePlay() {
  if (!state.activePlayId) return;
  const folder = activeFolder();
  if (!folder) return;
  const play = currentPlaySnapshot();
  const index = folder.plays.findIndex((item) => item.id === play.id);
  if (index === -1) folder.plays.push(play);
  else folder.plays[index] = play;
}

function saveLocal(showStatus = false) {
  syncPlaybookState();
  if (showStatus) setStatus('Updated');
  renderPlaybookSelectors();
  syncPlaysetFileBadge();
}

function applyPlay(play) {
  const normalized = normalizePlay(play);
  state.activePlayId = normalized.id;
  state.playName = normalized.name;
  state.notes = normalized.notes;
  state.playerMarks = cloneData(normalized.playerMarks || {});
  state.playerSize = normalizePlayerSize(normalized.playerSize);
  state.endCapSize = normalizeEndCapSize(normalized.endCapSize);
  state.routeMode = normalizeRouteMode(normalized.routeMode);
  state.routeStyle = normalizeRouteStyle(normalized.routeStyle);
  state.players = cloneData(normalized.players);
  state.defenders = cloneData(normalized.defenders);
  state.routes = cloneData(normalized.routes);
  state.annotations = cloneData(normalized.annotations);
  state.selectedId = null;
  state.selectedType = null;
  state.drag = null;
  state.routeDraft = null;

  controls.playNotes.value = state.notes;
  syncPlayerSizeControl();
  syncEndCapSizeControl();
  syncLineStyleControls();
  controls.playNotes.disabled = false;
  render();
}

function clearActivePlayView(label = 'No Play Selected') {
  state.activePlayId = null;
  state.playName = label;
  state.notes = '';
  state.playerMarks = {};
  state.playerSize = PLAYER_SIZE.default;
  state.endCapSize = END_CAP_SIZE.default;
  state.routeMode = 'straight';
  state.routeStyle = cloneData(defaultPlay.routeStyle);
  state.players = [];
  state.defenders = [];
  state.routes = [];
  state.annotations = [];
  state.selectedId = null;
  state.selectedType = null;
  state.drag = null;
  state.routeDraft = null;
  controls.playNotes.value = '';
  controls.playNotes.disabled = true;
  syncPlayerSizeControl();
  syncEndCapSizeControl();
  syncLineStyleControls();
  render();
}

function loadInitialState() {
  state.playbook = normalizePlaybook(null);
  state.activeFolderId = state.playbook.activeFolderId;
  state.activePlayId = state.playbook.activePlayId;
  state.openFolderIds = new Set(state.playbook.folders.map((folder) => folder.id));
  const play = activePlay();
  if (play) applyPlay(play);
  else clearActivePlayView('No Play Selected');
  syncPlaybookState();
  renderPlaybookSelectors();
  syncPlaysetFileBadge();
}
