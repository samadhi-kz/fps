const SVG_NS = 'http://www.w3.org/2000/svg';
const DRAW_TOOLS = ['route', 'motion', 'pass', 'block'];
const PLAYBOOK_FORMAT_VERSION = 1;
const FIELD_DIMENSIONS = {
  left: 250,
  right: 750,
  scrimmageY: 460,
  yardScale: 20,
  widthYards: 25,
  gridStepYards: 5,
  frontYards: 20,
  backYards: 10,
  xAxisGuides: [
    { yards: 0, label: 'Left' },
    { yards: 5, label: 'Out 5' },
    { yards: 10, label: 'In 2.5' },
    { yards: 15, label: 'In 2.5' },
    { yards: 20, label: 'Out 5' },
    { yards: 25, label: 'Right' }
  ]
};
const fieldX = (yardsFromLeft) => FIELD_DIMENSIONS.left + yardsFromLeft * FIELD_DIMENSIONS.yardScale;
const fieldY = (yardsFromScrimmage) => FIELD_DIMENSIONS.scrimmageY + yardsFromScrimmage * FIELD_DIMENSIONS.yardScale;
const PLAYER_SIZE = {
  default: 25,
  min: 5,
  max: 35
};
const END_CAP_SIZE = {
  default: 1,
  min: 0.5,
  max: 2
};
const PLAYER_LABELS = ['1', '2', '3', '4', '5'];
const PLAYER_MARK_OPTIONS = [
  { value: 'ring', label: 'Light Blue Circle' },
  { value: 'star', label: 'Red Star' },
  { value: 'diamond', label: 'Yellow Diamond' },
  { value: 'square', label: 'Green Square' }
];
const PLAYER_MARK_VALUES = new Set(PLAYER_MARK_OPTIONS.map((option) => option.value));
const PLAYSET_FILE_TYPES = [
  {
    description: 'Flag Playmaker JSON',
    accept: { 'application/json': ['.json'] }
  }
];

const defaultPlay = {
  id: 'play-default',
  name: 'New Play',
  notes: '',
  playerMarks: { '1': 'ring', '2': 'ring', '3': 'ring', '4': 'ring', '5': 'ring' },
  playerSize: PLAYER_SIZE.default,
  endCapSize: END_CAP_SIZE.default,
  players: [
    { id: 'p1', label: '1', x: fieldX(12.5), y: fieldY(0), role: 'qb' },
    { id: 'p2', label: '2', x: fieldX(12.5), y: fieldY(5), role: 'normal' },
    { id: 'p3', label: '3', x: fieldX(10), y: fieldY(0), role: 'normal' },
    { id: 'p4', label: '4', x: fieldX(15), y: fieldY(0), role: 'normal' },
    { id: 'p5', label: '5', x: fieldX(20), y: fieldY(0), role: 'normal' }
  ],
  defenders: [
    { id: 'd1', label: 'X', x: fieldX(5), y: fieldY(-5) },
    { id: 'd2', label: 'X', x: fieldX(10), y: fieldY(-5) },
    { id: 'd3', label: 'X', x: fieldX(12.5), y: fieldY(-10) },
    { id: 'd4', label: 'X', x: fieldX(15), y: fieldY(-5) },
    { id: 'd5', label: 'X', x: fieldX(20), y: fieldY(-5) }
  ],
  routes: [],
  annotations: []
};

const state = {
  tool: 'select',
  selectedId: null,
  selectedType: null,
  drag: null,
  routeDraft: null,
  snap: false,
  playbook: { folders: [] },
  activeFolderId: null,
  activePlayId: null,
  playName: defaultPlay.name,
  notes: '',
  playerMarks: cloneData(defaultPlay.playerMarks),
  players: [],
  defenders: [],
  routes: [],
  annotations: [],
  playerSize: PLAYER_SIZE.default,
  endCapSize: END_CAP_SIZE.default,
  fileHandle: null,
  fileName: '',
  openFolderIds: new Set()
};

const field = document.querySelector('#field');
const layers = {
  grid: document.querySelector('#gridLayer'),
  routes: document.querySelector('#routeLayer'),
  temp: document.querySelector('#tempLayer'),
  players: document.querySelector('#playerLayer'),
  text: document.querySelector('#textLayer'),
  meta: document.querySelector('#metaLayer')
};

