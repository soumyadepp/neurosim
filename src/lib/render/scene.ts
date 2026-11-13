import * as THREE from 'three';
import { REGIONS, RI } from '../sim/catalog';
import { brainstemPoint, cerebellumPoint, regionOf, shapePoint, type ShadedPoint } from '../sim/anatomy';
import { MAX_PULSES, type NeuroSim } from '../sim/network';
import type { CortexHemisphere, LoadedBrain } from '../data/brainData';
import type { LabelView } from './labels';

export type Pick =
  | { kind: 'neuron'; index: number }
  | { kind: 'surface'; point: THREE.Vector3 };

export interface Orbit {
  theta: number;
  phi: number;
  r: number;
  target: THREE.Vector3;
  auto: boolean;
}

type Rgb = [number, number, number];

const CORTEX: Rgb = [0.80, 0.60, 0.58];
const MEDIAL_WALL: Rgb = [0.84, 0.82, 0.81];
const NO_REGION = 255;
const PROCEDURAL_CEREBELLUM = { center: [0, -0.66, -0.55], radii: [0.6, 0.34, 0.44] };
const DEAD_NEURON: Rgb = [0.78, 0.30, 0.27];
const EXCITATORY_PULSE: Rgb = [0.85, 0.47, 0.04];
const INHIBITORY_PULSE: Rgb = [0.70, 0.18, 0.78];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const LABEL_OUTSET = 1.16;
const ACTIVITY_ORDER = 3;
const EDGE_ALPHA_PROJ = 0.12;
const EDGE_ALPHA_LOCAL = 0.06;
const NEURON_REST_ALPHA = 0.7;
const HALO_ALPHA = 0.55;
const DEEP_REGIONS = new Set([RI.thalamus, RI.hippocampus]);

THREE.ColorManagement.enabled = false;

function dotTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!, grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,255,255,0.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/**
 * Draws the brain shell, neurons, synapses and in-flight spikes for a NeuroSim, and answers pick queries.
 */
