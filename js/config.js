// Shared constants, default data, global state, and DOM references.
const SVG_NS = 'http://www.w3.org/2000/svg';
const DRAW_TOOLS = ['route', 'draw', 'motion', 'pass', 'block'];
const PLAYBOOK_FORMAT_VERSION = 1;

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
  width: 9,
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
  routeMode: 'straight',
  routeStyle: {
    color: ROUTE_STYLE.color,
    width: ROUTE_STYLE.width,
    opacity: ROUTE_STYLE.opacity
  },
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
  routeMode: 'straight',
  routeStyle: cloneData(defaultPlay.routeStyle),
  fileHandle: null,
  fileName: '',
  openFolderIds: new Set(),
  treeDrag: null,
  suppressTreeClick: false,
  pendingPreset: null,
  printCleanup: null
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
  endCap: document.querySelector('#endCap'),
  snapToggle: document.querySelector('#snapToggle')
};
