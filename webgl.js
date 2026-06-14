/**
 * webgl.js — Lightweight 3D Background (Performance-Optimized)
 * Minimal Three.js wireframes + particles + scroll parallax
 */
(function () {
  'use strict';

  // Skip on mobile — too heavy, not worth it
  if (window.innerWidth < 768) return;

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  script.onload = bootScene;
  script.onerror = () => {};
  document.head.appendChild(script);

  function bootScene() {
    if (typeof THREE === 'undefined') return;

    // ── Renderer (capped at 1x pixel ratio for perf) ────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(1); // Force 1x — biggest perf win
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100dvh;z-index:0;pointer-events:none;opacity:0;transition:opacity 1.8s ease';
    document.body.insertBefore(renderer.domElement, document.body.firstChild);
    document.body.style.background = '#000';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 0, 22);

    // ── Colors ──────────────────────────────────────────────────────────────
    const CYAN = 0x00ffcc, ORANGE = 0xff6a3d, PURPLE = 0xa78bfa, WHITE = 0xffffff;

    function wireMat(color, opacity) {
      return new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });
    }

    // ── Objects (reduced geometry complexity) ────────────────────────────────
    const objects = [];

    // Centerpiece
    const centerGroup = new THREE.Group();
    centerGroup.position.set(-2, 1, -8);
    scene.add(centerGroup);

    const icoMain = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 0), wireMat(CYAN, 0.08));
    centerGroup.add(icoMain);
    const innerOcta = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), wireMat(ORANGE, 0.11));
    centerGroup.add(innerOcta);
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.04, 4, 32), wireMat(WHITE, 0.05));
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.03, 4, 32), wireMat(CYAN, 0.04));
    ring1.rotation.set(0.5, 0.5, 0.5);
    ring2.rotation.set(1.2, -0.4, 0.3);
    centerGroup.add(ring1, ring2);

    objects.push(
      { mesh: centerGroup, rx: 0, ry: 0, rz: 0, floatAmp: 0.4, floatSpd: 0.6 },
      { mesh: icoMain, rx: 0.0006, ry: 0.0012, rz: 0.0004, floatAmp: 0, floatSpd: 0 },
      { mesh: innerOcta, rx: -0.0012, ry: -0.0018, rz: -0.0008, floatAmp: 0, floatSpd: 0 },
      { mesh: ring1, rx: 0.0002, ry: 0.0003, rz: 0.0001, floatAmp: 0, floatSpd: 0 },
      { mesh: ring2, rx: -0.0001, ry: 0.0004, rz: -0.0002, floatAmp: 0, floatSpd: 0 }
    );

    // Left torus group (reduced segments)
    const torusLGroup = new THREE.Group();
    torusLGroup.position.set(-14, 3, -4);
    scene.add(torusLGroup);
    const torusL = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.25, 6, 24), wireMat(PURPLE, 0.12));
    torusL.rotation.set(1.1, 0.3, 0.2);
    torusLGroup.add(torusL);
    objects.push(
      { mesh: torusLGroup, rx: 0, ry: 0, rz: 0, floatAmp: 0.6, floatSpd: 0.4 },
      { mesh: torusL, rx: 0.0008, ry: 0.0005, rz: 0.001, floatAmp: 0, floatSpd: 0 }
    );

    // Right torus group (reduced segments)
    const torusRGroup = new THREE.Group();
    torusRGroup.position.set(14, -2, -6);
    scene.add(torusRGroup);
    const torusR = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.25, 6, 24), wireMat(ORANGE, 0.11));
    torusR.rotation.set(0.8, 1.2, 0.0);
    torusRGroup.add(torusR);
    objects.push(
      { mesh: torusRGroup, rx: 0, ry: 0, rz: 0, floatAmp: 0.5, floatSpd: 0.5 },
      { mesh: torusR, rx: 0.001, ry: 0.0008, rz: 0.0006, floatAmp: 0, floatSpd: 0 }
    );

    // Octahedron (top right)
    const octa = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), wireMat(CYAN, 0.12));
    octa.position.set(10, 7, -5);
    octa.rotation.set(0.4, 0.2, 0.8);
    scene.add(octa);
    objects.push({ mesh: octa, rx: 0.0015, ry: 0.002, rz: 0.001, floatAmp: 0.7, floatSpd: 0.7 });

    // Only 3 scattered shapes (was 6)
    [
      { x: -10, y: -5, z: -3, c: PURPLE, s: 0.7, op: 0.12 },
      { x: 8, y: 8, z: -10, c: CYAN, s: 0.9, op: 0.09 },
      { x: 0, y: -9, z: -5, c: ORANGE, s: 0.55, op: 0.10 },
    ].forEach((s, i) => {
      const geo = i % 2 === 0 ? new THREE.IcosahedronGeometry(s.s * 1.6, 0) : new THREE.OctahedronGeometry(s.s * 1.4, 0);
      const mesh = new THREE.Mesh(geo, wireMat(s.c, s.op));
      mesh.position.set(s.x, s.y, s.z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      scene.add(mesh);
      const spd = 0.0005 + Math.random() * 0.001;
      objects.push({ mesh, rx: spd, ry: spd * 1.3, rz: spd * 0.7, floatAmp: 0.3 + Math.random() * 0.4, floatSpd: 0.3 + Math.random() * 0.4 });
    });

    // ── Particles (halved count) ────────────────────────────────────────────
    const PARTICLE_COUNT = 500;
    const pPos = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pPos[i * 3]     = (Math.random() - 0.5) * 70;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particleField = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.08, transparent: true, opacity: 0.2, sizeAttenuation: true
    }));
    scene.add(particleField);

    scene.fog = new THREE.FogExp2(0x000000, 0.022);

    // ── Input Tracking ──────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    document.addEventListener('mousemove', (e) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    // Debounced resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }, 200);
    });

    // ── Pre-cache base positions ────────────────────────────────────────────
    objects.forEach(o => { o.baseY = o.mesh.position.y; });

    // ── Animation Loop ──────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Smooth mouse lerp
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      // Camera follows mouse + gentle scroll parallax
      camera.position.x = mouse.x * 1.8;
      camera.position.y = -mouse.y * 1.2 - scrollY * 0.003;
      camera.lookAt(0, -scrollY * 0.002, 0);

      // Objects: rotate + float (no per-frame position.y += which accumulates drift)
      for (let i = 0; i < objects.length; i++) {
        const o = objects[i];
        o.mesh.rotation.x += o.rx;
        o.mesh.rotation.y += o.ry;
        o.mesh.rotation.z += o.rz;
        if (o.floatAmp > 0) {
          o.mesh.position.y = o.baseY + Math.sin(t * o.floatSpd + i * 1.3) * 0.15 * o.floatAmp;
        }
      }

      // Particle field slow rotation (cached reference, no scanning)
      particleField.rotation.y = t * 0.015;

      renderer.render(scene, camera);
    }

    setTimeout(() => { renderer.domElement.style.opacity = '0.55'; }, 400);
    animate();
  }
})();
