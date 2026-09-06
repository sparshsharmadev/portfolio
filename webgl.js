/**
 * webgl.js — Advanced Interactive Particle Field
 * Reacts dynamically to mouse cursor using Raycasting & Custom Shaders
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100dvh;z-index:0;pointer-events:none;opacity:0;transition:opacity 2.5s cubic-bezier(0.19, 1, 0.22, 1)';
    document.body.insertBefore(renderer.domElement, document.body.firstChild);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.002);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 0, 300);

    // ── Particle System Setup ──────────────────────────────────────────────
    const AMOUNT = 4000;
    const positions = new Float32Array(AMOUNT * 3);
    const originalPositions = new Float32Array(AMOUNT * 3);
    const sizes = new Float32Array(AMOUNT);
    const randoms = new Float32Array(AMOUNT);

    for (let i = 0; i < AMOUNT; i++) {
      const i3 = i * 3;
      // Spread in a large 3D volume
      const x = (Math.random() - 0.5) * 1000;
      const y = (Math.random() - 0.5) * 800;
      const z = (Math.random() - 0.5) * 500;
      
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      originalPositions[i3] = x;
      originalPositions[i3 + 1] = y;
      originalPositions[i3 + 2] = z;

      sizes[i] = Math.random() * 2.5 + 0.5;
      randoms[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aOriginalPosition', new THREE.BufferAttribute(originalPositions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    // Custom Shader with Mouse Repulsion Math
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3(9999, 9999, 9999) },
        uColor1: { value: new THREE.Color(0x7c5cfc) }, // Purple accent
        uColor2: { value: new THREE.Color(0x67e8f9) }  // Cyan accent
      },
      vertexShader: `
        uniform float uTime;
        uniform vec3 uMouse;
        
        attribute float aSize;
        attribute vec3 aOriginalPosition;
        attribute float aRandom;
        
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          
          // Gentle floating animation
          pos.y += sin(uTime * 0.5 + aRandom * 10.0) * 15.0;
          pos.x += cos(uTime * 0.3 + aRandom * 10.0) * 10.0;
          
          // Mouse Repulsion Logic
          float dist = distance(pos, uMouse);
          float maxDist = 150.0;
          
          if(dist < maxDist) {
            vec3 dir = normalize(pos - uMouse);
            // Repel force falls off with distance
            float force = (maxDist - dist) / maxDist;
            pos += dir * force * 50.0;
          }
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          // Mix colors based on z-depth and random
          vColor = mix(vec3(0.5, 0.5, 0.5), vec3(0.8, 0.8, 0.8), aRandom);
          
          // Highlight particles near the mouse with accent colors
          float influence = smoothstep(maxDist * 1.5, 0.0, dist);
          vec3 accent = mix(vec3(0.48, 0.36, 0.98), vec3(0.40, 0.90, 0.97), aRandom); // Purple to Cyan
          vColor = mix(vColor, accent, influence * 0.8);
          
          vAlpha = smoothstep(0.0, 100.0, -mvPosition.z) * 0.7; // Fade out close particles
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          // Soft circle shape
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = (0.5 - dist) * 2.0 * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ── Input Tracking & Raycasting ──────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse2D = new THREE.Vector2(-999, -999);
    
    // Invisible plane at Z=0 to catch raycasts for the mouse 3D position
    const planeGeo = new THREE.PlaneGeometry(3000, 3000);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    scene.add(plane);

    document.addEventListener('mousemove', (e) => {
      mouse2D.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse2D.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }, { passive: true });

    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Animation Loop ──────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      
      const time = clock.getElapsedTime();
      material.uniforms.uTime.value = time;

      // Raycast to find 3D mouse position on the invisible plane
      raycaster.setFromCamera(mouse2D, camera);
      const intersects = raycaster.intersectObject(plane);
      
      if (intersects.length > 0) {
        // Smoothly lerp the uniform mouse position towards the actual intersection point
        material.uniforms.uMouse.value.lerp(intersects[0].point, 0.1);
      } else {
        // Move it away if mouse is off-screen
        material.uniforms.uMouse.value.lerp(new THREE.Vector3(0, 0, 1000), 0.05);
      }

      // Parallax camera slightly on scroll
      camera.position.y = -scrollY * 0.15;
      camera.lookAt(0, -scrollY * 0.1, 0);

      renderer.render(scene, camera);
    }

    setTimeout(() => { renderer.domElement.style.opacity = '1'; }, 400);
    animate();
  }
})();
