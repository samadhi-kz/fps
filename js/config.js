// Shared constants, default data, global state, and DOM references.
const SVG_NS = 'http://www.w3.org/2000/svg';
const DRAW_TOOLS = ['route', 'draw', 'motion', 'pass', 'block'];
const PLAYBOOK_FORMAT_VERSION = 1;
const HISTORY_LIMIT = 80;
const HISTORY_COALESCE_MS = 2500;

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

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
  default: 0.5,
  min: 0.5,
  max: 2
};
const ROUTE_STYLE = {
  color: '#101010',
  width: 5,
  opacity: 1,
  minWidth: 2,
  maxWidth: 16,
  minOpacity: 0.2,
  maxOpacity: 1
};
const ROUTE_MODES = new Set(['straight', 'curve', 'draw']);
const ROUTE_PRESETS = [
  { value: 'go', label: 'Go' },
  { value: 'out', label: 'Out' },
  { value: 'in', label: 'In' },
  { value: 'slant', label: 'Slant' },
  { value: 'post', label: 'Post' },
  { value: 'corner', label: 'Corner' },
  { value: 'curl', label: 'Curl' },
  { value: 'motion', label: 'Motion' },
  { value: 'block', label: 'Block' }
];
const OFFENSE_FORMATIONS = [
  {
    value: 'singleBack',
    label: 'Single back',
    positions: {
      1: [12.5, 0],
      2: [12.5, 5],
      3: [12.5, 8],
      4: [19, 0],
      5: [23, 0]
    }
  },
  {
    value: 'spread',
    label: 'Spread',
    positions: {
      1: [12.5, 0],
      2: [12.5, 5],
      3: [9, 0],
      4: [3, 0],
      5: [22, 0]
    }
  },
  {
    value: 'twins',
    label: 'Twins',
    positions: {
      1: [12.5, 0],
      2: [12.5, 5],
      3: [9.5, 0],
      4: [20, 0],
      5: [23, 0]
    }
  },
  {
    value: 'twinsStack',
    label: 'Twins stack',
    positions: {
      1: [12.5, 0],
      2: [12.5, 5],
      3: [9.5, 0],
      4: [22, 0],
      5: [22, 2.5]
    }
  },
  {
    value: 'trips',
    label: 'Trips',
    positions: {
      1: [12.5, 0],
      2: [12.5, 5],
      3: [16, 0],
      4: [20, 0],
      5: [24, 0]
    }
  },
  {
    value: 'bunch',
    label: 'Bunch',
    positions: {
      1: [12.5, 0],
      2: [12.5, 5],
      3: [20, 2.5],
      4: [18.5, 0],
      5: [21.5, 0]
    }
  },
  {
    value: 'tight',
    label: 'Tight',
    positions: {
      1: [12.5, 0],
      2: [12.5, 5],
      3: [9.5, 0],
      4: [11, 0],
      5: [14, 0]
    }
  },
  {
    value: 'doubleBack',
    label: 'Double back',
    positions: {
      1: [12.5, 0],
      2: [12.5, 5],
      3: [10, 7],
      4: [15, 7],
      5: [3, 0]
    }
  },
  {
    value: 'iFormation',
    label: 'I formation',
    positions: {
      1: [12.5, 0],
      2: [12.5, 4],
      3: [12.5, 7],
      4: [12.5, 10],
      5: [23, 0]
    }
  }
];
const PLAYER_LABELS = ['1', '2', '3', '4', '5'];
const PLAYER_ROLES = {
  1: { value: 'center', label: 'Center/Screen' },
  2: { value: 'qb', label: 'QB' },
  3: { value: 'rb_wr', label: 'RB/WR' },
  4: { value: 'blocker_wr', label: 'Blocker/WR/Screen' },
  5: { value: 'wr', label: 'WR' }
};
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
  defenseVisible: true,
  routeMode: 'straight',
  routeStyle: {
    color: ROUTE_STYLE.color,
    width: ROUTE_STYLE.width,
    opacity: ROUTE_STYLE.opacity
  },
  players: [
    { id: 'p1', label: '1', x: fieldX(12.5), y: fieldY(0), role: 'center' },
    { id: 'p2', label: '2', x: fieldX(12.5), y: fieldY(5), role: 'qb' },
    { id: 'p3', label: '3', x: fieldX(10), y: fieldY(0), role: 'rb_wr' },
    { id: 'p4', label: '4', x: fieldX(15), y: fieldY(0), role: 'blocker_wr' },
    { id: 'p5', label: '5', x: fieldX(20), y: fieldY(0), role: 'wr' }
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
  defenseVisible: true,
  routes: [],
  annotations: [],
  playerSize: PLAYER_SIZE.default,
  endCapSize: END_CAP_SIZE.default,
  routeMode: 'straight',
  routeStyle: cloneData(defaultPlay.routeStyle),
  fileHandle: null,
  fileName: '',
  openFolderIds: new Set(),
  treeDrag: null,
  suppressTreeClick: false,
  pendingPreset: null,
  printCleanup: null,
  undoStack: [],
  redoStack: [],
  historyFingerprint: '',
  historyLastKey: '',
  historyLastAt: 0,
  isRestoringHistory: false
};

const field = document.querySelector('#field');
const layers = {
  grid: document.querySelector('#gridLayer'),
  routeHits: document.querySelector('#routeHitLayer'),
  defenders: document.querySelector('#defenderLayer'),
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
  folderLabel: document.querySelector('#folderLabel'),
  bookNoteName: document.querySelector('#bookNoteName'),
  playNoteName: document.querySelector('#playNoteName'),
  playsetFileHint: document.querySelector('#playsetFileHint'),
  playsetFileInput: document.querySelector('#playsetFileInput'),
  savePlaysetFileBtn: document.querySelector('#savePlaysetFileBtn'),
  playerSize: document.querySelector('#playerSize'),
  playerSizeValue: document.querySelector('#playerSizeValue'),
  endCapSize: document.querySelector('#endCapSize'),
  endCapSizeValue: document.querySelector('#endCapSizeValue'),
  lineColor: document.querySelector('#lineColor'),
  lineWidth: document.querySelector('#lineWidth'),
  lineWidthValue: document.querySelector('#lineWidthValue'),
  lineOpacity: document.querySelector('#lineOpacity'),
  lineOpacityValue: document.querySelector('#lineOpacityValue'),
  routeShape: document.querySelector('#routeShape'),
  routePresets: document.querySelector('#routePresets'),
  titleLabel: document.querySelector('#titleLabel'),
  markList: document.querySelector('#markList'),
  statusText: document.querySelector('#statusText'),
  bookNoteName: document.querySelector('#bookNoteName'),
  playNoteName: document.querySelector('#playNoteName'),
  endCap: document.querySelector('#endCap'),
  snapToggle: document.querySelector('#snapToggle'),
  defenseToggle: document.querySelector('#defenseToggle')
};
