// Pointer interactions, route editing, selection deletion, flip, and clear actions.
function routeDefaultsForTool(tool) {
  const style = normalizeRouteStyle(state.routeStyle);
  if (tool === 'block') return { type: 'block', end: 't', mode: 'straight', ...style };
  if (tool === 'pass') return { type: 'pass', end: 'dot', mode: 'straight', ...style };
  if (tool === 'motion') return { type: 'motion', end: 'arrow', mode: 'straight', ...style };
  return { type: 'route', end: controls.endCap.value, mode: 'straight', ...style };
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

function updateLineStyle(partialStyle) {
  const route = activeRoute();
  if (route) {
    Object.assign(route, normalizeRouteStyle({ ...route, ...partialStyle }));
    saveLocal(false);
    drawRoutes();
    syncLineStyleControls();
    setStatus('Line Style');
    return;
  }

  state.routeStyle = normalizeRouteStyle({ ...state.routeStyle, ...partialStyle });
  saveLocal(false);
  drawTemp();
  syncLineStyleControls();
  setStatus('Line Default');
}