const controls = {
  playbookTree: document.querySelector('#playbookTree'),
  playNotes: document.querySelector('#playNotes'),
  selectedText: document.querySelector('#selectedText'),
  selectionBadge: document.querySelector('#selectionBadge'),
  playsetFileName: document.querySelector('#playsetFileName'),
  playsetFileHint: document.querySelector('#playsetFileHint'),
  playsetFileInput: document.querySelector('#playsetFileInput'),
  savePlaysetFileBtn: document.querySelector('#savePlaysetFileBtn'),
  playerSize: document.querySelector('#playerSize'),
  playerSizeValue: document.querySelector('#playerSizeValue'),
  endCapSize: document.querySelector('#endCapSize'),
  endCapSizeValue: document.querySelector('#endCapSizeValue'),
  titleLabel: document.querySelector('#titleLabel'),
  markList: document.querySelector('#markList'),
  statusText: document.querySelector('#statusText'),
  endCap: document.querySelector('#endCap'),
  snapToggle: document.querySelector('#snapToggle')
};

function makeId(prefix = 'id') {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
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

function syncPlaysetFileBadge() {
  const canWriteFile = Boolean(state.fileHandle);
  const hasFileSystemAccess = 'showSaveFilePicker' in window;
  controls.playsetFileName.textContent = state.fileName
    ? `${canWriteFile ? 'Save Location' : 'Load From'}: ${state.fileName}`
    : 'Save Location: Not Selected';
  controls.playsetFileName.title = state.fileName ? state.fileName : 'Save Location Not Selected';
  controls.savePlaysetFileBtn.disabled = !canWriteFile;
  controls.savePlaysetFileBtn.title = canWriteFile ? 'Overwrite the open JSON file' : 'Open a JSON file or save with a name first';

  if (canWriteFile) {
    controls.playsetFileHint.textContent = 'Overwrite Save will write directly to this JSON file.';
  } else if (hasFileSystemAccess) {
    controls.playsetFileHint.textContent = 'To save with overwrite, open a JSON file or choose a save location with "Save As".';
  } else {
    controls.playsetFileHint.textContent = 'This browser does not support direct overwrite, so export JSON with "Save As".';
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
  return cloneData(routes || []).map((route) => ({
    ...route,
    mode: 'straight'
  }));
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
      plays: (folder.plays?.length ? folder.plays : [cloneData(defaultPlay)]).map(normalizePlay)
    }));
  const activeFolderId = folders.some((folder) => folder.id === playbook.activeFolderId)
    ? playbook.activeFolderId
    : folders[0].id;
  const folder = folders.find((item) => item.id === activeFolderId);
  const activePlayId = folder.plays.some((play) => play.id === playbook.activePlayId)
    ? playbook.activePlayId
    : folder.plays[0].id;

  return {
    formatVersion: PLAYBOOK_FORMAT_VERSION,
    activeFolderId,
    activePlayId,
    folders
  };
}

function updateActivePlay() {
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
  render();
}

