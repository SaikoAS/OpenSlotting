(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OpenSlottingWarehouseWebGL = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STRIDE = 10;
  const FACES = [[4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const FLOOR_TYPES = ['aisle', 'goods-in', 'goods-out'];
  const SHADES = [1, .78, .66, .86, .72];
  const NO_PICK = [0, 0, 0];
  const VERTEX_SOURCE = '#version 300 es\n' +
    'in vec3 aPosition; in vec4 aColor; in vec3 aPick;\n' +
    'uniform bool uPicking; out vec4 vColor;\n' +
    'void main() { gl_Position = vec4(aPosition, 1.0); vColor = uPicking ? vec4(aPick, 1.0) : aColor; }';
  const FRAGMENT_SOURCE = '#version 300 es\nprecision highp float; in vec4 vColor; out vec4 outColor;\n' +
    'void main() { outColor = vColor; }';

  function color(hex, factor, alpha) {
    const value = String(hex).replace('#', '');
    return [0, 2, 4].map(function (index) {
      return Math.min(1, parseInt(value.slice(index, index + 2), 16) / 255 * factor);
    }).concat(alpha);
  }
  function idColor(id) { return [(id & 255) / 255, ((id >> 8) & 255) / 255, ((id >> 16) & 255) / 255]; }
  function vertexBuffer(vertexCount) { return { values: new Float32Array(vertexCount * STRIDE), offset: 0 }; }
  function pushVertex(target, point, rgba, pick, bias) {
    const values = target.values;
    let index = target.offset;
    values[index++] = point.x; values[index++] = point.y; values[index++] = point.z + (bias || 0);
    values[index++] = rgba[0]; values[index++] = rgba[1]; values[index++] = rgba[2]; values[index++] = rgba[3];
    values[index++] = pick[0]; values[index++] = pick[1]; values[index++] = pick[2];
    target.offset = index;
  }
  function pushLine(target, first, second, rgba, bias) {
    pushVertex(target, first, rgba, NO_PICK, bias);
    pushVertex(target, second, rgba, NO_PICK, bias);
  }

  function panTarget(target, yaw, pitch, dx, dy, scale) {
    if (!target || !Number.isFinite(scale) || scale <= 0) return target;
    const right = -dx / scale, down = -dy / scale;
    return {
      x: target.x + right * Math.cos(yaw) + down * Math.sin(yaw) * Math.sin(pitch),
      y: target.y - down * Math.cos(pitch),
      z: target.z - right * Math.sin(yaw) + down * Math.cos(yaw) * Math.sin(pitch)
    };
  }

  const DIGIT_SEGMENTS = ['abcdef','bc','abged','abgcd','fgbc','afgcd','afgecd','abc','abcdefg','abfgcd'];
  const SEGMENT_POINTS = { a:[0,0,1,0], b:[1,0,1,.5], c:[1,.5,1,1], d:[0,1,1,1], e:[0,.5,0,1], f:[0,0,0,.5], g:[0,.5,1,.5] };
  function isMarker(item) { return item.kind === 'location' || item.kind === 'ground-scope'; }
  function isSelected(item, selection) {
    if (!selection) return false;
    if (typeof selection !== 'object') return Boolean(item.slotRef && item.slotRef.slotId === selection || item.partId === selection);
    const scope = item.slotRef;
    return item.kind !== 'location' && Boolean(scope && item.object.id === selection.objectId &&
      scope.bayIndex === selection.bayIndex && (selection.levelIndex === undefined || scope.levelIndex === selection.levelIndex));
  }

  function projectScene(boxes, camera, width, height, selectedId, selectedSlotId, collisionIds, wallMode) {
    const visible = boxes.filter(function (item) { return wallMode !== 'hidden' || item.object.type !== 'wall'; });
    const yaw = camera.yaw, pitch = camera.pitch;
    const yawCosine = Math.cos(yaw), yawSine = Math.sin(yaw);
    const pitchCosine = Math.cos(pitch), pitchSine = Math.sin(pitch);
    // Frame-local transforms/palette never survive a layout, camera or style change.
    const rotations = new Map(), palette = new Map();
    function frameColor(hex, factor, alpha) {
      const key = hex + ':' + factor + ':' + alpha;
      if (!palette.has(key)) palette.set(key, color(hex, factor, alpha));
      return palette.get(key);
    }
    function transform(object, x, y, z) {
      let rotation = rotations.get(object);
      if (!rotation) {
        const angle = object.rotation * Math.PI / 180;
        rotation = { cosine: Math.cos(angle), sine: Math.sin(angle) }; rotations.set(object, rotation);
      }
      const wx = object.x + rotation.cosine * x - rotation.sine * z;
      const wz = object.z + rotation.sine * x + rotation.cosine * z;
      const rx = yawCosine * wx - yawSine * wz;
      const rz = yawSine * wx + yawCosine * wz;
      return { x: rx, y: rz * pitchSine - y * pitchCosine, depth: rz * pitchCosine + y * pitchSine };
    }
    const projected = visible.map(function (item) {
      const corners = [
        [0, 0, 0], [item.width, 0, 0], [item.width, 0, item.depth], [0, 0, item.depth],
        [0, item.height, 0], [item.width, item.height, 0], [item.width, item.height, item.depth], [0, item.height, item.depth]
      ].map(function (p) { return transform(item.object, item.x + p[0], item.y + p[1], item.z + p[2]); });
      return { item: item, corners: corners };
    });
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let minDepth = Infinity, maxDepth = -Infinity;
    let minWorldY = Infinity, maxWorldY = -Infinity;
    projected.forEach(function (entry) {
      entry.corners.forEach(function (p) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        minDepth = Math.min(minDepth, p.depth); maxDepth = Math.max(maxDepth, p.depth);
      });
      minWorldY = Math.min(minWorldY, entry.item.y);
      maxWorldY = Math.max(maxWorldY, entry.item.y + entry.item.height);
    });
    if (!projected.length) {
      minX = -5000; maxX = 5000; minY = -3500; maxY = 3500;
      minDepth = -5000; maxDepth = 5000;
      minWorldY = 0; maxWorldY = 0;
    }
    const span = Math.max(1000, maxDepth - minDepth);
    const near = maxDepth + span * .1, far = minDepth - span * .1;
    const fitX = (minX + maxX) / 2, fitY = (minY + maxY) / 2;
    const targetY = (minWorldY + maxWorldY) / 2;
    const targetRotatedZ = (fitY + targetY * Math.cos(pitch)) / Math.sin(pitch);
    const fitTarget = {
      x: Math.cos(yaw) * fitX + Math.sin(yaw) * targetRotatedZ,
      y: targetY,
      z: -Math.sin(yaw) * fitX + Math.cos(yaw) * targetRotatedZ
    };
    const target = camera.target || fitTarget;
    const center = transform({ x: 0, z: 0, rotation: 0 }, target.x, target.y, target.z);
    const centerX = center.x, centerY = center.y;
    const fitScale = Math.min(Math.max(1, width - 90) / Math.max(3000, maxX - minX),
      Math.max(1, height - 100) / Math.max(3000, maxY - minY));
    const scale = (Number.isFinite(camera.baseScale) && camera.baseScale > 0 ? camera.baseScale : fitScale) * camera.zoom;
    function clip(p) {
      return { x: ((p.x - centerX) * scale + width / 2) / width * 2 - 1,
        y: 1 - ((p.y - centerY) * scale + height / 2) / height * 2,
        z: (near - p.depth) / (near - far) * 2 - 1 };
    }
    function transparentBox(item) { return FLOOR_TYPES.includes(item.object.type) || (wallMode === 'transparent' && item.object.type === 'wall'); }
    let opaqueCount = 0, edgeVertices = 0, markerCount = 0, selectedMarkers = 0;
    projected.forEach(function (entry) {
      const item = entry.item;
      entry.digits = isMarker(item) && item.number && item.width * scale >= 30 && item.depth * scale >= 20 ? String(item.number) : '';
      if (isMarker(item)) {
        markerCount += 1;
        if (isSelected(item,selectedSlotId)) selectedMarkers += 1;
        edgeVertices += 8 + Array.from(entry.digits).reduce(function (sum,digit) { return sum + DIGIT_SEGMENTS[Number(digit)].length * 2; },0);
      } else {
        const transparent = transparentBox(item);
        if (!transparent) opaqueCount += 1;
        if (!transparent || item.object.id === selectedId) edgeVertices += EDGES.length * 2;
      }
    });
    const opaque = vertexBuffer(opaqueCount * FACES.length * 6), edges = vertexBuffer(edgeVertices);
    const pickMarkers = vertexBuffer(markerCount * FACES.length * 6), markerSelection = vertexBuffer(selectedMarkers * 6);
    const transparent = [], pickMap = [null];
    projected.forEach(function (entry) {
      const item = entry.item, marker = isMarker(item), selected = isSelected(item,selectedSlotId);
      const isTransparent = transparentBox(item);
      const alpha = item.object.type === 'wall' ? .28 : .32;
      const isRoute = item.object.type === 'aisle';
      const vertices = marker ? pickMarkers : isTransparent ? vertexBuffer((isRoute ? 1 : FACES.length) * 6) : opaque;
      const pickingVertices = isRoute ? vertexBuffer(FACES.length * 6) : vertices;
      const corners = entry.corners.map(clip);
      const pickId = pickMap.length;
      pickMap.push(item.slotRef || { objectId: item.object.id });
      const pick = idColor(pickId);
      FACES.forEach(function (face, faceIndex) {
        const rgba = frameColor(item.color, SHADES[faceIndex], isTransparent ? alpha : 1);
        [face[0], face[1], face[2], face[0], face[2], face[3]].forEach(function (index) {
          if (!isRoute || faceIndex === 0) pushVertex(vertices, corners[index], rgba, pick);
          if (isRoute) pushVertex(pickingVertices, corners[index], rgba, pick);
        });
      });
      if (marker) {
        // Display a thin inset outline; the independent ID pass keeps the exact full footprint.
        const inset = item.markerInset === undefined ? Math.min(12,item.width/8,item.depth/8) : item.markerInset;
        const top = item.y + item.height;
        const point = function (x,z) { return clip(transform(item.object,x,top,z)); };
        const ring = [point(item.x+inset,item.z+inset), point(item.x+item.width-inset,item.z+inset),
          point(item.x+item.width-inset,item.z+item.depth-inset),point(item.x+inset,item.z+item.depth-inset)];
        const rgba = frameColor(selected ? '#fff2a3' : item.color,1,1);
        ring.forEach(function (p,index) { pushLine(edges,p,ring[(index+1)%4],rgba,-.0003); });
        if (selected) [0,1,2,0,2,3].forEach(function (index) {
          pushVertex(markerSelection,ring[index],frameColor('#fff2a3',1,.14),NO_PICK,-.00015);
        });
        if (entry.digits) {
          const glyphHeight = Math.min(item.depth*.18,item.width/(entry.digits.length*1.3),Math.max(60,10/scale));
          const glyphWidth = glyphHeight*.55, gap = glyphWidth*.3;
          const start = item.x + (item.width-entry.digits.length*glyphWidth-(entry.digits.length-1)*gap)/2;
          const z = item.z + item.depth-inset-glyphHeight-10;
          Array.from(entry.digits).forEach(function (digit,index) {
            const x = start + index*(glyphWidth+gap);
            Array.from(DIGIT_SEGMENTS[Number(digit)]).forEach(function (segment) {
              const p = SEGMENT_POINTS[segment];
              pushLine(edges,point(x+p[0]*glyphWidth,z+p[1]*glyphHeight),point(x+p[2]*glyphWidth,z+p[3]*glyphHeight),rgba,-.0003);
            });
          });
        }
        return;
      }
      if (isTransparent) {
        const averageDepth = entry.corners.reduce(function (sum, p) { return sum + p.depth; }, 0) / 8;
        transparent.push({ depth: averageDepth, vertices: vertices, pickingVertices: pickingVertices, route: isRoute });
      }
      if (!isTransparent || item.object.id === selectedId) {
        const conflict = collisionIds.has(item.object.id) || collisionIds.has(item.partId);
        const rack = item.object.type === 'pallet-rack' || item.object.type === 'shelf-rack';
        const edgeColor = frameColor(item.kind === 'orientation' ? item.color : selected ? '#fff2a3' : conflict ? '#ff9c72' :
          item.object.id === selectedId && !rack ? '#79f2de' : '#273844', 1, 1);
        EDGES.forEach(function (edge) { pushLine(edges, corners[edge[0]], corners[edge[1]], edgeColor, -.0003); });
      }
    });
    transparent.sort(function (a, b) { return a.depth - b.depth; });
    const floorSize = Math.max(10000, Math.ceil(Math.max(maxX - minX, maxY - minY) / 5000) * 5000);
    const gridStep = Math.max(1000, Math.ceil(floorSize / 60000) * 1000);
    const grid = vertexBuffer((Math.floor(floorSize * 2 / gridStep) + 1) * 4);
    const floor = { x: 0, z: 0, rotation: 0 };
    const gridColor = color('#23323d', 1, 1);
    function gridPoint(x, z) {
      const point = clip(transform(floor, x, 0, z));
      point.z = .999;
      return point;
    }
    for (let value = -floorSize; value <= floorSize; value += gridStep) {
      const a = gridPoint(value, -floorSize);
      const b = gridPoint(value, floorSize);
      const c = gridPoint(-floorSize, value);
      const d = gridPoint(floorSize, value);
      pushLine(grid, a, b, gridColor);
      pushLine(grid, c, d, gridColor);
    }
    return { opaque: opaque.values, pickMarkers: pickMarkers.values, markerSelection: markerSelection.values, transparent: transparent.map(function (item) { return item.vertices.values; }),
      pickTransparent: transparent.map(function (item) { return item.pickingVertices.values; }),
      routeCoverage: transparent.map(function (item) { return item.route; }),
      edges: edges.values, grid: grid.values, pickMap: pickMap,
      view: { fitTarget: fitTarget, fitScale: fitScale, scale: scale } };
  }

  function create(canvas, callbacks) {
    let gl;
    try { gl = canvas.getContext('webgl2', { depth: true, stencil: true, antialias: true, alpha: false }); }
    catch (error) { return null; }
    if (!gl || gl.getParameter(gl.STENCIL_BITS) < 1) return null;
    let program = null, buffer = null, framebuffer = null, pickTexture = null, depthBuffer = null;
    let pickWidth = 0, pickHeight = 0, lost = false, scene = null;
    let positionLocation, colorLocation, pickLocation, pickingLocation;
    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    function initialize() {
      const vertex = compile(gl.VERTEX_SHADER, VERTEX_SOURCE);
      const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
      program = gl.createProgram();
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      buffer = gl.createBuffer();
      positionLocation = gl.getAttribLocation(program, 'aPosition');
      colorLocation = gl.getAttribLocation(program, 'aColor');
      pickLocation = gl.getAttribLocation(program, 'aPick');
      pickingLocation = gl.getUniformLocation(program, 'uPicking');
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.DITHER);
      framebuffer = gl.createFramebuffer(); pickTexture = gl.createTexture(); depthBuffer = gl.createRenderbuffer();
      pickWidth = 0; pickHeight = 0;
    }
    try { initialize(); }
    catch (error) { return null; }
    function draw(vertices, mode, picking) {
      if (!vertices.length) return;
      gl.useProgram(program); gl.uniform1i(pickingLocation, picking ? 1 : 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(positionLocation); gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, STRIDE * 4, 0);
      gl.enableVertexAttribArray(colorLocation); gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, STRIDE * 4, 3 * 4);
      gl.enableVertexAttribArray(pickLocation); gl.vertexAttribPointer(pickLocation, 3, gl.FLOAT, false, STRIDE * 4, 7 * 4);
      gl.drawArrays(mode, 0, vertices.length / STRIDE);
    }
    function render(boxes, camera, selectedId, selectedSlotId, collisionIds, wallMode) {
      if (lost) return false;
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
      const dpr = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
      const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth; canvas.height = pixelHeight;
      }
      scene = projectScene(boxes, camera, width, height, selectedId, selectedSlotId, collisionIds, wallMode);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(.05, .08, .11, 1); gl.clearDepth(1);
      gl.clearStencil(0); gl.stencilMask(0xff); gl.disable(gl.STENCIL_TEST);
      gl.depthMask(true); gl.disable(gl.BLEND); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      gl.depthMask(false); draw(scene.grid, gl.LINES, false); gl.depthMask(true);
      draw(scene.opaque, gl.TRIANGLES, false);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      // Paint each visible route-covered sample once, including intersections
      // between separate objects and arms. Depth-failed samples stay unmarked,
      // so opaque rack parts still occlude routes. Other overlays and walls
      // retain their separate transparency and do not modify this coverage.
      gl.stencilFunc(gl.EQUAL, 0, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      scene.transparent.forEach(function (vertices, index) {
        if (scene.routeCoverage[index]) gl.enable(gl.STENCIL_TEST);
        else gl.disable(gl.STENCIL_TEST);
        draw(vertices, gl.TRIANGLES, false);
      });
      gl.disable(gl.STENCIL_TEST);
      draw(scene.markerSelection, gl.TRIANGLES, false);
      draw(scene.edges, gl.LINES, false);
      gl.depthMask(true); gl.disable(gl.BLEND);
      return true;
    }
    function ensurePickTarget() {
      if (pickWidth === canvas.width && pickHeight === canvas.height) return true;
      const width = canvas.width, height = canvas.height;
      gl.bindTexture(gl.TEXTURE_2D, pickTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickTexture, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return false;
      pickWidth = width; pickHeight = height;
      return true;
    }
    function pick(clientX, clientY) {
      if (lost || !scene || scene.pickMap.length === 1 || !ensurePickTarget()) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left) * canvas.width / rect.width);
      const y = canvas.height - 1 - Math.floor((clientY - rect.top) * canvas.height / rect.height);
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.STENCIL_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      draw(scene.opaque, gl.TRIANGLES, true);
      draw(scene.pickMarkers, gl.TRIANGLES, true);
      scene.pickTransparent.forEach(function (vertices) { draw(vertices, gl.TRIANGLES, true); });
      const pixel = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return scene.pickMap[pixel[0] + (pixel[1] << 8) + (pixel[2] << 16)] || null;
    }
    canvas.addEventListener('webglcontextlost', function (event) {
      event.preventDefault(); lost = true; scene = null;
      if (callbacks && callbacks.onLost) callbacks.onLost();
    });
    canvas.addEventListener('webglcontextrestored', function () {
      try { initialize(); lost = false; if (callbacks && callbacks.onRestored) callbacks.onRestored(); }
      catch (error) { lost = true; if (callbacks && callbacks.onLost) callbacks.onLost(); }
    });
    return { render: render, pick: pick, view: function () { return scene && scene.view; },
      available: function () { return !lost; } };
  }
  return { create: create, projectScene: projectScene, panTarget: panTarget, idColor: idColor };
}));
