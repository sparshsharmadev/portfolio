/**
 * webgl.js — Immersive 3D Background
 * Three.js floating geometry + particle field + mouse interaction + scroll parallax
 */
(function () {
  'use strict';

  // ── Load Three.js from CDN then boot ──────────────────────────────────────
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  script.onload = bootScene;
  script.onerror = () => {}; // Graceful fallback — no 3D but site still works
  document.head.appendChild(script);

  function bootScene() {
    if (typeof THREE === 'undefined') return;

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100vw', 'height:100dvh',
      'z-index:0', 'pointer-events:none', 'opacity:0', 'transition:opacity 1.8s ease'
    ].join(';');
    document.body.insertBefore(renderer.domElement, document.body.firstChild);

    // Keep page background dark
    document.body.style.background = '#000';

    // ── Scene ───────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // ── Camera ──────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 0, 22);

    // ── Colours ─────────────────────────────────────────────────────────────
    const CYAN    = 0x00ffcc;
    const ORANGE  = 0xff6a3d;
    const PURPLE  = 0xa78bfa;
    const WHITE   = 0xffffff;

    // ── Wireframe Material Factory ───────────────────────────────────────────
    function wireMat(color, opacity = 0.18) {
      return new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity,
      });
    }

    // ── Floating 3D Objects ─────────────────────────────────────────────────
    const objects = [];

    function addMesh(geo, mat, x, y, z, scale = 1, rx = 0, ry = 0, rz = 0) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      mesh.scale.setScalar(scale);
      scene.add(mesh);
      return mesh;
    }

    // Large background icosahedron (hero centerpiece)
    const icoGeo = new THREE.IcosahedronGeometry(5, 1);
    const icoMain = addMesh(icoGeo, wireMat(CYAN, 0.10), -2, 1, -8, 1, 0.3, 0.5, 0.1);
    objects.push({ mesh: icoMain, rx: 0.0008, ry: 0.0015, rz: 0.0005, floatAmp: 0.4, floatSpd: 0.6 });

    // Medium torus (left)
    const torusGeo = new THREE.TorusGeometry(3.2, 0.3, 12, 48);
    const torusL = addMesh(torusGeo, wireMat(PURPLE, 0.13), -14, 3, -4, 1, 1.1, 0.3, 0.2);
    objects.push({ mesh: torusL, rx: 0.001, ry: 0.0006, rz: 0.0012, floatAmp: 0.6, floatSpd: 0.4 });

    // Medium torus (right)
    const torusR = addMesh(new THREE.TorusGeometry(2.6, 0.25, 12, 48), wireMat(ORANGE, 0.11), 14, -2, -6, 1, 0.8, 1.2, 0.0);
    objects.push({ mesh: torusR, rx: 0.0012, ry: 0.001, rz: 0.0008, floatAmp: 0.5, floatSpd: 0.5 });

    // Octahedron (top right)
    const octaGeo = new THREE.OctahedronGeometry(2.2, 0);
    const octa = addMesh(octaGeo, wireMat(CYAN, 0.12), 10, 7, -5, 1, 0.4, 0.2, 0.8);
    objects.push({ mesh: octa, rx: 0.0015, ry: 0.002, rz: 0.001, floatAmp: 0.7, floatSpd: 0.7 });

    // Small icosahedra scattered
    const seeds = [
      { x: -10, y: -5, z: -3, c: PURPLE, s: 0.7, op: 0.14 },
      { x:  8,  y:  8, z: -10, c: CYAN,   s: 0.9, op: 0.10 },
      { x: -6,  y:  9, z: -6,  c: ORANGE, s: 0.5, op: 0.13 },
      { x:  12, y: -7, z: -8,  c: WHITE,  s: 0.6, op: 0.07 },
      { x: -13, y:  8, z: -12, c: PURPLE, s: 1.1, op: 0.09 },
      { x:  0,  y: -9, z: -5,  c: CYAN,   s: 0.55, op: 0.10 },
    ];
    seeds.forEach((s, i) => {
      const g = i % 2 === 0 ? new THREE.IcosahedronGeometry(s.s * 1.6, 0) : new THREE.OctahedronGeometry(s.s * 1.4, 0);
      const m = addMesh(g, wireMat(s.c, s.op), s.x, s.y, s.z, 1,
        Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const speed = 0.0005 + Math.random() * 0.001;
      objects.push({ mesh: m, rx: speed, ry: speed * 1.3, rz: speed * 0.7,
        floatAmp: 0.3 + Math.random() * 0.5, floatSpd: 0.3 + Math.random() * 0.5 });
    });

    // ── Particle Field ───────────────────────────────────────────────────────
    const PARTICLE_COUNT = window.innerWidth < 768 ? 600 : 1400;
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pPositions[i * 3]     = (Math.random() - 0.5) * 70;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.07, transparent: true, opacity: 0.25, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // ── Ambient Fog ─────────────────────────────────────────────────────────
    scene.fog = new THREE.FogExp2(0x000000, 0.022);

    // ── Mouse Tracking ──────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    document.addEventListener('mousemove', (e) => {
      mouse.tx = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    // ── Scroll Tracking ─────────────────────────────────────────────────────
    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    // ── Resize Handler ──────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Animation Loop ──────────────────────────────────────────────────────
    let frame = 0;
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      frame++;

      // Smooth mouse lag
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      // Camera subtle drift follows mouse + scrolls slightly
      camera.position.x = mouse.x * 1.8;
      camera.position.y = -mouse.y * 1.2 - scrollY * 0.003;
      camera.lookAt(0, 0, 0);

      // Rotate and float all objects
      objects.forEach((o, i) => {
        o.mesh.rotation.x += o.rx;
        o.mesh.rotation.y += o.ry;
        o.mesh.rotation.z += o.rz;
        // Subtle vertical float
        o.mesh.position.y += Math.sin(t * o.floatSpd + i * 1.3) * 0.0015 * o.floatAmp;
      });

      renderer.render(scene, camera);
    }

    // Fade in after a moment
    setTimeout(() => { renderer.domElement.style.opacity = '0.55'; }, 400);

    animate();
  }
})();