export class BrainRenderer {
  readonly orbit: Orbit = { theta: 0.75, phi: 1.2, r: 3.7, target: new THREE.Vector3(0, -0.15, -0.05), auto: true };

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  private readonly raycaster = new THREE.Raycaster();
  private readonly shellMat = new THREE.MeshPhongMaterial({ vertexColors: true, transparent: true, opacity: 0.6, shininess: 70, depthWrite: false, specular: 0x6a4444 });
  private readonly lesionMat = new THREE.MeshBasicMaterial({ color: 0xc0392b, transparent: true, opacity: 0.22, depthWrite: false });
  private readonly brainMeshes: THREE.Mesh[] = [];
  private readonly lesionMarkers: THREE.Mesh[] = [];
  private readonly neuronPoints: THREE.Points;
  private readonly nColors: Float32Array;
  private readonly haloColors: Float32Array;
  private readonly haloGeom: THREE.BufferGeometry;
  private readonly eGeom: THREE.BufferGeometry;
  private readonly eCol: Float32Array;
  private readonly eBase: Float32Array;
  private readonly pGeom: THREE.BufferGeometry;
  private readonly pPos = new Float32Array(MAX_PULSES * 3);
  private readonly pCol = new Float32Array(MAX_PULSES * 4);
  private readonly selMarker: THREE.Mesh;
  private readonly anchors: { region: number; deep: boolean; points: THREE.Vector3[] }[] = [];
  private readonly scratch = new THREE.Vector3();
  private readonly camDir = new THREE.Vector3();
  private surfacePaint: Float32Array | null = null;
  private highlight: Set<number> | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly sim: NeuroSim, anatomy: LoadedBrain | null = null) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.raycaster.params.Points = { threshold: 0.045 };

    this.scene.add(new THREE.HemisphereLight(0xf2f5ff, 0x8a7a78, 0.8 * Math.PI));
    const key = new THREE.DirectionalLight(0xfff1e6, 0.9 * Math.PI); key.position.set(2.5, 3, 2); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd4ff, 0.35 * Math.PI); fill.position.set(-3, 1, 1); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xdfe6f2, 0.3 * Math.PI); rim.position.set(-1, -2, -3); this.scene.add(rim);

    if (anatomy) this.buildAtlas(anatomy);
    else this.buildProcedural();

    const tex = dotTexture();
    const nGeom = new THREE.BufferGeometry();
    nGeom.setAttribute('position', new THREE.BufferAttribute(sim.pos, 3));
    this.nColors = new Float32Array(sim.n * 4);
    nGeom.setAttribute('color', new THREE.BufferAttribute(this.nColors, 4));
    this.neuronPoints = new THREE.Points(nGeom, this.activityMaterial(tex, 0.045));
    this.addActivityLayer(this.neuronPoints, 1);

    this.haloGeom = new THREE.BufferGeometry();
    this.haloGeom.setAttribute('position', new THREE.BufferAttribute(sim.pos, 3));
    this.haloColors = new Float32Array(sim.n * 4);
    this.haloGeom.setAttribute('color', new THREE.BufferAttribute(this.haloColors, 4));
    this.addActivityLayer(new THREE.Points(this.haloGeom, this.activityMaterial(tex, 0.13)), 0);

    const S = sim.s, P = sim.pos;
    const ePos = new Float32Array(S * 6);
    this.eCol = new Float32Array(S * 8);
    this.eBase = new Float32Array(S * 3);
    for (let s = 0; s < S; s++) {
      const a = sim.pre[s], b = sim.post[s];
      ePos.set([P[a * 3], P[a * 3 + 1], P[a * 3 + 2], P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], s * 6);
      const c = REGIONS[sim.reg[a]].color;
      for (let ch = 0; ch < 3; ch++) this.eBase[s * 3 + ch] = c[ch] * 0.6;
    }
    this.eGeom = new THREE.BufferGeometry();
    this.eGeom.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    this.eGeom.setAttribute('color', new THREE.BufferAttribute(this.eCol, 4));
    this.addActivityLayer(new THREE.LineSegments(this.eGeom, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, depthTest: false })), 0);

    this.pGeom = new THREE.BufferGeometry();
    this.pGeom.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    this.pGeom.setAttribute('color', new THREE.BufferAttribute(this.pCol, 4));
    this.pGeom.setDrawRange(0, 0);
    this.addActivityLayer(new THREE.Points(this.pGeom, this.activityMaterial(tex, 0.05)), 2);

    this.selMarker = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshBasicMaterial({ color: 0x1f2937, wireframe: true, transparent: true, opacity: 0.85 }));
    this.selMarker.visible = false;
    this.selMarker.renderOrder = ACTIVITY_ORDER + 3;
    this.scene.add(this.selMarker);
    this.buildAnchors();
  }

  /**
   * One label anchor per hemisphere for each region: the centroid of its neurons, pushed out to the
   * surface for cortical regions and left in place for deep nuclei.
   */
  private buildAnchors(): void {
    const { regionMembers, pos, hemi } = this.sim, target = this.orbit.target;
    regionMembers.forEach((members, region) => {
      const deep = DEEP_REGIONS.has(region);
      const sums = new Map<number, { v: THREE.Vector3; n: number }>();
      for (const i of members) {
        const acc = sums.get(hemi[i]) ?? { v: new THREE.Vector3(), n: 0 };
        acc.v.x += pos[i * 3]; acc.v.y += pos[i * 3 + 1]; acc.v.z += pos[i * 3 + 2]; acc.n++;
        sums.set(hemi[i], acc);
      }
      const points = [...sums.values()].map(({ v, n }) => {
        v.divideScalar(n);
        return deep ? v : v.sub(target).multiplyScalar(LABEL_OUTSET).add(target);
      });
      this.anchors.push({ region, deep, points });
    });
  }

  /**
   * Projects every region anchor to canvas pixels, choosing whichever hemisphere faces the camera.
   */
  projectLabels(): LabelView {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, target = this.orbit.target;
    const toScreen = (v: THREE.Vector3) => {
      const s = this.scratch.copy(v).project(this.camera);
      return { x: (s.x + 1) / 2 * w, y: (1 - s.y) / 2 * h };
    };
    this.camDir.copy(this.camera.position).sub(target).normalize();
    const center = toScreen(target);
    const anchors = this.anchors.map(({ region, deep, points }) => {
      let best = points[0], bestDot = -Infinity;
      for (const p of points) {
        const d = this.scratch.copy(p).sub(target).normalize().dot(this.camDir);
        if (d > bestDot) { bestDot = d; best = p; }
      }
      return { region, deep, front: deep || bestDot > -0.1, ...toScreen(best) };
    });
    return { cx: center.x, cy: center.y, anchors };
  }

  /**
   * Point material for activity layers. They skip the depth test so firing stays visible through the shell.
   */
  private activityMaterial(tex: THREE.Texture, size: number): THREE.PointsMaterial {
    return new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: true });
  }

  private addActivityLayer(obj: THREE.Object3D, offset: number): void {
    obj.renderOrder = ACTIVITY_ORDER + offset;
    this.scene.add(obj);
  }

  private buildProcedural(): void {
    this.buildHemisphere(-1);
    this.buildHemisphere(1);
    this.buildSingle((x, y, z) => cerebellumPoint(x, y, z, 1), RI.cerebellum, 96, 0.4);
    this.buildSingle((x, y, z) => brainstemPoint((1 - y) / 2, Math.atan2(z, x), Math.hypot(x, z)), RI.brainstem, 48, 0);
  }

  /**
   * Real anatomy: the fsaverage5 pial surface labelled with Lausanne parcels, plus a cerebellum and
   * brainstem fitted to the atlas positions.
   */
  private buildAtlas({ brain, cortex }: LoadedBrain): void {
    this.shellMat.side = THREE.DoubleSide;
    for (const hemi of cortex) this.buildCortexHemisphere(hemi, brain.nodes.map(n => RI[n.simRegion]));
    const { center, radii } = brain.anchors.cerebellum;
    const c0 = PROCEDURAL_CEREBELLUM.center, r0 = PROCEDURAL_CEREBELLUM.radii;
    this.buildSingle((x, y, z) => {
      const p = cerebellumPoint(x, y, z, 1);
      return [0, 1, 2].map(k => center[k] + ((p[k] - c0[k]) / r0[k]) * radii[k]).concat(p[3]) as ShadedPoint;
    }, RI.cerebellum, 96, 0.4);
    const { top, bottom, radius } = brain.anchors.brainstem;
    this.buildSingle((x, y, z) => {
      const t = (1 - y) / 2, ang = Math.atan2(z, x), rad = Math.hypot(x, z);
      const pons = 1 + 0.45 * Math.exp(-(((t - 0.38) / 0.16) ** 2)) * (0.6 + 0.4 * Math.max(0, Math.sin(ang)));
      const R = radius * 0.6 * (1 - 0.25 * t) * rad * pons;
      return [
        top[0] + (bottom[0] - top[0]) * t + Math.cos(ang) * R,
        top[1] + (bottom[1] - top[1]) * t,
        top[2] + (bottom[2] - top[2]) * t + Math.sin(ang) * R,
        0,
      ];
    }, RI.brainstem, 48, 0);
  }

  private buildCortexHemisphere(hemi: CortexHemisphere, nodeRegion: number[]): void {
    const g = new THREE.BufferGeometry();
    const n = hemi.nodes.length;
    g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(hemi.pial), 3));
    g.setIndex(new THREE.BufferAttribute(Uint32Array.from(hemi.faces), 1));
    const ridx = new Uint8Array(n), shade = new Float32Array(n).fill(1);
    for (let i = 0; i < n; i++) ridx[i] = hemi.nodes[i] >= 0 ? nodeRegion[hemi.nodes[i]] : NO_REGION;
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.computeVertexNormals();
    this.addMesh(g, ridx, shade, Int16Array.from(hemi.nodes));
  }

  /**
   * Overrides the region tint with one colour per atlas node (receptor maps, networks, connectivity).
   * Pass null to go back to the default region tint.
   */
  setSurfacePaint(colors: Float32Array | null): void {
    this.surfacePaint = colors;
    for (const m of this.brainMeshes) this.paintMesh(m, this.highlight);
  }

  private addMesh(geom: THREE.BufferGeometry, regionIdx: Uint8Array, shade: Float32Array, nodeIdx: Int16Array | null = null): void {
    const m = new THREE.Mesh(geom, this.shellMat);
    m.userData.regionIdx = regionIdx;
    m.userData.shade = shade;
    m.userData.nodeIdx = nodeIdx;
    m.renderOrder = 2;
    this.scene.add(m);
    this.brainMeshes.push(m);
    this.paintMesh(m, null);
  }

  /**
   * Tints the cortex toward each region's colour, darkening grooves. Highlighted regions take
   * most of their colour and everything else fades back.
   */
  private paintMesh(m: THREE.Mesh, set: Set<number> | null): void {
    const col = m.geometry.attributes.color as THREE.BufferAttribute;
    const arr = col.array as Float32Array, ridx: Uint8Array = m.userData.regionIdx, shade: Float32Array = m.userData.shade;
    const nodeIdx: Int16Array | null = m.userData.nodeIdx, paint = this.surfacePaint;
    for (let i = 0; i < ridx.length; i++) {
      if (ridx[i] === NO_REGION) { arr.set(MEDIAL_WALL, i * 3); continue; }
      const c = REGIONS[ridx[i]].color, sh = shade[i];
      const node = nodeIdx ? nodeIdx[i] : -1;
      let t = 0.26, add = 0, fade = 0;
      if (set?.has(ridx[i])) { t = 0.85; add = 0.06; }
      else if (set) { t = 0.12; fade = 0.55; }
      for (let k = 0; k < 3; k++) {
        const base = paint && node >= 0 ? paint[node * 3 + k] : mix(CORTEX[k], c[k], t);
        const v = Math.min(1, base * sh + add);
        arr[i * 3 + k] = mix(v, 1, fade);
      }
    }
    col.needsUpdate = true;
  }

  private buildHemisphere(side: number): void {
    const g = new THREE.SphereGeometry(1, 256, 192);
    const pos = g.attributes.position, n = pos.count, ridx = new Uint8Array(n), shade = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const p = shapePoint(x, y, z, side, 1);
      pos.setXYZ(i, p[0], p[1], p[2]);
      ridx[i] = regionOf(x * side, y, z, side);
      shade[i] = 1 - 0.5 * p[3];
    }
    if (side < 0) {
      const idx = g.index!.array;
      for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.computeVertexNormals();
    this.addMesh(g, ridx, shade);
  }

  private buildSingle(mapFn: (x: number, y: number, z: number) => ShadedPoint, r: number, segs: number, shadeAmt: number): void {
    const g = new THREE.SphereGeometry(1, segs, segs);
    const pos = g.attributes.position, n = pos.count, ridx = new Uint8Array(n).fill(r), shade = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = mapFn(pos.getX(i), pos.getY(i), pos.getZ(i));
      pos.setXYZ(i, p[0], p[1], p[2]);
      shade[i] = 1 - shadeAmt * p[3];
    }
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.computeVertexNormals();
    this.addMesh(g, ridx, shade);
  }

  setHighlight(set: Set<number> | null): void {
    this.highlight = set;
    for (const m of this.brainMeshes) this.paintMesh(m, set);
  }

  setShellOpacity(opacity: number): void { this.shellMat.opacity = opacity; }

  addLesionMarker(point: THREE.Vector3, radius: number): void {
    const mk = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), this.lesionMat);
    mk.position.copy(point);
    this.scene.add(mk);
    this.lesionMarkers.push(mk);
  }

  clearLesionMarkers(): void {
    for (const m of this.lesionMarkers) { this.scene.remove(m); m.geometry.dispose(); }
    this.lesionMarkers.length = 0;
  }

  /**
   * Returns the neuron under the cursor, or in lesion mode the brain surface point under it.
   */
  pick(clientX: number, clientY: number, surface: boolean): Pick | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    if (surface) {
      const hits = this.raycaster.intersectObjects(this.brainMeshes);
      if (hits.length) return { kind: 'surface', point: hits[0].point };
      const nh = this.raycaster.intersectObject(this.neuronPoints);
      return nh.length ? { kind: 'surface', point: nh[0].point } : null;
    }
    const hits = this.raycaster.intersectObject(this.neuronPoints);
    if (!hits.length) return null;
    hits.sort((a, b) => (a.distanceToRay ?? 0) - (b.distanceToRay ?? 0));
    return { kind: 'neuron', index: hits[0].index! };
  }

  /**
   * Syncs every buffer with the simulation and draws one frame.
   */
  render(ticksPerFrame: number): void {
    this.resize();
    if (this.orbit.auto) this.orbit.theta += 0.0015;
    this.placeCamera();
    this.updateNeuronColors();
    this.updateEdgeColors(Math.pow(0.8, ticksPerFrame));
    this.updatePulses();
    const i = this.sim.selected;
    this.selMarker.visible = i >= 0;
    if (i >= 0) this.selMarker.position.set(this.sim.pos[i * 3], this.sim.pos[i * 3 + 1], this.sim.pos[i * 3 + 2]);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }

  private resize(): void {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, pr = this.renderer.getPixelRatio();
    if (this.canvas.width !== Math.floor(w * pr) || this.canvas.height !== Math.floor(h * pr)) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  private placeCamera(): void {
    const { theta, phi, r, target } = this.orbit;
    this.camera.position.set(target.x + r * Math.sin(phi) * Math.cos(theta), target.y + r * Math.cos(phi), target.z + r * Math.sin(phi) * Math.sin(theta));
    this.camera.lookAt(target);
  }

  private updateNeuronColors(): void {
    const { alive, reg, glow, inhib, n } = this.sim, out = this.nColors, halo = this.haloColors;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      if (!alive[i]) { out.set(DEAD_NEURON, o); out[o + 3] = 0.9; halo[o + 3] = 0; continue; }
      const c = REGIONS[reg[i]].color, g = glow[i], hot = inhib[i] ? INHIBITORY_PULSE : EXCITATORY_PULSE;
      for (let ch = 0; ch < 3; ch++) {
        out[o + ch] = mix(c[ch] * 0.62, hot[ch], g);
        halo[o + ch] = hot[ch];
      }
      out[o + 3] = mix(NEURON_REST_ALPHA, 1, g);
      halo[o + 3] = g * HALO_ALPHA;
    }
    this.neuronPoints.geometry.attributes.color.needsUpdate = true;
    this.haloGeom.attributes.color.needsUpdate = true;
  }

  private updateEdgeColors(decay: number): void {
    const { alive, pre, post, edgeGlow, s: S } = this.sim, eBase = this.eBase, eCol = this.eCol;
    for (let s = 0; s < S; s++) {
      const dead = !alive[pre[s]] || !alive[post[s]];
      let g = edgeGlow[s];
      if (g > 0.002) { g *= decay; edgeGlow[s] = g; } else g = 0;
      const o = s * 8, b = s * 3;
      const r = mix(eBase[b], EXCITATORY_PULSE[0], g);
      const gg = mix(eBase[b + 1], EXCITATORY_PULSE[1], g);
      const bb = mix(eBase[b + 2], EXCITATORY_PULSE[2], g);
      const a = dead ? 0 : mix(this.sim.isProj[s] ? EDGE_ALPHA_PROJ : EDGE_ALPHA_LOCAL, 0.85, g);
      eCol[o] = r; eCol[o + 1] = gg; eCol[o + 2] = bb; eCol[o + 3] = a;
      eCol[o + 4] = r; eCol[o + 5] = gg; eCol[o + 6] = bb; eCol[o + 7] = a;
    }
    this.eGeom.attributes.color.needsUpdate = true;
  }

  private updatePulses(): void {
    const t = this.sim.tick, ps = this.sim.pulses, P = this.sim.pos, pPos = this.pPos, pCol = this.pCol;
    let n = 0;
    for (let k = 0; k < ps.length; k++) {
      const p = ps[k];
      if (t >= p.t1) { ps[k] = ps[ps.length - 1]; ps.pop(); k--; continue; }
      const f = (t - p.t0) / (p.t1 - p.t0), a = p.a * 3, b = p.b * 3, o = n * 3, oc = n * 4;
      pPos[o] = P[a] + (P[b] - P[a]) * f; pPos[o + 1] = P[a + 1] + (P[b + 1] - P[a + 1]) * f; pPos[o + 2] = P[a + 2] + (P[b + 2] - P[a + 2]) * f;
      pCol.set(p.inh ? INHIBITORY_PULSE : EXCITATORY_PULSE, oc);
      pCol[oc + 3] = 1;
      n++;
    }
    this.pGeom.setDrawRange(0, n);
    this.pGeom.attributes.position.needsUpdate = true;
    this.pGeom.attributes.color.needsUpdate = true;
  }
}
