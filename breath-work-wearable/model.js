// Labeled 3D model of the breath work wearable, built from the dimensions on the
// build sheet. Millimetres. x runs through the shirt (negative = outside), y is up.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const host = document.getElementById('model');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
camera.position.set(-86, 34, 90);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
host.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.className = 'model-labels';
host.appendChild(labels.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 60;
controls.maxDistance = 260;
controls.target.set(0, -18, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.9;
controls.addEventListener('start', () => { controls.autoRotate = false; });

scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc8b8, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(-120, 160, 100);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 0.5);
fill.position.set(120, 40, -80);
scene.add(fill);

const col = {
  shell: 0xeae6dc, lid: 0xd9d3c4, fabric: 0x8fa3b8, magnet: 0x7a7f86, board: 0x2f6b4e,
  battery: 0xc9c2b0, driver: 0x1f4f8a, motor: 0x3a3a3c, ribbon: 0x3d3a36, wire: [0xd0433a, 0x222222, 0x2a6fd6, 0xe0b43a]
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.05, ...o });

// A cylinder whose axis runs along x, centred at (x, y, z)
function disc(r, h, x, m, y = -24, z = 0) {
  const g = new THREE.CylinderGeometry(r, r, h, 72);
  g.rotateZ(Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}
function box(sx, sy, sz, x, y, z, m) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

// shirt: a panel whose top edge is the neckline or cuff, at y = 0
const fabric = box(1.5, 58, 92, 0, -29, 0, mat(col.fabric, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }));

// shells. Outer cup Ø36 × 12 sits outside the shirt; inner cup Ø36 × 8 against the skin.
const shellMat = mat(col.shell, { transparent: true, opacity: 0.28, depthWrite: false });
const lidMat = mat(col.lid, { transparent: true, opacity: 0.28, depthWrite: false });
const outerCup = disc(18, 12, -7.5, shellMat);
const outerLid = disc(18, 1.2, -14.1, lidMat);
const innerCup = disc(18, 8, 4.75, shellMat);
const innerLid = disc(18, 1.2, 9.35, lidMat);
const shells = [outerCup, innerCup];
const lids = [outerLid, innerLid];

// magnets: two D81 (Ø12.7 × 1.6) per disc, near the rim, opposite each other, in the cup floor
const magMat = mat(col.magnet, { metalness: 0.7, roughness: 0.3 });
const magnets = [
  disc(6.35, 1.6, -2.6, magMat, -24, 10.5), disc(6.35, 1.6, -2.6, magMat, -24, -10.5),
  disc(6.35, 1.6, 1.8, magMat, -24, 10.5), disc(6.35, 1.6, 1.8, magMat, -24, -10.5)
];

// outer disc contents: XIAO nRF52840 Sense (21 × 17.5 × 3) at the lid, 100 mAh LiPo (28 × 12 × 4) over the magnets
const xiao = box(3, 17.5, 21, -11.5, -24, 0, mat(col.board));
box(1.2, 6, 7, -13.4, -24, 7, mat(0x9aa0a6, { metalness: 0.6, roughness: 0.3 })); // USB-C
const battery = box(4, 12, 28, -6.2, -24, 0, mat(col.battery));

// inner disc contents: DRV2605L breakout (25.8 × 17.8 × 1.6) on the floor, LRA Ø10 × 4 against the skin side
const driver = box(1.6, 17.8, 25.8, 4.0, -24, 0, mat(col.driver));
const motor = disc(5, 4, 7.0, mat(col.motor, { metalness: 0.5, roughness: 0.4 }));