function loadInitialState() {
  state.playbook = normalizePlaybook(null);
  state.activeFolderId = state.playbook.activeFolderId;
  state.activePlayId = state.playbook.activePlayId;
  state.openFolderIds = new Set(state.playbook.folders.map((folder) => folder.id));
  applyPlay(activePlay());
  syncPlaybookState();
  renderPlaybookSelectors();
  syncPlaysetFileBadge();
}

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
  if (state.activeFolderId) state.openFolderIds.add(state.activeFolderId);

  state.playbook.folders.forEach((folder) => {
    const folderNode = document.createElement('div');
    folderNode.className = 'tree-folder';
    folderNode.setAttribute('role', 'group');

    const isOpen = state.openFolderIds.has(folder.id);
    const isActiveFolder = folder.id === state.activeFolderId;
    const folderRow = document.createElement('div');
    folderRow.className = `tree-row tree-folder-row${isActiveFolder ? ' is-folder-active' : ''}`;
    folderRow.dataset.folderId = folder.id;
    folderRow.setAttribute('role', 'treeitem');
    folderRow.setAttribute('aria-expanded', String(isOpen));

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
      folder.plays.forEach((play) => {
        const isActivePlay = isActiveFolder && play.id === state.activePlayId;
        const playRow = document.createElement('div');
        playRow.className = `tree-row tree-play-row${isActivePlay ? ' is-active' : ''}`;
        playRow.dataset.folderId = folder.id;
        playRow.dataset.playId = play.id;
        playRow.setAttribute('role', 'treeitem');

        const spacer = document.createElement('span');
        spacer.className = 'tree-spacer';

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

function linePath(points) {
  if (points.length < 2) return '';
  return `M ${points[0][0]} ${points[0][1]} ` + points.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(' ');
}

function zigzagPoints(points) {
  const result = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (length < 20) {
      result.push(b);
      continue;
    }
    const nx = -dy / length;
    const ny = dx / length;
    const steps = Math.max(2, Math.floor(length / 22));
    for (let j = 1; j <= steps; j += 1) {
      const t = j / steps;
      const amp = j % 2 === 0 ? -10 : 10;
      result.push([a[0] + dx * t + nx * amp, a[1] + dy * t + ny * amp]);
    }
  }
  return result;
}

function endGeometry(points) {
  const end = points[points.length - 1];
  const prev = points[points.length - 2] || [end[0] - 1, end[1]];
  const angle = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
  const nx = Math.cos(angle + Math.PI / 2);
  const ny = Math.sin(angle + Math.PI / 2);
  return { end, nx, ny };
}

function routeLength(points) {
  return points.slice(1).reduce((total, point, index) => {
    const previous = points[index];
    return total + Math.hypot(point[0] - previous[0], point[1] - previous[1]);
  }, 0);
}

function sanitizePoints(points) {
  const cleaned = [];
  points.forEach((point) => {
    const next = clampPoint(point);
    const previous = cleaned[cleaned.length - 1];
    if (!previous || Math.hypot(next[0] - previous[0], next[1] - previous[1]) > 4) {
      cleaned.push(next);
    }
  });
  return cleaned;
}

function drawGrid() {
  layers.grid.replaceChildren();
  const { left, right, scrimmageY, yardScale, widthYards, gridStepYards, frontYards, backYards, xAxisGuides } = FIELD_DIMENSIONS;
  const top = scrimmageY - frontYards * yardScale;
  const bottom = scrimmageY + backYards * yardScale;
  const xFromYards = (yards) => left + yards * yardScale;
  const appendYardLabel = (text, x, y, vertical = false, anchor = 'start') => {
    const label = svgEl('text', {
      class: `yard-label${vertical ? ' vertical-yard-label' : ''}`,
      x,
      y,
      'text-anchor': anchor
    });
    label.textContent = text;
    layers.grid.append(label);
  };

  xAxisGuides.forEach((guide) => {
    const x = xFromYards(guide.yards);
    layers.grid.append(svgEl('line', {
      class: 'yard-line vertical-yard-line',
      x1: x,
      y1: top,
      x2: x,
      y2: bottom
    }));
    // Position labels outside the field
    if (guide.yards === 0) {
      appendYardLabel(guide.label, x - 10, top + 22, true, 'end');
    } else if (guide.yards === 25) {
      appendYardLabel(guide.label, x + 10, top + 22, true, 'start');
    } else {
      appendYardLabel(guide.label, x + 4, top - 10, true);
    }
  });

  [
    { yards: -20, label: 'Front 20yd' },
    { yards: -15, label: 'Front 15yd' },
    { yards: -10, label: 'Front 10yd' },
    { yards: -5, label: 'Front 5yd' },
    { yards: 0, label: 'Scrimmage', los: true },
    { yards: 5, label: 'Back 5yd' },
    { yards: 10, label: 'Back 10yd' }
  ].forEach((line) => {
    const y = scrimmageY + line.yards * yardScale;
    layers.grid.append(svgEl('line', {
      class: line.los ? 'los' : 'yard-line horizontal-yard-line',
      x1: left,
      y1: y,
      x2: right,
      y2: y
    }));
    // Position labels outside the field on the left
    appendYardLabel(line.label, left - 20, line.los ? y - 14 : y - 8, false, 'end');
  });
}

function drawRouteEnd(group, route) {
  const scale = state.endCapSize;
  if (route.end === 'dot') {
    const { end } = endGeometry(route.points);
    group.append(svgEl('circle', { class: 'end-dot', cx: end[0], cy: end[1], r: 11 * scale }));
  }

  if (route.end === 't') {
    const { end, nx, ny } = endGeometry(route.points);
    group.append(svgEl('line', {
      class: 'end-t',
      x1: end[0] - nx * 29 * scale,
      y1: end[1] - ny * 29 * scale,
      x2: end[0] + nx * 29 * scale,
      y2: end[1] + ny * 29 * scale
    }));
  }
}

function drawRouteHandles(group, route) {
  route.points.forEach((point, index) => {
    group.append(svgEl('circle', {
      class: 'route-handle',
      cx: point[0],
      cy: point[1],
      r: 10,
      'data-id': route.id,
      'data-kind': 'route-point',
      'data-index': index
    }));
  });

  for (let i = 0; i < route.points.length - 1; i += 1) {
    const a = route.points[i];
    const b = route.points[i + 1];
    group.append(svgEl('circle', {
      class: 'route-insert',
      cx: (a[0] + b[0]) / 2,
      cy: (a[1] + b[1]) / 2,
      r: 6,
      'data-id': route.id,
      'data-kind': 'route-insert',
      'data-index': i
    }));
  }
}

function drawRoutes() {
  layers.routes.replaceChildren();
  state.routes.forEach((route) => {
    const selected = state.selectedType === 'route' && state.selectedId === route.id;
    const group = svgEl('g', { 'data-id': route.id, 'data-kind': 'route' });
    const drawnPoints = route.type === 'motion' ? zigzagPoints(route.points) : route.points;
    const d = linePath(drawnPoints);

    group.append(svgEl('path', { class: 'route-hit', d }));
    group.append(svgEl('path', {
      class: `route ${route.type}${selected ? ' is-selected' : ''}`,
      d,
      'marker-end': route.end === 'arrow' ? 'url(#routeArrow)' : ''
    }));
    drawRouteEnd(group, route);
    if (selected) drawRouteHandles(group, route);
    layers.routes.append(group);
  });
}

function starPath(cx, cy, outer = 48, inner = 23) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return points.join(' ');
}

function markLabel(mark) {
  if (!mark) return '';
  return PLAYER_MARK_OPTIONS.find((option) => option.value === mark)?.label || '';
}

function playerMark(player) {
  if (!player || !state.playerMarks) return '';
  return state.playerMarks[player.label] || '';
}

function drawPlayer(player, defender = false) {
  const size = normalizePlayerSize(state.playerSize);
  const selectedRing = size + 7;
  const qbSize = size * 2;
  const mark = defender ? '' : playerMark(player);
  const group = svgEl('g', {
    class: `player ${defender ? 'defender' : ''}`,
    transform: `translate(${player.x} ${player.y})`,
    'data-id': player.id,
    'data-kind': defender ? 'defender' : 'player'
  });
  if (mark === 'ring') {
    group.append(svgEl('circle', { class: 'player-shape player-mark-ring-fill', cx: 0, cy: 0, r: size }));
  } else if (mark === 'star') {
    group.append(svgEl('polygon', { class: 'player-shape player-target', points: starPath(0, 0, size * 1.26, size * 0.61) }));
  } else if (mark === 'diamond') {
    const diamondSize = size * 1.45;
    group.append(svgEl('polygon', {
      class: 'player-shape player-mark-diamond',
      points: `0,-${diamondSize} ${diamondSize},0 0,${diamondSize} -${diamondSize},0`
    }));
  } else if (mark === 'square') {
    group.append(svgEl('rect', { class: 'player-shape player-mark-square', x: -size, y: -size, width: size * 2, height: size * 2 }));
  } else if (player.role === 'qb') {
    group.append(svgEl('rect', { class: 'player-shape player-qb', x: -size, y: -size, width: qbSize, height: qbSize }));
  } else {
    group.append(svgEl('circle', { class: 'player-shape', cx: 0, cy: 0, r: size }));
  }
  if (state.selectedId === player.id) {
    group.append(svgEl('circle', { class: 'selected-ring', cx: 0, cy: 0, r: selectedRing }));
  }
  group.append(svgEl('text', { class: 'player-text', x: 0, y: 3, style: `font-size: ${Math.max(11, size * 1.1)}px` }));
  group.lastElementChild.textContent = player.label;
  return group;
}

function drawPlayers() {
  layers.players.replaceChildren();
  state.defenders.forEach((defender) => layers.players.append(drawPlayer(defender, true)));
  state.players.forEach((player) => layers.players.append(drawPlayer(player, false)));
}

function appendMultilineText(textElement, text, x, lineHeight = 28) {
  const lines = String(text || '').split(/\n/).slice(0, 5);
  lines.forEach((line, index) => {
    const tspan = svgEl('tspan', { x, dy: index === 0 ? 0 : lineHeight });
    tspan.textContent = line;
    textElement.append(tspan);
  });
}

function drawText() {
  layers.text.replaceChildren();
  state.annotations.forEach((note) => {
    const selected = state.selectedType === 'annotation' && state.selectedId === note.id;
    const text = svgEl('text', {
      class: `annotation${selected ? ' is-selected' : ''}`,
      x: note.x,
      y: note.y,
      'data-id': note.id,
      'data-kind': 'annotation'
    });
    appendMultilineText(text, note.text, note.x, 28);
    layers.text.append(text);
  });
}

function drawMeta() {
  layers.meta.replaceChildren();
  const title = svgEl('text', { class: 'meta-title', x: 70, y: 668 });
  title.textContent = state.playName;
  layers.meta.append(title);

  if (state.notes) {
    const notes = svgEl('text', { class: 'meta-notes', x: 560, y: 668 });
    appendMultilineText(notes, state.notes, 560, 23);
    layers.meta.append(notes);
  }
}

function drawTemp() {
  layers.temp.replaceChildren();
  if (!state.routeDraft) return;
  const drawnPoints = state.routeDraft.type === 'motion' ? zigzagPoints(state.routeDraft.points) : state.routeDraft.points;
  layers.temp.append(svgEl('path', {
    class: `route ${state.routeDraft.type} is-selected`,
    d: linePath(drawnPoints),
    'marker-end': state.routeDraft.end === 'arrow' ? 'url(#routeArrow)' : ''
  }));
}

function drawMarkControls() {
  controls.markList.replaceChildren();
  state.players.forEach((player) => {
    const item = document.createElement('label');
    item.className = 'mark-item';
    const badge = document.createElement('span');
    const mark = playerMark(player);
    badge.className = `mark-badge${mark ? ` is-${mark}` : ''}`;
    badge.textContent = player.label;
    const select = document.createElement('select');
    PLAYER_MARK_OPTIONS.forEach((option) => {
      const itemOption = document.createElement('option');
      itemOption.value = option.value;
      itemOption.textContent = option.label;
      select.append(itemOption);
    });
    select.value = mark;
    select.addEventListener('change', () => {
      const nextMarks = normalizePlayerMarks({ ...state.playerMarks, [player.label]: select.value });
      state.playerMarks = nextMarks;
      saveLocal(false);
      render();
      setStatus(select.value ? `Player ${player.label}: ${markLabel(select.value)}` : `Player ${player.label}: No mark`);
    });
    item.append(badge, select);
    controls.markList.append(item);
  });
}

function syncSelectionControls() {
  const selectedNote = state.selectedType === 'annotation'
    ? state.annotations.find((note) => note.id === state.selectedId)
    : null;
  controls.selectionBadge.textContent = selectionLabel();
  controls.selectedText.disabled = !selectedNote;
  controls.selectedText.value = selectedNote?.text || '';
}

function render() {
  controls.titleLabel.textContent = state.playName;
  controls.snapToggle.checked = state.snap;
  syncPlayerSizeControl();
  syncEndCapSizeControl();
  
  // Update arrow marker size
  const marker = field.querySelector('#routeArrow');
  if (marker) {
    marker.setAttribute('markerWidth', 8 * state.endCapSize);
    marker.setAttribute('markerHeight', 8 * state.endCapSize);
  }
  
  drawGrid();
  drawRoutes();
  drawTemp();
  drawPlayers();
  drawText();
  drawMeta();
  drawMarkControls();
  renderPlaybookSelectors();
  syncSelectionControls();
  syncPlaysetFileBadge();
}

function selectThing(type, id) {
  state.selectedType = type;
  state.selectedId = id;
  if (type === 'route') {
    const route = state.routes.find((item) => item.id === id);
    if (route) controls.endCap.value = route.end;
  }
  render();
}

function routeDefaultsForTool(tool) {
  if (tool === 'block') return { type: 'block', end: 't', mode: 'straight' };
  if (tool === 'pass') return { type: 'pass', end: 'dot', mode: 'straight' };
  if (tool === 'motion') return { type: 'motion', end: 'arrow', mode: 'straight' };
  return { type: 'route', end: controls.endCap.value, mode: 'straight' };
}

function startRoute(player, event) {
  const defaults = routeDefaultsForTool(state.tool);
  const start = clampPoint([player.x, player.y]);
  const point = pointFromEvent(event);
  state.routeDraft = {
    ...defaults,
    playerId: player.id,
    points: [start, [point.x, point.y]]
  };
  state.drag = { kind: 'draw-route' };
  setStatus('Drawing');
  drawTemp();
}

function updateRouteDraft(event) {
  if (!state.routeDraft) return;
  const point = pointFromEvent(event);
  const points = state.routeDraft.points;
  points[points.length - 1] = [point.x, point.y];

  drawTemp();
}

function finishRoute() {
  if (!state.routeDraft) return;
  const points = sanitizePoints(state.routeDraft.points);
  if (points.length >= 2 && routeLength(points) > 20) {
    const route = { id: makeId('route'), ...state.routeDraft, points };
    state.routes.push(route);
    state.routeDraft = null;
    state.drag = null;
    selectThing('route', route.id);
    saveLocal(false);
    setStatus('Line selected');
    return;
  }
  state.routeDraft = null;
  state.drag = null;
  setStatus('準備OK');
  render();
}

function targetFromEvent(event) {
  const node = event.target.closest('[data-id]');
  if (!node) return null;
  return {
    id: node.dataset.id,
    kind: node.dataset.kind,
    index: node.dataset.index === undefined ? null : Number(node.dataset.index)
  };
}

function moveLinkedRouteStarts(player) {
  state.routes.forEach((route) => {
    if (route.playerId === player.id && route.points[0]) route.points[0] = [player.x, player.y];
  });
}

function createAnnotation(point) {
  const text = prompt('Comment', 'Comment');
  if (!text) return;
  const id = makeId('text');
  state.annotations.push({ id, text, x: point.x, y: point.y });
  selectThing('annotation', id);
  saveLocal(false);
}

function moveRoute(route, dx, dy) {
  route.points = route.points.map((point) => clampPoint([point[0] + dx, point[1] + dy]));
}

function handlePointerDown(event) {
  const hit = targetFromEvent(event);
  const point = pointFromEvent(event);
  field.setPointerCapture(event.pointerId);

  if (hit?.kind === 'route-point') {
    selectThing('route', hit.id);
    state.drag = { kind: 'route-point', id: hit.id, index: hit.index };
    return;
  }

  if (hit?.kind === 'route-insert') {
    const route = state.routes.find((item) => item.id === hit.id);
    if (!route) return;
    route.points.splice(hit.index + 1, 0, [point.x, point.y]);
    selectThing('route', hit.id);
    state.drag = { kind: 'route-point', id: hit.id, index: hit.index + 1 };
    return;
  }

  if (state.tool === 'text' && !hit) {
    createAnnotation(point);
    return;
  }

  if (hit?.kind === 'player' && DRAW_TOOLS.includes(state.tool)) {
    const player = state.players.find((item) => item.id === hit.id);
    if (player) startRoute(player, event);
    return;
  }

  if (hit) {
    const selectedKind = hit.kind === 'route' ? 'route' : hit.kind;
    selectThing(selectedKind, hit.id);

    if (hit.kind === 'route') {
      state.drag = { kind: 'route-move', id: hit.id, last: point };
      return;
    }

    const collection = hit.kind === 'player' ? state.players : hit.kind === 'defender' ? state.defenders : state.annotations;
    const item = collection.find((entry) => entry.id === hit.id);
    if (item) {
      state.drag = { kind: hit.kind, id: hit.id, dx: item.x - point.x, dy: item.y - point.y };
    }
    return;
  }

  state.selectedId = null;
  state.selectedType = null;
  render();
}

function handlePointerMove(event) {
  if (!state.drag) return;

  if (state.drag.kind === 'draw-route') {
    updateRouteDraft(event);
    return;
  }

  const point = pointFromEvent(event);

  if (state.drag.kind === 'route-point') {
    const route = state.routes.find((item) => item.id === state.drag.id);
    if (!route) return;
    route.points[state.drag.index] = [point.x, point.y];
    render();
    return;
  }

  if (state.drag.kind === 'route-move') {
    const route = state.routes.find((item) => item.id === state.drag.id);
    if (!route) return;
    const dx = point.x - state.drag.last.x;
    const dy = point.y - state.drag.last.y;
    moveRoute(route, dx, dy);
    state.drag.last = point;
    render();
    return;
  }

  const collection = state.drag.kind === 'player' ? state.players : state.drag.kind === 'defender' ? state.defenders : state.annotations;
  const item = collection.find((entry) => entry.id === state.drag.id);
  if (!item) return;
  item.x = point.x + state.drag.dx;
  item.y = point.y + state.drag.dy;
  if (state.drag.kind === 'player') moveLinkedRouteStarts(item);
  render();
}

function handlePointerUp() {
  if (state.drag?.kind === 'draw-route') {
    finishRoute();
    return;
  }

  if (state.drag) saveLocal(false);
  state.drag = null;
}

function editSelectedAnnotation() {
  if (state.selectedType !== 'annotation') return;
  const note = state.annotations.find((item) => item.id === state.selectedId);
  if (!note) return;
  const text = prompt('コメント', note.text);
  if (!text) return;
  note.text = text;
  saveLocal(false);
  render();
}

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

function exportSvg() {
  saveLocal(false);
  const clone = field.cloneNode(true);
  cleanExportSvg(clone);
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.playName || 'play'}.svg`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus('Exporting SVG');
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
    applyPlay(activePlay());
    saveLocal(false);
    syncPlaysetFileBadge();
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
  syncPlaysetFileBadge();
  setStatus('Exporting JSON');
}

async function savePlaysetFile() {
  if (!state.fileHandle) {
    setStatus('Save Location Not Selected');
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

function exportJson() {
  downloadPlaysetJson(state.fileName || 'flag-playbook.json');
  setStatus('Backup');
}

function exportPdf() {
  saveLocal(false);
  state.selectedId = null;
  state.selectedType = null;
  render();
  setStatus('PDF');
  window.print();
}

function folderById(folderId) {
  return state.playbook.folders.find((folder) => folder.id === folderId);
}

function selectFolder(folderId) {
  const folder = folderById(folderId);
  if (!folder) return;
  saveLocal(false);
  state.activeFolderId = folder.id;
  state.openFolderIds.add(folder.id);
  const play = folder.plays.find((item) => item.id === state.activePlayId) || folder.plays[0];
  if (!play) return;
  state.activePlayId = play.id;
  applyPlay(play);
  setStatus(folder.name);
}

function selectPlay(folderId, playId) {
  const folder = folderById(folderId);
  const play = folder?.plays.find((item) => item.id === playId);
  if (!folder || !play) return;
  saveLocal(false);
  state.activeFolderId = folder.id;
  state.activePlayId = play.id;
  state.openFolderIds.add(folder.id);
  applyPlay(play);
  setStatus(play.name || 'Untitled');
}

function createNewPlay(folderId = state.activeFolderId) {
  saveLocal(false);
  const folder = folderById(folderId) || activeFolder();
  if (!folder) return;
  const play = normalizePlay({
    ...cloneData(defaultPlay),
    id: makeId('play'),
    name: `New Play ${folder.plays.length + 1}`,
    routes: [],
    annotations: [],
    notes: ''
  });
  folder.plays.push(play);
  state.activeFolderId = folder.id;
  state.activePlayId = play.id;
  state.openFolderIds.add(folder.id);
  applyPlay(play);
  saveLocal(true);
}

function createNewFolder() {
  saveLocal(false);
  const name = prompt('Folder Name', `Folder ${state.playbook.folders.length + 1}`);
  if (!name) return;
  const play = normalizePlay({ ...cloneData(defaultPlay), id: makeId('play'), name: 'New Play 1' });
  const folder = { id: makeId('folder'), name, plays: [play] };
  state.playbook.folders.push(folder);
  state.activeFolderId = folder.id;
  state.activePlayId = play.id;
  state.openFolderIds.add(folder.id);
  applyPlay(play);
  saveLocal(true);
}

function renameFolderById(folderId = state.activeFolderId) {
  const folder = folderById(folderId);
  if (!folder) return;
  const name = prompt('Folder Name', folder.name);
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed || trimmed === folder.name) return;
  folder.name = trimmed;
  saveLocal(false);
  render();
  setStatus('Folder Renamed');
}

function renamePlayById(folderId = state.activeFolderId, playId = state.activePlayId) {
  const folder = folderById(folderId);
  const play = folder?.plays.find((item) => item.id === playId);
  if (!folder || !play) return;
  const name = prompt('Play Name', play.name || 'Untitled');
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed || trimmed === play.name) return;
  play.name = trimmed;
  if (state.activeFolderId === folder.id && state.activePlayId === play.id) {
    state.playName = trimmed;
  }
  saveLocal(false);
  render();
  setStatus('Play Renamed');
}

function duplicatePlayById(folderId = state.activeFolderId, playId = state.activePlayId) {
  saveLocal(false);
  const folder = folderById(folderId);
  const source = folder?.plays.find((item) => item.id === playId);
  if (!folder || !source) return;
  const duplicate = normalizePlay({
    ...cloneData(source),
    id: makeId('play'),
    name: `${source.name || 'Untitled'} Copy`
  });
  const index = folder.plays.findIndex((item) => item.id === playId);
  folder.plays.splice(index + 1, 0, duplicate);
  state.activeFolderId = folder.id;
  state.activePlayId = duplicate.id;
  state.openFolderIds.add(folder.id);
  applyPlay(duplicate);
  saveLocal(true);
}

function duplicateCurrentPlay() {
  duplicatePlayById();
}

function deletePlayById(folderId = state.activeFolderId, playId = state.activePlayId) {
  const folder = folderById(folderId);
  if (!folder || folder.plays.length <= 1) {
    setStatus('Last Play');
    return;
  }
  const index = folder.plays.findIndex((play) => play.id === playId);
  if (index === -1) return;
  const play = folder.plays[index];
  if (!confirm(`Delete "${play.name || 'Untitled'}"?`)) return;
  saveLocal(false);
  folder.plays.splice(index, 1);

  if (state.activeFolderId === folder.id && state.activePlayId === playId) {
    const nextPlay = folder.plays[Math.min(index, folder.plays.length - 1)];
    state.activePlayId = nextPlay.id;
    applyPlay(nextPlay);
    saveLocal(true);
  } else {
    saveLocal(true);
    render();
  }
}

function deleteCurrentPlay() {
  deletePlayById();
}

function deleteFolderById(folderId = state.activeFolderId) {
  if (state.playbook.folders.length <= 1) {
    setStatus('Last Folder');
    return;
  }
  const index = state.playbook.folders.findIndex((folder) => folder.id === folderId);
  if (index === -1) return;
  const folder = state.playbook.folders[index];
  if (!confirm(`Delete folder "${folder.name}"?`)) return;
  saveLocal(false);
  state.playbook.folders.splice(index, 1);
  state.openFolderIds.delete(folder.id);

  if (state.activeFolderId === folder.id) {
    const nextFolder = state.playbook.folders[Math.min(index, state.playbook.folders.length - 1)];
    state.activeFolderId = nextFolder.id;
    state.activePlayId = nextFolder.plays[0].id;
    state.openFolderIds.add(nextFolder.id);
    applyPlay(nextFolder.plays[0]);
  } else {
    render();
  }
  saveLocal(true);
}

function deleteCurrentFolder() {
  deleteFolderById();
}

function deleteSelectedItem() {
  if (!state.selectedId) return;
  if (state.selectedType === 'route') state.routes = state.routes.filter((item) => item.id !== state.selectedId);
  if (state.selectedType === 'annotation') state.annotations = state.annotations.filter((item) => item.id !== state.selectedId);
  if (state.selectedType === 'player' || state.selectedType === 'defender') {
    setStatus('5v5固定');
    return;
  }
  state.selectedId = null;
  state.selectedType = null;
  saveLocal(false);
  render();
}

function flipPlay() {
  const flipX = (x) => 1000 - x;
  state.players.forEach((item) => { item.x = flipX(item.x); });
  state.defenders.forEach((item) => { item.x = flipX(item.x); });
  state.annotations.forEach((item) => { item.x = flipX(item.x); });
  state.routes.forEach((route) => {
    route.points = route.points.map(([x, y]) => [flipX(x), y]);
  });
  saveLocal(false);
  render();
}

function clearRoutes() {
  if (!state.routes.length) {
    setStatus('線なし');
    return;
  }
  state.routes = [];
  state.routeDraft = null;
  if (state.selectedType === 'route') {
    state.selectedId = null;
    state.selectedType = null;
  }
  saveLocal(false);
  setStatus('線を全消去');
  render();
}

function handlePlaybookTreeClick(event) {
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
document.querySelector('#saveBtn').addEventListener('click', () => downloadPlaysetJson(state.fileName || 'flag-playbook.json'));
document.querySelector('#openPlaysetBtn').addEventListener('click', openPlaysetFile);
document.querySelector('#savePlaysetFileBtn').addEventListener('click', savePlaysetFile);
document.querySelector('#savePlaysetAsBtn').addEventListener('click', savePlaysetAs);
document.querySelector('#exportSvgBtn').addEventListener('click', exportSvg);
document.querySelector('#exportJsonBtn').addEventListener('click', exportJson);
document.querySelector('#pdfBtn').addEventListener('click', exportPdf);

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

loadInitialState();
