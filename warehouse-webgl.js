(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OpenSlottingWarehouseWebGL = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STRIDE = 10;
  const FACES = [[4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const FLOOR_TYPES = ['aisle', 'goods-in', 'goods-out'];
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
  function pushVertex(target, point, rgba, pick, bias) {
    target.push(point.x, point.y, point.z + (bias || 0), rgba[0], rgba[1], rgba[2], rgba[3], pick[0], pick[1], pick[2]);
  }
  function pushLine(target, first, second, rgba, bias) {
    const none = [0, 0, 0];
    pushVertex(target, first, rgba, none, bias);
    pushVertex(target, second, rgba, none, bias);
  }
  function projectScene(boxes, camera, width, height, selectedId, selectedSlotId, collisionIds, wallMode) {
    const visible = boxes.filter(function (item) { return wallMode !== 'hidden' || item.object.type !== 'wall'; });
    const yaw = camera.yaw, pitch = camera.pitch;
    function transform(object, x, y, z) {
      const angle = object.rotation * Math.PI / 180;
      const wx = object.x + Math.cos(angle) * x - Math.sin(angle) * z;
      const wz = object.z + Math.sin(angle) * x + Math.cos(angle) * z;
      const rx = Math.cos(yaw) * wx - Math.sin(yaw) * wz;
      const rz = Math.sin(yaw) * wx + Math.cos(yaw) * wz;
      return { x: rx, y: rz * Math.sin(pitch) - y * Math.cos(pitch), depth: rz * Math.cos(pitch) + y * Math.sin(pitch) };
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
    projected.forEach(function (entry) {
      entry.corners.forEach(function (p) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        minDepth = Math.min(minDepth, p.depth); maxDepth = Math.max(maxDepth, p.depth);
      });
    });
    if (!projected.length) {
      minX = -5000; maxX = 5000; minY = -3500; maxY = 3500;
      minDepth = -5000; maxDepth = 5000;
    }
    const span = Math.max(1000, maxDepth - minDepth);
    const near = maxDepth + span * .1, far = minDepth - span * .1;
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
    const scale = Math.min((width - 90) / Math.max(3000, maxX - minX),
      (height - 100) / Math.max(3000, maxY - minY)) * camera.zoom;
    function clip(p) {
      return { x: ((p.x - centerX) * scale + width / 2) / width * 2 - 1,
        y: 1 - ((p.y - centerY) * scale + height / 2) / height * 2,
        z: (near - p.depth) / (near - far) * 2 - 1 };
    }
    const opaque = [], transparent = [], edges = [], grid = [], pickMap = [null];
    projected.forEach(function (entry) {
      const item = entry.item;
      const isTransparent = FLOOR_TYPES.includes(item.object.type) || (wallMode === 'transparent' && item.object.type === 'wall');
      const alpha = item.object.type === 'wall' ? .28 : .32;
      const vertices = [];
      const corners = entry.corners.map(clip);
      const pickId = pickMap.length;
      pickMap.push(item.slotRef || { objectId: item.object.id });
      const pick = idColor(pickId);
      FACES.forEach(function (face, faceIndex) {
        const shade = [1, .78, .66, .86, .72][faceIndex];
        const rgba = color(item.color, shade, isTransparent ? alpha : 1);
        [face[0], face[1], face[2], face[0], face[2], face[3]].forEach(function (index) {
          pushVertex(vertices, corners[index], rgba, pick);
        });
      });
      if (isTransparent) {
        const averageDepth = entry.corners.reduce(function (sum, p) { return sum + p.depth; }, 0) / 8;
        transparent.push({ depth: averageDepth, vertices: vertices });
      } else opaque.push.apply(opaque, vertices);
      if (!isTransparent || item.object.id === selectedId) {
        const selected = item.slotRef && item.slotRef.slotId === selectedSlotId;
        const conflict = collisionIds.has(item.object.id);
        const edgeColor = color(selected ? '#fff2a3' : conflict ? '#ff9c72' :
          item.object.id === selectedId ? '#79f2de' : '#273844', 1, 1);
        EDGES.forEach(function (edge) { pushLine(edges, corners[edge[0]], corners[edge[1]], edgeColor, -.0003); });
      }
    });
    transparent.sort(function (a, b) { return a.depth - b.depth; });
    const floorSize = Math.max(10000, Math.ceil(Math.max(maxX - minX, maxY - minY) / 5000) * 5000);
    const gridStep = Math.max(1000, Math.ceil(floorSize / 60000) * 1000);
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
    return { opaque: new Float32Array(opaque), transparent: transparent.map(function (item) { return new Float32Array(item.vertices); }),
      edges: new Float32Array(edges), grid: new Float32Array(grid), pickMap: pickMap };
  }

  function create(canvas, callbacks) {
    let gl;
    try { gl = canvas.getContext('webgl2', { depth: true, antialias: true, alpha: false }); }
    catch (error) { return null; }
    if (!gl) return null;
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
      const width = Math.max(280, canvas.clientWidth), height = Math.max(320, canvas.clientHeight);
      const dpr = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
      const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth; canvas.height = pixelHeight;
      }
      scene = projectScene(boxes, camera, width, height, selectedId, selectedSlotId, collisionIds, wallMode);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(.05, .08, .11, 1); gl.clearDepth(1);
      gl.depthMask(true); gl.disable(gl.BLEND); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.depthMask(false); draw(scene.grid, gl.LINES, false); gl.depthMask(true);
      draw(scene.opaque, gl.TRIANGLES, false);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      scene.transparent.forEach(function (vertices) { draw(vertices, gl.TRIANGLES, false); });
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
      gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.depthMask(true); gl.disable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      draw(scene.opaque, gl.TRIANGLES, true);
      scene.transparent.forEach(function (vertices) { draw(vertices, gl.TRIANGLES, true); });
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
    return { render: render, pick: pick, available: function () { return !lost; } };
  }
  return { create: create, projectScene: projectScene, idColor: idColor };
}));
