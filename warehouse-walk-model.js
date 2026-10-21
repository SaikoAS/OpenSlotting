(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OpenSlottingWarehouseWalkModel = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CELL = 2, RADIUS = .28, FAR = 80;
  const MIN_FOV = 45, MAX_FOV = 100, DEFAULT_FOV = 60;
  function fieldOfView(camera) {
    const value = camera && camera.fov;
    return Number.isFinite(value) ? Math.min(MAX_FOV, Math.max(MIN_FOV, value)) : DEFAULT_FOV;
  }
  const floorTypes = new Set(['aisle', 'goods-in', 'goods-out']);
  function local(item, point) {
    const x = point.x - item.originX, z = point.z - item.originZ;
    return { x:x * item.cos + z * item.sin, y:point.y || 0, z:-x * item.sin + z * item.cos };
  }
  function world(item, x, y, z) {
    return { x:item.originX + x * item.cos - z * item.sin, y:y, z:item.originZ + x * item.sin + z * item.cos };
  }
  function entry(box) {
    const angle = box.object.rotation * Math.PI / 180;
    return { box:box, originX:box.object.x / 1000, originZ:box.object.z / 1000, cos:Math.cos(angle), sin:Math.sin(angle),
      x:box.x / 1000, y:box.y / 1000, z:box.z / 1000, width:box.width / 1000, height:box.height / 1000, depth:box.depth / 1000,
      slotId:box.kind === 'location' && box.slotRef.slotId,
      obstacle:!floorTypes.has(box.object.type) && !['location','ground-scope','orientation'].includes(box.kind) };
  }
  function createWorld(boxes) {
    const entries = boxes.map(entry), grid = new Map(), large = [], positions = new Map();
    const bounds = { minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity };
    entries.forEach(function (item) {
      const points = [[0,0],[item.width,0],[item.width,item.depth],[0,item.depth]].map(function (p) { return world(item,item.x+p[0],0,item.z+p[1]); });
      item.bounds = { minX:Math.min.apply(null,points.map(p=>p.x)),maxX:Math.max.apply(null,points.map(p=>p.x)),
        minZ:Math.min.apply(null,points.map(p=>p.z)),maxZ:Math.max.apply(null,points.map(p=>p.z)) };
      bounds.minX=Math.min(bounds.minX,item.bounds.minX); bounds.maxX=Math.max(bounds.maxX,item.bounds.maxX);
      bounds.minZ=Math.min(bounds.minZ,item.bounds.minZ); bounds.maxZ=Math.max(bounds.maxZ,item.bounds.maxZ);
      if (item.slotId) positions.set(item.slotId,item);
      if (!item.obstacle && !item.slotId) return;
      const x0=Math.floor(item.bounds.minX/CELL), x1=Math.floor(item.bounds.maxX/CELL), z0=Math.floor(item.bounds.minZ/CELL), z1=Math.floor(item.bounds.maxZ/CELL);
      if ((x1-x0+1)*(z1-z0+1)>256) { large.push(item); return; }
      for(let x=x0;x<=x1;x++) for(let z=z0;z<=z1;z++) {
        const key=x+':'+z; if(!grid.has(key)) grid.set(key,[]); grid.get(key).push(item);
      }
    });
    if (!entries.length) Object.assign(bounds,{minX:-5,maxX:5,minZ:-5,maxZ:5});
    bounds.minX-=4; bounds.maxX+=4; bounds.minZ-=4; bounds.maxZ+=4;
    return { entries:entries, grid:grid, large:large, positions:positions, bounds:bounds };
  }
  function nearby(scene, x, z, radius) {
    const found=new Set(scene.large);
    for(let a=Math.floor((x-radius)/CELL);a<=Math.floor((x+radius)/CELL);a++)
      for(let b=Math.floor((z-radius)/CELL);b<=Math.floor((z+radius)/CELL);b++)
        (scene.grid.get(a+':'+b)||[]).forEach(item=>found.add(item));
    return found;
  }
  function canOccupy(scene, position, feet, eyeHeight) {
    if (![position.x,position.z,feet,eyeHeight].every(Number.isFinite) || feet<0 || eyeHeight<.6 || eyeHeight>2.4) return false;
    const b=scene.bounds;
    if(position.x<b.minX+RADIUS || position.x>b.maxX-RADIUS || position.z<b.minZ+RADIUS || position.z>b.maxZ-RADIUS) return false;
    for(const item of nearby(scene,position.x,position.z,RADIUS)) {
      if(!item.obstacle || item.y>=feet+eyeHeight+.15-.0001 || item.y+item.height<=feet+.0001) continue;
      const p=local(item,position), dx=p.x-Math.max(item.x,Math.min(item.x+item.width,p.x)), dz=p.z-Math.max(item.z,Math.min(item.z+item.depth,p.z));
      if(dx*dx+dz*dz<RADIUS*RADIUS) return false;
    }
    return true;
  }
  function canStand(scene, position, eyeHeight) {return canOccupy(scene,position,0,eyeHeight);}
  function freePosition(scene, desired, eyeHeight) {
    if(canStand(scene,desired,eyeHeight)) return {x:desired.x,z:desired.z};
    // Bounded radial search; never silently put the observer inside geometry.
    for(let ring=1;ring<=24;ring++) for(let step=0;step<24;step++) {
      const angle=step*Math.PI/12, p={x:desired.x+Math.cos(angle)*ring*.3,z:desired.z+Math.sin(angle)*ring*.3};
      if(canStand(scene,p,eyeHeight)) return p;
    }
    return null;
  }
  function move(scene, camera, dx, dz, feet, eyeHeight) {
    if(!Number.isFinite(dx)||!Number.isFinite(dz)) return false;
    feet=feet===undefined?0:feet;eyeHeight=eyeHeight===undefined?camera.eye:eyeHeight;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/(RADIUS/2)));
    // Input is a frame displacement, capped to prevent stalls and tunnelling.
    if(steps>100) return false;
    const beforeX=camera.x,beforeZ=camera.z;
    for(let i=0;i<steps;i++) {
      const x=camera.x+dx/steps, z=camera.z+dz/steps;
      if(canOccupy(scene,{x:x,z:z},feet,eyeHeight)) {camera.x=x;camera.z=z;}
      else {
        if(canOccupy(scene,{x:x,z:camera.z},feet,eyeHeight)) camera.x=x;
        if(canOccupy(scene,{x:camera.x,z:z},feet,eyeHeight)) camera.z=z;
      }
    }
    return camera.x!==beforeX || camera.z!==beforeZ;
  }
  function createMotion(mode) {return {mode:mode==='fly'?'fly':'walk',feet:0,velocity:0,grounded:true,crouched:false,standBlocked:false};}
  function movementSpeed(value) {return Number.isFinite(value)?Math.round(Math.max(.1,Math.min(20,value))*10)/10:1.4;}
  function stepMotion(scene,camera,motion,input,delta,speed,standingEye) {
    if(!Number.isFinite(delta)||delta<=0||!Number.isFinite(standingEye)||standingEye<1||standingEye>2.2)return;
    delta=Math.min(.05,delta);speed=movementSpeed(speed);
    const forward=Math.max(-1,Math.min(1,Number(input.forward)||0)),side=Math.max(-1,Math.min(1,Number(input.side)||0));
    if(motion.mode==='fly'){
      const vertical=Math.max(-1,Math.min(1,Number(input.vertical)||0)),b=basis(camera);
      const dx=b.forward.x*forward+b.right.x*side,dy=b.forward.y*forward+vertical,dz=b.forward.z*forward+b.right.z*side;
      const size=Math.max(1,Math.hypot(dx,dy,dz)),distance=speed*delta/size,bounds=scene.bounds;
      camera.x=Math.max(bounds.minX+RADIUS,Math.min(bounds.maxX-RADIUS,camera.x+dx*distance));
      camera.z=Math.max(bounds.minZ+RADIUS,Math.min(bounds.maxZ-RADIUS,camera.z+dz*distance));
      camera.eye=Math.max(.3,Math.min(FAR,camera.eye+dy*distance));return;
    }
    const duckEye=Math.max(.65,standingEye*.6);
    motion.standBlocked=Boolean(!input.crouch&&motion.crouched&&!canOccupy(scene,camera,motion.feet,standingEye));
    motion.crouched=Boolean(input.crouch)||motion.standBlocked;
    const eyeHeight=motion.crouched?duckEye:standingEye;
    if(input.jump&&motion.grounded&&!motion.crouched){motion.velocity=3.8;motion.grounded=false;}
    // Small fixed substeps sweep both the body and its vertical extent, including thin decks.
    const steps=Math.max(1,Math.ceil(delta/.008)),dt=delta/steps,size=Math.max(1,Math.hypot(forward,side));
    for(let step=0;step<steps;step++){
      const distance=speed*(motion.crouched?.5:1)*dt/size;
      move(scene,camera,(Math.sin(camera.yaw)*forward-Math.cos(camera.yaw)*side)*distance,
        (Math.cos(camera.yaw)*forward+Math.sin(camera.yaw)*side)*distance,motion.feet,eyeHeight);
      motion.velocity-=9.81*dt;const desired=Math.max(0,motion.feet+motion.velocity*dt);
      if(canOccupy(scene,camera,desired,eyeHeight)){
        motion.feet=desired;motion.grounded=desired===0;if(motion.grounded)motion.velocity=0;
      }else{
        if(motion.grounded&&motion.velocity<0){motion.velocity=0;continue;}
        let near=motion.feet,far=desired;
        for(let i=0;i<12;i++){const middle=(near+far)/2;if(canOccupy(scene,camera,middle,eyeHeight))near=middle;else far=middle;}
        motion.feet=near;motion.grounded=motion.velocity<0;motion.velocity=0;
      }
    }
    camera.eye=motion.feet+eyeHeight;
  }
  function basis(camera) {
    const sy=Math.sin(camera.yaw),cy=Math.cos(camera.yaw),sp=Math.sin(camera.pitch),cp=Math.cos(camera.pitch);
    return { right:{x:-cy,y:0,z:sy},up:{x:sy*sp,y:cp,z:cy*sp},forward:{x:sy*cp,y:-sp,z:cy*cp} };
  }
  function ray(camera, nx, ny, aspect) {
    const b=basis(camera), t=Math.tan(fieldOfView(camera)*Math.PI/360);
    const d={x:b.forward.x+b.right.x*nx*t*aspect+b.up.x*ny*t,y:b.forward.y+b.up.y*ny*t,z:b.forward.z+b.right.z*nx*t*aspect+b.up.z*ny*t};
    const size=Math.hypot(d.x,d.y,d.z); return {x:d.x/size,y:d.y/size,z:d.z/size};
  }
  function intersect(item, origin, direction) {
    const p=local(item,origin), d={x:direction.x*item.cos+direction.z*item.sin,y:direction.y,z:-direction.x*item.sin+direction.z*item.cos};
    let near=0,far=FAR;
    for(const key of ['x','y','z']) {
      const min=item[key], max=min+item[{x:'width',y:'height',z:'depth'}[key]];
      if(Math.abs(d[key])<1e-10) {if(p[key]<min||p[key]>max) return null;continue;}
      const a=(min-p[key])/d[key],b=(max-p[key])/d[key];
      near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far) return null;
    }
    return near;
  }
  function raycast(scene, origin, direction, physicalOnly, maxDistance) {
    const limit=Number.isFinite(maxDistance)?Math.max(0,Math.min(FAR,maxDistance)):FAR;
    const candidates=new Set(scene.large);
    let x=Math.floor(origin.x/CELL),z=Math.floor(origin.z/CELL),time=0;
    const sx=direction.x>=0?1:-1,sz=direction.z>=0?1:-1;
    const dx=Math.abs(direction.x)<1e-10?Infinity:CELL/Math.abs(direction.x), dz=Math.abs(direction.z)<1e-10?Infinity:CELL/Math.abs(direction.z);
    let tx=dx===Infinity?Infinity:((x+(sx>0?1:0))*CELL-origin.x)/direction.x;
    let tz=dz===Infinity?Infinity:((z+(sz>0?1:0))*CELL-origin.z)/direction.z;
    for(let i=0;i<200&&time<=limit;i++) {
      (scene.grid.get(x+':'+z)||[]).forEach(item=>candidates.add(item));
      if(tx===Infinity&&tz===Infinity) break;
      if(tx<tz) {time=tx;tx+=dx;x+=sx;} else {time=tz;tz+=dz;z+=sz;}
    }
    let result=null;
    for(const item of candidates) {
      if(!item.obstacle && (physicalOnly||!item.slotId)) continue;
      const distance=intersect(item,origin,direction);
      if(distance!==null&&distance<=limit&&(!result||distance<result.distance)) result={item:item,distance:distance};
    }
    return result;
  }
  function project(camera, point, width, height) {
    const b=basis(camera), p={x:point.x-camera.x,y:point.y-camera.eye,z:point.z-camera.z};
    const dot=v=>p.x*v.x+p.y*v.y+p.z*v.z, depth=dot(b.forward), scale=height/(2*Math.tan(fieldOfView(camera)*Math.PI/360));
    if(depth<.06||depth>FAR) return null;
    return {x:width/2+dot(b.right)*scale/depth,y:height/2-dot(b.up)*scale/depth,depth:depth};
  }
  function matrix(camera, aspect) {
    const b=basis(camera),f=1/Math.tan(fieldOfView(camera)*Math.PI/360),near=.05,far=FAR,A=(far+near)/(far-near),B=-2*far*near/(far-near);
    const dot=v=>camera.x*v.x+camera.eye*v.y+camera.z*v.z;
    return new Float32Array([f/aspect*b.right.x,f*b.up.x,A*b.forward.x,b.forward.x,
      f/aspect*b.right.y,f*b.up.y,A*b.forward.y,b.forward.y,
      f/aspect*b.right.z,f*b.up.z,A*b.forward.z,b.forward.z,
      -f/aspect*dot(b.right),-f*dot(b.up),B-A*dot(b.forward),-dot(b.forward)]);
  }
  function approach(scene, item, eyeHeight) {
    const target=world(item,item.x+item.width/2,item.y+item.height,item.z+item.depth/2);
    const front=item.box.object.bays ? item.box.object.bays[item.box.slotRef.bayIndex].depth/1000 : item.z+item.depth;
    let position=null;
    // Search only the access side. A free point behind the rack is not a front approach.
    for(const distance of [1.8,1.2,.6,2.4,3,3.6]) {
      for(const offset of [0,-.4,.4,-.8,.8,-1.2,1.2]) {
        const candidate=world(item,item.x+item.width/2+offset,0,front+distance);
        if(canStand(scene,candidate,eyeHeight)){position=candidate;break;}
      }
      if(position)break;
    }
    if(!position) return null;
    return {x:position.x,z:position.z,eye:eyeHeight,yaw:Math.atan2(target.x-position.x,target.z-position.z),
      pitch:Math.max(-1.3,Math.min(1.3,Math.atan2(eyeHeight-target.y,Math.hypot(target.x-position.x,target.z-position.z))))};
  }
  return {MIN_FOV:MIN_FOV,MAX_FOV:MAX_FOV,DEFAULT_FOV:DEFAULT_FOV,fieldOfView:fieldOfView,
    createWorld:createWorld,world:world,canStand:canStand,canOccupy:canOccupy,freePosition:freePosition,move:move,
    createMotion:createMotion,movementSpeed:movementSpeed,stepMotion:stepMotion,basis:basis,ray:ray,
    raycast:raycast,project:project,matrix:matrix,approach:approach,RADIUS:RADIUS,FAR:FAR};
}));
