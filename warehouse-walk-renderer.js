(function (root,factory) {
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.OpenSlottingWarehouseWalkRenderer=factory();
}(typeof globalThis!=='undefined'?globalThis:this,function () {
  'use strict';
  const FACES=[[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[0,3,2,1]];
  const EDGES=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  function rgb(hex,factor) {return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255*factor);}
  function buildMeshes(scene,walk) {
    const b=scene.bounds,step=Math.max(1,Math.ceil(Math.max(b.maxX-b.minX,b.maxZ-b.minZ)/80));
    const gridCount=Math.max(0,Math.floor((b.maxX-Math.ceil(b.minX/step)*step)/step)+1)+
      Math.max(0,Math.floor((b.maxZ-Math.ceil(b.minZ/step)*step)/step)+1);
    let physical=0,markers=0,areas=0;
    scene.entries.forEach(function(item){if(['location','ground-scope'].includes(item.box.kind))markers++;else if(item.obstacle)physical++;else areas++;});
    function buffer(count){return {data:new Float32Array(count*6),offset:0};}
    const opaque=buffer(physical*36+6),lines=buffer(physical*24+markers*8+gridCount*2),routes=buffer(areas*6);
    function vertex(target,p,color) {const a=target.data,i=target.offset;a[i]=p.x;a[i+1]=p.y;a[i+2]=p.z;a[i+3]=color[0];a[i+4]=color[1];a[i+5]=color[2];target.offset+=6;}
    function triangle(buffer,points,color) {[0,1,2,0,2,3].forEach(i=>vertex(buffer,points[i],color));}
    scene.entries.forEach(function (item) {
      const corners=[[0,0,0],[item.width,0,0],[item.width,0,item.depth],[0,0,item.depth],
        [0,item.height,0],[item.width,item.height,0],[item.width,item.height,item.depth],[0,item.height,item.depth]]
        .map(p=>walk.world(item,item.x+p[0],item.y+p[1],item.z+p[2]));
      if(['location','ground-scope'].includes(item.box.kind)) {
        const inset=Math.min(.012,item.width/8,item.depth/8),y=item.y+item.height+.003;
        const ring=[[inset,inset],[item.width-inset,inset],[item.width-inset,item.depth-inset],[inset,item.depth-inset]]
          .map(p=>walk.world(item,item.x+p[0],y,item.z+p[1]));
        ring.forEach((p,i)=>{vertex(lines,p,rgb(item.box.color,1));vertex(lines,ring[(i+1)%4],rgb(item.box.color,1));});
        return;
      }
      if(!item.obstacle) {triangle(routes,FACES[0].map(i=>corners[i]),rgb(item.box.color,.85));return;}
      FACES.forEach((face,index)=>triangle(opaque,face.map(i=>corners[i]),rgb(item.box.color,[1,.8,.68,.87,.74,.6][index])));
      EDGES.forEach(edge=>edge.forEach(i=>vertex(lines,corners[i],rgb('#263b49',1))));
    });
    triangle(opaque,[{x:b.minX,y:-.03,z:b.minZ},{x:b.maxX,y:-.03,z:b.minZ},
      {x:b.maxX,y:-.03,z:b.maxZ},{x:b.minX,y:-.03,z:b.maxZ}],rgb('#1a2932',1));
    for(let x=Math.ceil(b.minX/step)*step;x<=b.maxX;x+=step) {
      vertex(lines,{x:x,y:-.025,z:b.minZ},rgb('#2c414d',1));vertex(lines,{x:x,y:-.025,z:b.maxZ},rgb('#2c414d',1));
    }
    for(let z=Math.ceil(b.minZ/step)*step;z<=b.maxZ;z+=step) {
      vertex(lines,{x:b.minX,y:-.025,z:z},rgb('#2c414d',1));vertex(lines,{x:b.maxX,y:-.025,z:z},rgb('#2c414d',1));
    }
    return {opaque:opaque.data,lines:lines.data,routes:routes.data};
  }
  function create(canvas,walk,callbacks) {
    let gl;try {gl=canvas.getContext('webgl2',{depth:true,antialias:true,alpha:false});} catch(_){return null;}
    if(!gl) return null;
    let program,position,color,matrix,eye,buffers={},lost=false,scene=null,selectedId=null;
    function shader(type,source) {
      const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) {const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(error);} return s;
    }
    function initialize() {
      const vertex=shader(gl.VERTEX_SHADER,'#version 300 es\nin vec3 aPosition;in vec3 aColor;uniform mat4 uMatrix;uniform vec3 uEye;out vec3 vColor;out float vDistance;void main(){gl_Position=uMatrix*vec4(aPosition,1.0);vColor=aColor;vDistance=distance(aPosition,uEye);}');
      const fragment=shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;in vec3 vColor;in float vDistance;out vec4 outColor;void main(){outColor=vec4(mix(vColor,vec3(.05,.08,.11),smoothstep(18.0,80.0,vDistance)),1.0);}');
      program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      position=gl.getAttribLocation(program,'aPosition');color=gl.getAttribLocation(program,'aColor');matrix=gl.getUniformLocation(program,'uMatrix');eye=gl.getUniformLocation(program,'uEye');
      buffers={};gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    }
    function upload(key,vertices) {
      if(!buffers[key]) buffers[key]={buffer:gl.createBuffer(),count:0};
      gl.bindBuffer(gl.ARRAY_BUFFER,buffers[key].buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);buffers[key].count=vertices.length/6;
    }
    function selection(id) {
      selectedId=id;if(lost||!scene) return;
      const item=scene.positions.get(id),vertices=[],color=[1,.95,.64];
      if(item) {
        const y=item.y+item.height+.005;
        const p=[[0,0],[item.width,0],[item.width,item.depth],[0,item.depth]].map(a=>walk.world(item,item.x+a[0],y,item.z+a[1]));
        p.forEach((point,i)=>[point,p[(i+1)%4]].forEach(v=>vertices.push(v.x,v.y,v.z,...color)));
      }
      upload('selection',new Float32Array(vertices));
    }
    function setWorld(value) {
      scene=value;if(lost) return;
      const mesh=buildMeshes(scene,walk);Object.keys(mesh).forEach(key=>upload(key,mesh[key]));selection(selectedId);
    }
    function draw(key,mode) {
      const b=buffers[key];if(!b||!b.count) return;
      gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(color);gl.vertexAttribPointer(color,3,gl.FLOAT,false,24,12);gl.drawArrays(mode,0,b.count);
    }
    function render(camera) {
      if(lost||!scene||!canvas.isConnected) return false;
      const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight),dpr=Math.min(2,window.devicePixelRatio||1);
      const w=Math.round(width*dpr),h=Math.round(height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      gl.viewport(0,0,w,h);gl.clearColor(.05,.08,.11,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
      gl.uniformMatrix4fv(matrix,false,walk.matrix(camera,width/height));gl.uniform3f(eye,camera.x,camera.eye,camera.z);
      draw('opaque',gl.TRIANGLES);draw('routes',gl.TRIANGLES);draw('lines',gl.LINES);draw('selection',gl.LINES);return true;
    }
    try {initialize();} catch(_){return null;}
    canvas.addEventListener('webglcontextlost',function(event){event.preventDefault();lost=true;if(callbacks&&callbacks.lost)callbacks.lost();});
    canvas.addEventListener('webglcontextrestored',function(){try {initialize();lost=false;if(scene)setWorld(scene);if(callbacks&&callbacks.restored)callbacks.restored();}catch(_){lost=true;}});
    return {setWorld:setWorld,selection:selection,render:render,available:()=>!lost};
  }
  return {create:create,buildMeshes:buildMeshes};
}));
