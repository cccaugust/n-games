/**
 * AABB とボクセルの当たり判定（プレイヤー・モブ共通）
 */
import { getDef, B } from './blocks.js';

const EPS = 1e-4;

/**
 * @param {import('./world.js').World} world
 * @param {{x:number,y:number,z:number}} pos  足元中心
 * @param {{x:number,y:number,z:number}} vel  ブロック/秒
 * @param {number} w  幅
 * @param {number} h  高さ
 * @param {number} dt
 * @returns {{onGround:boolean, hitX:boolean, hitZ:boolean, hitHead:boolean}}
 */
export function moveWithCollision(world, pos, vel, w, h, dt) {
  const half = w / 2;
  const res = { onGround: false, hitX: false, hitZ: false, hitHead: false };

  // Y
  let dy = vel.y * dt;
  if (dy !== 0) {
    const ny = pos.y + dy;
    const minX = Math.floor(pos.x - half + EPS), maxX = Math.floor(pos.x + half - EPS);
    const minZ = Math.floor(pos.z - half + EPS), maxZ = Math.floor(pos.z + half - EPS);
    if (dy < 0) {
      const yTop = Math.floor(ny);
      const yFrom = Math.floor(pos.y - EPS);
      for (let by = yFrom; by >= yTop; by--) {
        let top = -Infinity;
        for (let bx = minX; bx <= maxX; bx++) for (let bz = minZ; bz <= maxZ; bz++) {
          const t = blockTop(world, bx, by, bz);
          if (t > top) top = t;
        }
        if (top > -Infinity && top >= ny && top <= pos.y + EPS) {
          pos.y = top; vel.y = 0; res.onGround = true; dy = 0; break;
        }
      }
      if (dy !== 0) pos.y = ny;
    } else {
      const headNow = pos.y + h, headNew = ny + h;
      const yFrom = Math.floor(headNow + EPS), yTo = Math.floor(headNew);
      let blocked = false;
      for (let by = yFrom; by <= yTo; by++) {
        for (let bx = minX; bx <= maxX && !blocked; bx++) for (let bz = minZ; bz <= maxZ; bz++) {
          if (getDef(world.getBlock(bx, by, bz)).collide) { blocked = true; pos.y = by - h - EPS; vel.y = 0; res.hitHead = true; break; }
        }
        if (blocked) break;
      }
      if (!blocked) pos.y = ny;
    }
  }

  // X
  const dx = vel.x * dt;
  if (dx !== 0) {
    const nx = pos.x + dx;
    if (collides(world, nx, pos.y, pos.z, half, h)) {
      res.hitX = true;
      // 壁にぴったり寄せる
      const edge = dx > 0 ? Math.floor(nx + half) - half - EPS : Math.ceil(nx - half) + half + EPS;
      if (!collides(world, edge, pos.y, pos.z, half, h)) pos.x = edge;
      vel.x = 0;
    } else pos.x = nx;
  }
  // Z
  const dz = vel.z * dt;
  if (dz !== 0) {
    const nz = pos.z + dz;
    if (collides(world, pos.x, pos.y, nz, half, h)) {
      res.hitZ = true;
      const edge = dz > 0 ? Math.floor(nz + half) - half - EPS : Math.ceil(nz - half) + half + EPS;
      if (!collides(world, pos.x, pos.y, edge, half, h)) pos.z = edge;
      vel.z = 0;
    } else pos.z = nz;
  }
  if (!res.onGround && vel.y <= 0) {
    // 地面にいるか（わずか下にブロック）
    res.onGround = collides(world, pos.x, pos.y - 0.02, pos.z, half, 0.02 + EPS) && vel.y === 0;
  }
  return res;
}

/** ブロックの上面の高さ（当たり判定が無ければ -Infinity） */
function blockTop(world, bx, by, bz) {
  const id = world.getBlock(bx, by, bz);
  const d = getDef(id);
  if (!d.collide) return -Infinity;
  return by + (d.height && d.shape !== 'liquid' ? d.height : 1);
}

export function collides(world, x, y, z, half, h) {
  const minX = Math.floor(x - half + EPS), maxX = Math.floor(x + half - EPS);
  const minY = Math.floor(y + EPS), maxY = Math.floor(y + h - EPS);
  const minZ = Math.floor(z - half + EPS), maxZ = Math.floor(z + half - EPS);
  for (let bx = minX; bx <= maxX; bx++) for (let by = minY; by <= maxY; by++) for (let bz = minZ; bz <= maxZ; bz++) {
    const d = getDef(world.getBlock(bx, by, bz));
    if (!d.collide) continue;
    if (d.height && d.shape !== 'liquid') { if (y < by + d.height) return true; }
    else return true;
  }
  return false;
}

/** AABB がブロック (bx,by,bz) と重なるか */
export function aabbIntersectsBlock(x, y, z, half, h, bx, by, bz) {
  return x + half > bx && x - half < bx + 1 && y + h > by && y < by + 1 && z + half > bz && z - half < bz + 1;
}

/** その位置の AABB が水に触れているか（足元～頭） */
export function inWater(world, x, y, z, half, h) {
  const minX = Math.floor(x - half), maxX = Math.floor(x + half);
  const minY = Math.floor(y), maxY = Math.floor(y + h - 0.1);
  const minZ = Math.floor(z - half), maxZ = Math.floor(z + half);
  for (let bx = minX; bx <= maxX; bx++) for (let by = minY; by <= maxY; by++) for (let bz = minZ; bz <= maxZ; bz++) {
    if (world.getBlock(bx, by, bz) === B.WATER) return true;
  }
  return false;
}

/**
 * ボクセルのレイキャスト（DDA）
 * @returns {null | {x,y,z, nx,ny,nz, dist, id}}
 */
export function raycastBlocks(world, ox, oy, oz, dx, dy, dz, maxDist, hitFn) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;
  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;
  let tMaxX = stepX > 0 ? (x + 1 - ox) * tDeltaX : stepX < 0 ? (ox - x) * tDeltaX : Infinity;
  let tMaxY = stepY > 0 ? (y + 1 - oy) * tDeltaY : stepY < 0 ? (oy - y) * tDeltaY : Infinity;
  let tMaxZ = stepZ > 0 ? (z + 1 - oz) * tDeltaZ : stepZ < 0 ? (oz - z) * tDeltaZ : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for (let i = 0; i < 256; i++) {
    const id = world.getBlock(x, y, z);
    if (id !== 0 && hitFn(id, x, y, z)) return { x, y, z, nx, ny, nz, dist: t, id };
    if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0; }
    else if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0; }
    else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    if (t > maxDist) return null;
    if (y < 0 || y >= world.H) { if ((y < 0 && dy <= 0) || (y >= world.H && dy >= 0)) return null; }
  }
  return null;
}
