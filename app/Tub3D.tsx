"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TubGeometry } from "../calcs";

type DeflectionPoint = {
  x_in: number;
  deflection_in: number;
};

// Must match the pattern used in calcs.ts (index order B1…B10 etc.)
const PLATE_SAMPLE_POINTS: { u: number; v: number }[] = [
  { u: 0.05, v: 0.80 },
  { u: 1 / 3, v: 0.80 },
  { u: 2 / 3, v: 0.80 },
  { u: 0.95, v: 0.80 },

  { u: 0.15, v: 0.50 },
  { u: 0.85, v: 0.50 },

  { u: 0.05, v: 0.20 },
  { u: 1 / 3, v: 0.20 },
  { u: 2 / 3, v: 0.20 },
  { u: 0.95, v: 0.20 }
];

type Tub3DProps = {
  tub: TubGeometry;
  bottomProfile: DeflectionPoint[];
  shortProfile: DeflectionPoint[];
  longProfile: DeflectionPoint[];
};

const INCH_TO_WORLD = 0.1; // 10 inches = 1 Three.js unit

export default function Tub3D({
  tub,
  bottomProfile,
  shortProfile,
  longProfile
}: Tub3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f8f8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    const Lw = tub.L_tub_in * INCH_TO_WORLD;
    const Ww = tub.W_tub_in * INCH_TO_WORLD;
    const Hw = tub.H_tub_in * INCH_TO_WORLD;

    camera.position.set(Lw * 1.3, Hw * 1.4, Ww * 1.6);
    camera.lookAt(0, Hw / 2, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.9;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(1, 2, 1);
    scene.add(dir);

    // Tub wireframe (inner volume)
    const boxGeom = new THREE.BoxGeometry(Lw, Hw, Ww);
    const edges = new THREE.EdgesGeometry(boxGeom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x333333 });
    const box = new THREE.LineSegments(edges, lineMat);
    box.position.set(0, Hw / 2, 0);
    scene.add(box);

    // Water surface plane
    const hWater = Math.min(tub.water_freeboard_in, tub.H_tub_in) * INCH_TO_WORLD;
    const waterFrac = Math.max(0, Math.min(1, hWater / Hw));
    const waterY = waterFrac * Hw;

    const waterGeom = new THREE.PlaneGeometry(Lw, Ww);
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x82a9ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, waterY, 0);
    scene.add(water);

    // Grid/help floor (optional)
    const grid = new THREE.GridHelper(Lw * 2, 20, 0xbbbbbb, 0xe0e0e0);
    // Move grid to tub bottom plane
    grid.position.y = 0;
    scene.add(grid);

    // Helper for spheres
    function addDeflectionPoints(
      profile: DeflectionPoint[],
      color: number,
      face: "bottom" | "front" | "right"
    ) {
      const maxDef =
        profile.reduce(
          (m, p) => Math.max(m, Math.abs(p.deflection_in)),
          1e-6
        ) || 1e-6;

      profile.forEach((p, idx) => {
        const uv = PLATE_SAMPLE_POINTS[idx] ??
          PLATE_SAMPLE_POINTS[PLATE_SAMPLE_POINTS.length - 1];
        const u = uv.u;
        const v = uv.v;

        let x = 0, y = 0, z = 0;

        if (face === "bottom") {
          // bottom plate: x along length, z along width, y = 0
          x = (u - 0.5) * Lw;
          z = (v - 0.5) * Ww;
          y = 0;
        } else if (face === "front") {
          // front wall: x along length, y along height, z = -Ww/2
          x = (u - 0.5) * Lw;
          y = v * Hw;
          z = -Ww / 2;
        } else if (face === "right") {
          // right wall: z along width, y along height, x = Lw/2
          x = Lw / 2;
          y = v * Hw;
          z = (u - 0.5) * Ww;
        }

        const frac = Math.abs(p.deflection_in) / maxDef;
        const radius = 0.02 * (1 + 2 * frac) * Lw; // scale radius with L

        const geom = new THREE.SphereGeometry(radius, 16, 16);
        const mat = new THREE.MeshPhongMaterial({ color });
        const sphere = new THREE.Mesh(geom, mat);
        sphere.position.set(x, y, z);
        scene.add(sphere);
      });
    }

    // Bottom (red), short/front (green), long/right (blue)
    addDeflectionPoints(bottomProfile, 0xdd0000, "bottom");
    addDeflectionPoints(shortProfile, 0x00aa00, "front");
    addDeflectionPoints(longProfile, 0x0000dd, "right");

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const newWidth = mount.clientWidth || width;
      const newHeight = height;
      renderer.setSize(newWidth, newHeight);
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [tub, bottomProfile, shortProfile, longProfile]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: 420,
        border: "1px solid #ccc",
        borderRadius: 8,
        overflow: "hidden"
      }}
    />
  );
}
