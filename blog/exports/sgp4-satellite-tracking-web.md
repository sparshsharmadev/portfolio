---
title: "Tracking 250+ Satellites at 60fps: The Math Behind OrbitVoyage | Sparsh Sharma"
description: "How I built OrbitVoyage — a real-time satellite tracking dashboard performing 2,400 SGP4 propagations per second in the browser. Orbital mechanics, WebGL rendering, and the 16ms frame budget."
---

Architecture / Astrophysics

# Tracking 250+ Satellites at 60fps: The Math Behind OrbitVoyage

How I built a real-time satellite tracking dashboard that performs 2,400 SGP4 propagations per second — all inside a browser. Orbital mechanics, WebGL rendering, and the 16ms frame budget that controls everything.

![Sparsh Sharma - Full-Stack Developer and AI Engineer](../assets/images/pfp.jpeg) Sparsh Sharma

July 20, 2026 14 min read

## The Problem

I wanted to build something that pushed beyond typical web development — something that required real math, real data pipelines, and real-time rendering constraints. Satellite tracking was the answer.

The challenge: take raw Two-Line Element (TLE) data from NORAD/CelesTrak, propagate orbital positions using the SGP4 algorithm, detect potential collision events, and render everything on a 3D WebGL globe — all within a 16ms frame budget to maintain 60fps. In the browser. On consumer hardware.

## TLE Data & SGP4

Every tracked object in orbit has a **Two-Line Element set** — a compact data format maintained by the US Space Command. It looks like this:

```
ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9025
2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391271780
```

These two lines encode everything needed to compute the satellite's position at any point in time: inclination, eccentricity, mean anomaly, argument of perigee, RAAN (Right Ascension of Ascending Node), and mean motion. The SGP4 algorithm takes these orbital elements and **propagates** them forward through time, accounting for atmospheric drag, Earth's oblateness (J2 perturbation), and gravitational harmonics.

SGP4 isn't a simple formula — it's a multi-step numerical propagator with deep-space corrections for objects above 225 minutes orbital period. I used the `satellite.js` library, which is a faithful JavaScript port of the original FORTRAN implementation.

## The Orbital Math

The core propagation pipeline for each satellite, each frame:

```
function propagateSatellite(tle, timestamp) {
  // Parse TLE into a satellite record
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
  
  // Propagate to target time → ECI coordinates
  const posVel = satellite.propagate(satrec, timestamp);
  const eci = posVel.position; // {x, y, z} in km
  
  // ECI → geodetic (lat/lon/altitude)
  const gmst = satellite.gstime(timestamp);
  const geo = satellite.eciToGeodetic(eci, gmst);
  
  return {
    lat: satellite.degreesLat(geo.latitude),
    lon: satellite.degreesLong(geo.longitude),
    alt: geo.height, // km above Earth's surface
    velocity: posVel.velocity // km/s
  };
}
```

The tricky part: the ECI (Earth-Centered Inertial) frame doesn't rotate with the Earth. To place a satellite on a globe, you need to convert to the ECEF (Earth-Centered Earth-Fixed) frame using the Greenwich Mean Sidereal Time (GMST). Getting this conversion wrong means your satellites drift across the globe in a slow spiral — a bug I chased for hours.

## The 16ms Frame Budget

At 60fps, each frame has exactly **16.67ms** to complete. My budget breakdown:

*   **SGP4 propagation (250 satellites):** ~4ms
*   **Coordinate transforms (ECI → geodetic → 3D):** ~1ms
*   **Conjunction detection:** ~2ms
*   **Three.js scene update:** ~1ms
*   **WebGL render call:** ~4ms
*   **Buffer:** ~4ms for garbage collection spikes

Total: ~12ms, leaving a 4ms buffer. This was tight. I had to optimize aggressively:

*   **Object pooling:** Pre-allocated position vectors and reused them every frame. Zero per-frame allocations eliminated GC pauses entirely.
*   **Staggered propagation:** Not all 250 satellites need to be updated every frame. Distant/slow satellites update every 2-3 frames. Only the ISS and critical objects update every frame.
*   **GPU instancing:** Instead of 250 individual meshes, I used `THREE.InstancedMesh` — one draw call for all satellites. The GPU handles the per-instance transforms.

Performance Insight

The single biggest performance win wasn't algorithmic — it was eliminating per-frame object allocation. JavaScript's garbage collector can cause 10-20ms pauses that blow the entire frame budget. Object pooling brought my worst-case frame time from 28ms to 11ms.

## WebGL Globe Rendering

The 3D globe uses Three.js with custom shaders. The Earth sphere has a high-resolution texture mapped with proper UV coordinates. I added atmospheric glow using a second, slightly larger sphere with a custom fragment shader that fades from a blue tint to transparent at the edges.

Satellite positions (in geodetic coordinates) are converted to 3D Cartesian coordinates on the globe surface:

```
function geoTo3D(lat, lon, alt, globeRadius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const r = globeRadius + (alt / 6371) * globeRadius;
  
  return {
    x: -(r * Math.sin(phi) * Math.cos(theta)),
    y:   r * Math.cos(phi),
    z:   r * Math.sin(phi) * Math.sin(theta)
  };
}
```

Each satellite is represented as a point in an instanced mesh. On hover, a radial overlay panel displays telemetry data: orbital period, altitude, velocity, inclination, and the raw TLE data.

## Conjunction Detection

A **conjunction** is when two objects pass dangerously close in orbit. This is a real problem — the ISS regularly performs debris avoidance maneuvers. OrbitVoyage computes conjunction risk in real-time.

The brute-force approach (checking every pair) is O(n²) — for 250 satellites, that's 31,250 distance calculations per frame. I optimized this with **spatial hashing**: dividing orbital space into grid cells and only checking pairs within the same or adjacent cells. This brought the average comparison count down to ~800 per frame.

When two objects come within a configurable threshold (default: 10km), the system fires a conjunction alert with the time of closest approach (TCA), miss distance, and relative velocity.

## Timeline Scrubbing

OrbitVoyage supports timeline scrubbing at 5x to 60x speed. This means instead of propagating to "now", the system propagates to `now + (elapsed * speed_multiplier)`. At 60x speed, one second of wall-clock time equals one minute of orbital time.

The challenge here is that SGP4 accuracy degrades as you propagate further from the TLE epoch. TLE sets are typically valid for 1-2 weeks. At 60x speed, you can easily exceed that window. I added visual indicators showing propagation confidence — green within epoch ±7 days, yellow at ±14 days, red beyond that.

## Kalman Filtering

Raw SGP4 output has inherent noise — the algorithm is an analytical approximation, not a numerical integrator. For the telemetry display, I pass the position and velocity through a **Kalman filter** to smooth the output.

The Kalman filter maintains a state estimate and uncertainty. Each new SGP4 propagation is treated as a "measurement" that updates the estimate. The result is telemetry that doesn't jitter between frames, which is critical for readable velocity and altitude readouts.

## Takeaways

Building OrbitVoyage taught me that the most interesting engineering problems live at the intersection of domains. This project required orbital mechanics, real-time rendering, performance optimization, and data visualization — all in a browser.

The web platform is dramatically more capable than people think. You can run real-time physics simulations, render 3D scenes at 60fps, and process thousands of mathematical operations per frame — all in vanilla JavaScript and WebGL. The constraint isn't the platform; it's knowing how to use it.

Check it out live at [orbitvoyage.vercel.app](https://orbitvoyage.vercel.app).