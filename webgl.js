/**
 * webgl.js — Advanced Awwwards-Style WebGL Background
 * Interactive Particle Wave / Digital Terrain
 */
(function () {
  'use strict';

  if (window.innerWidth < 768) return;

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  script.onload = bootScene;
  document.head.appendChild(script);

  function bootScene() {
    if (typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap for perf but keep crisp
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100dvh;z-index:0;pointer-events:none;opacity:0;transition:opacity 2.5s cubic-bezier(0.19, 1, 0.22, 1)';
    document.body.insertBefore(renderer.domElement, document.body.firstChild);
    document.body.style.background = '#000';

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.004);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 80, 200);

    // ── Advanced Particle Wave (Digital Terrain) ────────────────────────────
    const SEPARATION = 4, AMOUNTX = 150, AMOUNTY = 100;
    const numParticles = AMOUNTX * AMOUNTY;
    const positions = new Float32Array(numParticles * 3);
    const scales = new Float32Array(numParticles);

    let i = 0, j = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions[i] = ix * SEPARATION - ((AMOUNTX * SEPARATION) / 2); // x
        positions[i + 1] = 0; // y (will be animated)
        positions[i + 2] = iy * SEPARATION - ((AMOUNTY * SEPARATION) / 2); // z
        scales[j] = 1;
        i += 3;
        j++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Custom Shader Material for dynamic particle sizing and fading
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        attribute float scale;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = scale * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        void main() {
          if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
          gl_FragColor = vec4(color, 0.15);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ── Input & Scroll Tracking ──────────────────────────────────────────────
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    document.addEventListener('mousemove', (e) => {
      mouse.tx = (e.clientX - window.innerWidth / 2) * 0.05;
      mouse.ty = (e.clientY - window.innerHeight / 2) * 0.05;
    }, { passive: true });

    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Animation Loop ──────────────────────────────────────────────────────
    let count = 0;

    function animate() {
      requestAnimationFrame(animate);

      // Smooth mouse lerp
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      // Parallax camera
      camera.position.x += (mouse.x - camera.position.x) * 0.05;
      camera.position.y += (-mouse.y + 60 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      // Animate wave
      const positionsAttr = particles.geometry.attributes.position;
      const scalesAttr = particles.geometry.attributes.scale;
      let idx = 0;
      let sIdx = 0;

      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          // Dynamic sine wave math
          positionsAttr.array[idx + 1] = 
            (Math.sin((ix + count) * 0.3) * 15) + 
            (Math.sin((iy + count) * 0.5) * 15);
          
          scalesAttr.array[sIdx] = 
            (Math.sin((ix + count) * 0.3) + 1) * 2 + 
            (Math.sin((iy + count) * 0.5) + 1) * 2;

          // Push down based on scroll
          positionsAttr.array[idx + 1] -= scrollY * 0.05;

          idx += 3;
          sIdx++;
        }
      }

      positionsAttr.needsUpdate = true;
      scalesAttr.needsUpdate = true;

      count += 0.05;

      renderer.render(scene, camera);
    }

    setTimeout(() => { renderer.domElement.style.opacity = '0.7'; }, 400);
    animate();
  }
})();
