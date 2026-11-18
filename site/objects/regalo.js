/* Lightweight renderer for the two photographic gift models. The poster doubles as the front texture. */
(() => {
  "use strict";
  const vertex = [
    "attribute vec3 position, normal;",
    "attribute vec2 uv;",
    "attribute vec4 color;",
    "uniform vec4 rotation;",
    "uniform vec2 fit;",
    "varying vec2 texcoord; varying vec3 tint; varying float light;",
    "vec3 turn(vec3 p) {",
    "  vec3 q = vec3(rotation.y*p.x + rotation.x*p.z, p.y, -rotation.x*p.x + rotation.y*p.z);",
    "  return vec3(q.x, rotation.w*q.y - rotation.z*q.z, rotation.z*q.y + rotation.w*q.z);",
    "}",
    "void main() {",
    "  vec3 p = turn(position); gl_Position = vec4(p.xy * fit, -p.z * .65, 1.0);",
    "  texcoord = uv; tint = color.rgb;",
    "  light = max(dot(normalize(turn(normal)), vec3(-.36,.49,.79)), 0.0);",
    "}"
  ].join("\n");
  const fragment = [
    "precision mediump float;",
    "uniform sampler2D photograph; uniform bool front;",
    "varying vec2 texcoord; varying vec3 tint; varying float light;",
    "void main() {",
    "  if (front) {",
    "    vec4 c = texture2D(photograph, texcoord); if (c.a < .28) discard;",
    "    gl_FragColor = vec4(c.rgb * (.977 + .023 * light), 1.0);",
    "  } else { gl_FragColor = vec4(pow(tint, vec3(.45455)) * (.77 + .23 * light), 1.0); }",
    "}"
  ].join("\n");

  async function mount(canvas, poster) {
    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, powerPreference: "low-power" });
    if (!gl) return null;
    // All mesh accessors precede the embedded JPEG. Reuse the already decoded responsive poster.
    const reply = await fetch(canvas.dataset.model, { headers: { Range: "bytes=0-" + canvas.dataset.geometryEnd } });
    if (!reply.ok) throw new Error("No se pudo leer el modelo");
    const bytes = await reply.arrayBuffer();
    const header = new DataView(bytes);
    if (header.getUint32(0,true) !== 0x46546c67) throw new Error("Modelo GLB inválido");
    const length = header.getUint32(12,true);
    const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
    const binary = 28 + length;
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      gl.attachShader(program,shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error("El visor 3D no está disponible");
    gl.useProgram(program);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    for (const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
    for (const param of [gl.TEXTURE_MAG_FILTER,gl.TEXTURE_MIN_FILTER]) gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,poster);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    const slots = Object.fromEntries(["position","normal","uv","color"].map(key => [key, gl.getAttribLocation(program,key)]));
    const uniforms = Object.fromEntries(["rotation","fit","front"].map(key => [key, gl.getUniformLocation(program,key)]));
    const buffers = new Map();
    function accessor(index) {
      if (buffers.has(index)) return buffers.get(index);
      const a = doc.accessors[index], v = doc.bufferViews[a.bufferView];
      const buffer = gl.createBuffer();
      gl.bindBuffer(v.target,buffer);
      gl.bufferData(v.target,new Uint8Array(bytes,binary+(v.byteOffset || 0),v.byteLength),gl.STATIC_DRAW);
      const field = { buffer, count: a.count, type: a.componentType, normalized: !!a.normalized, offset: a.byteOffset || 0 };
      buffers.set(index,field);
      return field;
    }
    const draws = doc.meshes.flatMap(mesh => mesh.primitives.map(p => {
      const a = p.attributes;
      return { pos: accessor(a.POSITION), normal: accessor(a.NORMAL), uv: a.TEXCOORD_0 === undefined ? null : accessor(a.TEXCOORD_0),
        color: a.COLOR_0 === undefined ? null : accessor(a.COLOR_0), indices: accessor(p.indices) };
    }));
    function attribute(slot,field,size) {
      if (!field) { gl.disableVertexAttribArray(slot); return; }
      gl.bindBuffer(gl.ARRAY_BUFFER,field.buffer);
      gl.enableVertexAttribArray(slot);
      gl.vertexAttribPointer(slot,size,field.type,field.normalized,0,field.offset);
    }
    const aspect = poster.naturalWidth / poster.naturalHeight;
    let oldYaw, oldPitch;
    function resize(w,h) {
      if (!w || !h) return;
      const density = Math.min(devicePixelRatio || 1, 2, 1550 / Math.max(w,h));
      canvas.width = Math.max(1, Math.round(w*density));
      canvas.height = Math.max(1, Math.round(h*density));
      gl.viewport(0,0,canvas.width,canvas.height);
      const ratio = w / h, scale = Math.min(1,ratio/aspect);
      gl.uniform2f(uniforms.fit,scale/ratio,scale);
      oldYaw = undefined;
    }
    function paint(yaw,pitch) {
      if (yaw === oldYaw && pitch === oldPitch) return;
      oldYaw=yaw; oldPitch=pitch;
      gl.uniform4f(uniforms.rotation,Math.sin(yaw),Math.cos(yaw),Math.sin(pitch),Math.cos(pitch));
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      for (const d of draws) {
        attribute(slots.position,d.pos,3); attribute(slots.normal,d.normal,3);
        attribute(slots.uv,d.uv,2); attribute(slots.color,d.color,4);
        gl.uniform1i(uniforms.front, d.uv !== null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,d.indices.buffer);
        gl.drawElements(gl.TRIANGLES,d.indices.count,d.indices.type,d.indices.offset);
      }
    }
    resize(canvas.clientWidth,canvas.clientHeight);
    paint(0,0);
    return { paint, resize };
  }
  window.LovelyGiftModel = { mount };
})();
