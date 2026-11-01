import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const loader = new GLTFLoader();

export function loadGltf(url) {
  return new Promise((resolve, reject) => loader.load(url, (g) => resolve(g.scene), undefined, reject));
}

export async function loadAll(base, names, onProgress) {
  const out = {};
  let done = 0;
  await Promise.all(
    names.map(async (n) => {
      out[n] = await loadGltf(`${base}models/zombie-drive/${n}.glb`);
      done += 1;
      onProgress && onProgress(done / names.length);
    }),
  );
  return out;
}

export async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

/**
 * Flatten a loaded glTF scene into a single non-indexed geometry with vertex colours
 * taken from each mesh material. Used for zombies, props and thrown objects so that
 * every instance is one draw call and can share geometry.
 */
export function bakeGeometry(scene) {
  scene.updateMatrixWorld(true);
  const geoms = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    if (g.index) g = g.toNonIndexed();
    g.applyMatrix4(o.matrixWorld);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const c = mats[0].color || new THREE.Color(0.6, 0.6, 0.6);
    const e = mats[0].emissive;
    const strength = mats[0].emissiveIntensity || 0;
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = Math.min(1, c.r + (e ? e.r * strength * 0.4 : 0));
      col[i * 3 + 1] = Math.min(1, c.g + (e ? e.g * strength * 0.4 : 0));
      col[i * 3 + 2] = Math.min(1, c.b + (e ? e.b * strength * 0.4 : 0));
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geoms.push(g);
  });
  const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
  merged.computeBoundingSphere();
  return merged;
}

export const bakedMaterial = () =>
  new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.75, metalness: 0.05});

/** Enable shadows on every mesh of a glTF scene. */
export function prepareScene(scene) {
  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material && o.material.transparent) o.castShadow = false;
    }
  });
  return scene;
}
