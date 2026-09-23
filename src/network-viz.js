/* Self-contained, directed dependency view. Positions are visual, not model outputs. */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const colors = {
    civilization: ['#f18b8b', '#c94040', '#63232d'],
    biosphere: ['#76e6b3', '#2a9d6e', '#164d3d'],
    technology: ['#8bbbf5', '#3a78c9', '#213b67'],
  };
  let serial = 0;

  function svgElement(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function spread(items, xPositions, top, bottom, target) {
    const columns = xPositions.length;
    const rows = Math.ceil(items.length / columns);
    items.forEach((item, index) => {
      const row = Math.floor(index / columns);
      target.set(item.id, {
        x: xPositions[index % columns],
        y: rows <= 1 ? (top + bottom) / 2 : top + row * (bottom - top) / (rows - 1),
      });
    });
  }

  function makeNetworkViz(container, options) {
    if (!container) throw new Error('Network container is missing.');
    const nodes = options.nodes || [];
    const edges = options.edges || [];
    const byId = new Map(nodes.map(node => [node.id, node]));
    const nodeState = new Map();
    const edgeState = [];
    const instanceId = `network-viz-${++serial}`;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let overview = new Map();
    let focusId = null;
    let pinnedId = null;
    let frameId = 0;
    let previousTime = 0;
    let drag = null;
    let skipClick = false;
    let destroyed = false;
    let denseOutgoing = false;

    const svg = svgElement('svg', {
      class: 'network-viz-svg', role: 'group',
      'aria-label': 'Directed dependency network. Select a circle to see only the threats it affects.',
    });
    const defs = svgElement('defs');
    Object.entries(colors).forEach(([domain, stops]) => {
      const gradient = svgElement('radialGradient', {
        id: `${instanceId}-${domain}`, cx: '35%', cy: '28%', r: '78%', fx: '35%', fy: '28%',
      });
      [0, 52, 100].forEach((offset, index) => {
        gradient.appendChild(svgElement('stop', { offset: `${offset}%`, 'stop-color': stops[index] }));
      });
      defs.appendChild(gradient);
    });
    const arrow = svgElement('marker', {
      id: `${instanceId}-arrow`, viewBox: '0 0 9 8', markerWidth: 9, markerHeight: 8,
      refX: 8, refY: 4, orient: 'auto', markerUnits: 'userSpaceOnUse',
    });
    arrow.appendChild(svgElement('path', { d: 'M0 0 L9 4 L0 8 Z', fill: 'context-stroke' }));
    defs.appendChild(arrow);
    svg.appendChild(defs);
    const linkLayer = svgElement('g', { class: 'network-viz-links' });
    const nodeLayer = svgElement('g', { class: 'network-viz-nodes' });
    svg.append(linkLayer, nodeLayer);
    container.replaceChildren(svg);

    function labelLines(label) {
      const words = String(label || '').split(/\s+/);
      const lines = [];
      let line = '';
      words.forEach(word => {
        if (line && `${line} ${word}`.length > 15) {
          lines.push(line);
          line = word;
        } else {
          line = line ? `${line} ${word}` : word;
        }
      });
      if (line) lines.push(line);
      return lines.slice(0, 3);
    }

    nodes.forEach(node => {
      const group = svgElement('g', {
        class: `network-viz-node network-viz-${node.domain}`,
        'data-node-id': node.id, role: 'button', tabindex: '0',
        'aria-label': node.name,
      });
      const halo = svgElement('circle', { class: 'network-viz-halo', r: 28 });
      const bubble = svgElement('circle', {
        class: 'network-viz-bubble', r: 20,
        fill: `url(#${instanceId}-${colors[node.domain] ? node.domain : 'civilization'})`,
      });
      const ring = svgElement('circle', { class: 'network-viz-ring', r: 21 });
      const number = svgElement('text', { class: 'network-viz-number', 'text-anchor': 'middle', y: 4 });
      const label = svgElement('text', { class: 'network-viz-label', 'text-anchor': 'middle' });
      labelLines(node.name).forEach((line, index) => {
        const part = svgElement('tspan', { x: 0, dy: index ? 12 : 0 });
        part.textContent = line;
        label.appendChild(part);
      });
      group.append(halo, bubble, ring, number, label);
      nodeLayer.appendChild(group);
      const baseRadius = 16 + 6 * (Number(node.priority) || 0) / 7;
      nodeState.set(node.id, {
        node, group, halo, bubble, ring, number, label,
        x: 0, y: 0, vx: 0, vy: 0, radius: baseRadius,
        targetX: 0, targetY: 0, targetRadius: baseRadius, baseRadius,
      });
    });

    const edgeKeys = new Set(edges.map(edge => `${edge.upstream}->${edge.target}`));
    edges.forEach(edge => {
      if (!byId.has(edge.upstream) || !byId.has(edge.target)) return;
      const path = svgElement('path', {
        class: 'network-viz-link',
        'data-edge-id': `${edge.upstream}->${edge.target}`,
        'data-reviewed': edge.reviewed ? 'true' : 'false',
        'data-propagates': edge.propagates ? 'true' : 'false',
        fill: 'none',
      });
      if (edge.propagates) path.setAttribute('marker-end', `url(#${instanceId}-arrow)`);
      if (!edge.propagates) path.setAttribute('stroke-dasharray', '1.5 5');
      else if (!edge.reviewed) path.setAttribute('stroke-dasharray', '6 5');
      // A separate moving highlight leaves the evidence/status line style intact.
      const flow = svgElement('path', {
        class: 'network-viz-flow',
        'data-propagates': edge.propagates ? 'true' : 'false',
        fill: 'none', 'aria-hidden': 'true',
      });
      linkLayer.append(path, flow);
      edgeState.push({ edge, path, flow, reverse: edgeKeys.has(`${edge.target}->${edge.upstream}`) });
    });

    function dimensions() {
      width = Math.max(280, container.clientWidth || 960);
      height = Math.max(420, container.clientHeight || 620);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    function overviewPositions() {
      const positions = new Map();
      const compact = width < 600;
      const domainX = { biosphere: width * 0.17, civilization: width * 0.50, technology: width * 0.83 };
      ['biosphere', 'civilization', 'technology'].forEach(domain => {
        const bucket = nodes.filter(node => node.domain === domain)
          .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
        const top = compact ? 42 : 58;
        const bottom = height - (compact ? 56 : 70);
        const step = bucket.length > 1 ? (bottom - top) / (bucket.length - 1) : 0;
        bucket.forEach((node, index) => {
          const offset = domain === 'civilization' && !compact ? (index % 2 ? 42 : -42) : 0;
          positions.set(node.id, {
            x: domainX[domain] + offset,
            y: bucket.length === 1 ? height / 2 : top + step * index,
          });
        });
      });
      return positions;
    }

    function focusPositions(id) {
      const positions = new Map(overview);
      const compact = width < 600;
      const outgoing = edgeState.filter(item => item.edge.upstream === id).map(item => item.edge)
        .sort((a, b) => Number(b.propagates) - Number(a.propagates) ||
          (Number(byId.get(b.target).priority) || 0) - (Number(byId.get(a.target).priority) || 0));
      const sourceX = width * (outgoing.length ? (compact ? 0.24 : 0.22) : 0.50);
      positions.set(id, { x: sourceX, y: height / 2 });
      const twoColumns = outgoing.length > (compact ? 9 : 8);
      const targetX = twoColumns
        ? [width * (compact ? 0.62 : 0.64), width * (compact ? 0.84 : 0.86)]
        : [width * (compact ? 0.74 : 0.76)];
      spread(outgoing.map(edge => byId.get(edge.target)), targetX,
        compact ? 48 : 58, height - (compact ? 48 : 78), positions);
      return { positions, outgoing };
    }

    function draw() {
      nodeState.forEach(state => {
        state.group.setAttribute('transform', `translate(${state.x.toFixed(2)} ${state.y.toFixed(2)})`);
        state.bubble.setAttribute('r', state.radius.toFixed(2));
        state.ring.setAttribute('r', (state.radius + 1).toFixed(2));
        state.halo.setAttribute('r', (state.radius + 9).toFixed(2));
        const sideLabel = denseOutgoing && width >= 600 && state.group.getAttribute('data-role') === 'outgoing';
        const labelX = sideLabel ? state.radius + 9 : 0;
        state.label.setAttribute('x', labelX.toFixed(2));
        state.label.setAttribute('y', sideLabel ? -6 * (state.label.children.length - 1) : (state.radius + 16).toFixed(2));
        state.label.setAttribute('text-anchor', sideLabel ? 'start' : 'middle');
        [...state.label.children].forEach(part => part.setAttribute('x', labelX.toFixed(2)));
      });
      edgeState.forEach(({ edge, path, flow, reverse }) => {
        const source = nodeState.get(edge.upstream);
        const target = nodeState.get(edge.target);
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / distance;
        const uy = dy / distance;
        const x1 = source.x + ux * (source.radius + 2);
        const y1 = source.y + uy * (source.radius + 2);
        const x2 = target.x - ux * (target.radius + 5);
        const y2 = target.y - uy * (target.radius + 5);
        const bend = reverse ? 12 : 0;
        const mx = (x1 + x2) / 2 - uy * bend;
        const my = (y1 + y2) / 2 + ux * bend;
        const geometry = `M${x1.toFixed(2)},${y1.toFixed(2)} Q${mx.toFixed(2)},${my.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
        path.setAttribute('d', geometry);
        flow.setAttribute('d', geometry);
      });
    }

    function step(timestamp) {
      if (destroyed) return;
      const dt = Math.min(2, Math.max(0.5, (timestamp - (previousTime || timestamp - 16.7)) / 16.7));
      previousTime = timestamp;
      let moving = false;
      nodeState.forEach(state => {
        if (drag?.id === state.node.id) return;
        if (prefersReducedMotion.matches) {
          state.x = state.targetX;
          state.y = state.targetY;
          state.radius = state.targetRadius;
          state.vx = state.vy = 0;
          return;
        }
        state.vx = (state.vx + (state.targetX - state.x) * 0.105 * dt) * Math.pow(0.73, dt);
        state.vy = (state.vy + (state.targetY - state.y) * 0.105 * dt) * Math.pow(0.73, dt);
        state.x += state.vx * dt;
        state.y += state.vy * dt;
        state.radius += (state.targetRadius - state.radius) * Math.min(1, 0.19 * dt);
        if (Math.abs(state.targetX - state.x) + Math.abs(state.targetY - state.y) +
            Math.abs(state.vx) + Math.abs(state.vy) + Math.abs(state.targetRadius - state.radius) > 0.14) moving = true;
        else {
          state.x = state.targetX;
          state.y = state.targetY;
          state.radius = state.targetRadius;
          state.vx = state.vy = 0;
        }
      });
      draw();
      frameId = moving || drag ? requestAnimationFrame(step) : 0;
    }

    function animate() {
      if (!frameId) {
        previousTime = 0;
        frameId = requestAnimationFrame(step);
      }
    }

    function applyFocus(id, pin = false) {
      if (!byId.has(id)) return;
      if (focusId === id && pinnedId === (pin ? id : null)) return;
      focusId = id;
      if (pin) pinnedId = id;
      const { positions, outgoing } = focusPositions(id);
      denseOutgoing = outgoing.length > 8;
      const outgoingSet = new Set(outgoing.map(edge => edge.target));
      const outgoingRanks = new Map(outgoing.map((edge, index) => [edge.target, index + 1]));
      nodeState.forEach((state, nodeId) => {
        const position = positions.get(nodeId);
        state.targetX = position.x;
        state.targetY = position.y;
        state.targetRadius = state.baseRadius + (nodeId === id ? 5 : outgoingSet.has(nodeId) ? 2 : -2);
        const role = nodeId === id ? 'source' : outgoingSet.has(nodeId) ? 'outgoing' : 'muted';
        state.group.setAttribute('data-role', role);
        state.number.textContent = role === 'outgoing' ? String(outgoingRanks.get(nodeId)) : '';
      });
      edgeState.forEach(({ edge, path, flow }) => {
        const role = edge.upstream === id ? 'outgoing' : 'muted';
        path.setAttribute('data-role', role);
        flow.setAttribute('data-role', role);
      });
      if (typeof options.onFocus === 'function') options.onFocus(id, Boolean(pinnedId));
      animate();
    }

    function clearFocus() {
      if (!focusId && !pinnedId) return;
      focusId = pinnedId = null;
      denseOutgoing = false;
      nodeState.forEach((state, nodeId) => {
        const position = overview.get(nodeId);
        state.targetX = position.x;
        state.targetY = position.y;
        state.targetRadius = state.baseRadius;
        state.group.removeAttribute('data-role');
        state.number.textContent = '';
      });
      edgeState.forEach(({ path, flow }) => {
        path.removeAttribute('data-role');
        flow.removeAttribute('data-role');
      });
      if (typeof options.onClear === 'function') options.onClear();
      animate();
    }

    function resize() {
      dimensions();
      overview = overviewPositions();
      const positions = focusId ? focusPositions(focusId).positions : overview;
      nodeState.forEach((state, id) => {
        const position = positions.get(id);
        state.targetX = position.x;
        state.targetY = position.y;
      });
      animate();
    }

    function pointFromEvent(event) {
      const rect = svg.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * width / rect.width,
        y: (event.clientY - rect.top) * height / rect.height,
      };
    }

    nodeState.forEach((state, id) => {
      state.group.addEventListener('pointerenter', () => {
        // A moving bubble can pass under a stationary pointer. Do not turn
        // that animation frame into an unintended new selection.
        if (!pinnedId && !drag && !frameId && window.matchMedia('(hover: hover)').matches) applyFocus(id);
      });
      state.group.addEventListener('click', event => {
        event.stopPropagation();
        if (skipClick) { skipClick = false; return; }
        if (pinnedId === id) clearFocus();
        else applyFocus(id, true);
      });
      state.group.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (pinnedId === id) clearFocus();
        else applyFocus(id, true);
      });
      state.group.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch') return;
        const point = pointFromEvent(event);
        drag = { id, startX: point.x, startY: point.y, moved: false };
        state.group.setPointerCapture(event.pointerId);
      });
      state.group.addEventListener('pointermove', event => {
        if (!drag || drag.id !== id) return;
        const point = pointFromEvent(event);
        if (Math.hypot(point.x - drag.startX, point.y - drag.startY) < 4 && !drag.moved) return;
        drag.moved = true;
        state.x = Math.max(state.radius + 4, Math.min(width - state.radius - 4, point.x));
        state.y = Math.max(state.radius + 4, Math.min(height - state.radius - 4, point.y));
        draw();
      });
      state.group.addEventListener('pointerup', () => {
        if (!drag || drag.id !== id) return;
        skipClick = drag.moved;
        drag = null;
        animate();
      });
      state.group.addEventListener('pointercancel', () => { drag = null; animate(); });
    });
    const onBackgroundClick = event => { if (event.target === svg) clearFocus(); };
    const onStageLeave = () => { if (!pinnedId && !drag) clearFocus(); };
    svg.addEventListener('click', onBackgroundClick);
    container.addEventListener('pointerleave', onStageLeave);

    dimensions();
    overview = overviewPositions();
    nodeState.forEach((state, id) => {
      const position = overview.get(id);
      state.x = state.targetX = position.x;
      state.y = state.targetY = position.y;
      state.targetRadius = state.baseRadius;
    });
    draw();
    if (options.initialId && byId.has(options.initialId)) {
      applyFocus(options.initialId, true);
    }

    return {
      focus: applyFocus,
      clear: clearFocus,
      resize,
      getState: () => ({
        focusId, pinnedId, width, height,
        nodes: [...nodeState.values()].map(state => ({
          id: state.node.id, x: state.x, y: state.y,
          targetX: state.targetX, targetY: state.targetY,
          role: state.group.getAttribute('data-role') || 'overview',
        })),
        edges: edgeState.map(({ edge, path }) => ({
          source: edge.upstream, target: edge.target,
          propagates: edge.propagates, reviewed: edge.reviewed,
          role: path.getAttribute('data-role') || 'overview',
        })),
      }),
      destroy: () => {
        destroyed = true;
        if (frameId) cancelAnimationFrame(frameId);
        container.removeEventListener('pointerleave', onStageLeave);
        svg.removeEventListener('click', onBackgroundClick);
        svg.remove();
      },
    };
  }

  window.makeNetworkViz = makeNetworkViz;
})();