// ribbon: 15 mm grosgrain from the outer cup, over the shirt edge, into the inner cup
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-9, -10, 0), new THREE.Vector3(-9, 0, 0), new THREE.Vector3(-6.5, 5.5, 0),
  new THREE.Vector3(0, 7.5, 0), new THREE.Vector3(5, 5.5, 0), new THREE.Vector3(6.5, 0, 0), new THREE.Vector3(6.5, -10, 0)
]);
function strip(curve, width, segs = 80) {
  const pts = curve.getSpacedPoints(segs), pos = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    pos.push(p.x, p.y, p.z - width / 2, p.x, p.y, p.z + width / 2);
    if (i) { const a = 2 * (i - 1); idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const ribbon = new THREE.Mesh(strip(path, 15), mat(col.ribbon, { side: THREE.DoubleSide, roughness: 0.9 }));
scene.add(ribbon);
// the four wires sewn along it: 3V3, GND, SDA, SCL
const wires = [-4.5, -1.5, 1.5, 4.5].map((z, i) => {
  const pts = path.getSpacedPoints(80).map(p => {
    return new THREE.Vector3(p.x, p.y, p.z + z);
  });
  // push the wire 0.6 mm toward the outside of the bend so it sits on the ribbon, not in it
  const c = new THREE.CatmullRomCurve3(pts.map((p, k) => {
    const u = k / (pts.length - 1), tan = path.getTangentAt(u), n = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 0, 1)).normalize();
    return p.clone().addScaledVector(n, -0.7);
  }));
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, 80, 0.28, 8, false), mat(col.wire[i], { roughness: 0.5 }));
  scene.add(m);
  return m;
});

// labels with leader lines
const lineMat = new THREE.LineBasicMaterial({ color: 0x5a5650, transparent: true, opacity: 0.8 });
const labelObjs = [];
function label(text, anchor, offset) {
  const a = new THREE.Vector3(...anchor), end = a.clone().add(new THREE.Vector3(...offset));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, end]), lineMat);
  scene.add(line);
  const el = document.createElement('div');
  el.className = 'model-label';
  el.textContent = text;
  const obj = new CSS2DObject(el);
  obj.position.copy(end);
  scene.add(obj);
  labelObjs.push(line, obj);
}
label('Outer disc, 36 mm: radio board and battery', [-14, -8, 12], [-22, 16, 6]);
label('XIAO nRF52840 Sense, radio and motion sensor', [-13, -31, -7], [-20, -12, -10]);
label('100 mAh battery, about a week per charge', [-6, -28, 13], [-4, -22, 20]);
label('Grosgrain ribbon, 15 mm, carries four wires', [-3, 7.5, 7.5], [-6, 12, 16]);
label('Shirt: its top edge is the neckline or cuff', [0, -3, 36], [2, 10, 10]);
label('Magnets, N52, two per disc, hold through the cloth', [1.8, -24, 16.5], [10, -10, 20]);
label('Inner disc, 8 mm, sits on the skin', [10, -9, -12], [20, 14, -14]);
label('DRV2605L driver, shapes the swell', [4, -33, -11], [12, -18, -22]);
label('Vibration motor, 170 Hz, you feel it here', [9.5, -22, 3], [24, 4, 6]);

// controls under the canvas
const inside = document.getElementById('model-inside');
const showLabels = document.getElementById('model-labels-toggle');
function applyInside() {
  const on = inside.checked;
  shellMat.opacity = on ? 0.28 : 1; shellMat.transparent = on; shellMat.depthWrite = !on;
  lidMat.opacity = on ? 0.28 : 1; lidMat.transparent = on; lidMat.depthWrite = !on;
  shellMat.needsUpdate = lidMat.needsUpdate = true;
  for (const m of [xiao, battery, driver, motor, ...magnets]) m.visible = on;
}
function applyLabels() { for (const o of labelObjs) o.visible = showLabels.checked; }
inside.addEventListener('change', applyInside);
showLabels.addEventListener('change', applyLabels);
applyInside(); applyLabels();

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h); labels.setSize(w, h);
}
new ResizeObserver(resize).observe(host);
resize();

// keep every label inside the frame, whatever angle it is turned to
const labelEls = () => host.querySelectorAll('.model-label');
function clampLabels() {
  const hr = host.getBoundingClientRect(), m = 6;
  for (const el of labelEls()) {
    el.style.marginLeft = '0px'; el.style.marginTop = '0px';
    const r = el.getBoundingClientRect();
    let dx = 0, dy = 0;
    if (r.left < hr.left + m) dx = hr.left + m - r.left;
    else if (r.right > hr.right - m) dx = hr.right - m - r.right;
    if (r.top < hr.top + m) dy = hr.top + m - r.top;
    else if (r.bottom > hr.bottom - m) dy = hr.bottom - m - r.bottom;
    if (dx || dy) { el.style.marginLeft = dx + 'px'; el.style.marginTop = dy + 'px'; }
  }
}

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
  labels.render(scene, camera);
  clampLabels();
});
