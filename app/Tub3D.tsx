"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
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
  { u: 0.95, v: 0.20 },
  { u: 0.50, v: 0.50 }
];
const SHORT_SAMPLE_POINTS_5: { u: number; v: number }[] = [
  { u: 0.05, v: 0.10 },
  { u: 0.95, v: 0.10 },
  { u: 0.50, v: 0.50 },
  { u: 0.05, v: 0.90 },
  { u: 0.95, v: 0.90 }
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
    const height = 800;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f8f8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    const Lw = tub.L_tub_in * INCH_TO_WORLD;
    const Ww = tub.W_tub_in * INCH_TO_WORLD;
    const Hw = tub.H_tub_in * INCH_TO_WORLD;

    const initialRadius = Math.max(Lw, Ww, Hw) * 3;
    camera.position.set(initialRadius, initialRadius, initialRadius);
    camera.lookAt(0, Hw / 2, 0);

    // Simple manual "orbit": rotate a group instead of camera controls
    const tubGroup = new THREE.Group();
    scene.add(tubGroup);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(1, 2, 1);
    scene.add(dir);

  function makeTextLabel(text: string, color: string): THREE.Sprite {
  const fontSize = 64;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 256;
  canvas.height = 128;

  // Transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw text using the passed color
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.05
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.35, 0.15, 1); // world size
  return sprite;
}


    // Tub wireframe (inner volume)
    const boxGeom = new THREE.BoxGeometry(Lw, Hw, Ww);
    const edges = new THREE.EdgesGeometry(boxGeom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x333333 });
    const box = new THREE.LineSegments(edges, lineMat);
    box.position.set(0, Hw / 2, 0);
    tubGroup.add(box);

    // Water surface plane
    const hWaterIn = Math.min(tub.water_freeboard_in, tub.H_tub_in);
    const hWaterWorld = hWaterIn * INCH_TO_WORLD;
    const waterFrac = Math.max(0, Math.min(1, hWaterWorld / Hw));
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
    tubGroup.add(water);

    // Floor grid (optional)
    const grid = new THREE.GridHelper(Lw * 2, 20, 0xbbbbbb, 0xe0e0e0);
    grid.position.y = 0;
    tubGroup.add(grid);

    // Helper for spheres on each face
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
    let uv;
    if (face === "right") {
      // short side: 5-point layout
      uv =
        SHORT_SAMPLE_POINTS_5[idx] ??
        SHORT_SAMPLE_POINTS_5[SHORT_SAMPLE_POINTS_5.length - 1];
    } else {
      // bottom and long side (front) use the 10-point pattern
      uv =
        PLATE_SAMPLE_POINTS[idx] ??
        PLATE_SAMPLE_POINTS[PLATE_SAMPLE_POINTS.length - 1];
    }

    const u = uv.u;
    const v = uv.v;

    let x = 0,
      y = 0,
      z = 0;

    if (face === "bottom") {
      x = (u - 0.5) * Lw;
      z = (v - 0.5) * Ww;
      y = 0;
    } else if (face === "front") {
      x = (u - 0.5) * Lw;
      y = v * Hw;
      z = -Ww / 2;
    } else if (face === "right") {
      x = Lw / 2;
      y = v * Hw;
      z = (u - 0.5) * Ww;
    }

        const frac = Math.abs(p.deflection_in) / maxDef;
        const radius = 0.02 * (1 + 2 * frac) * Math.max(Lw, Ww, Hw);

        const geom = new THREE.SphereGeometry(radius, 16, 16);
        const mat = new THREE.MeshPhongMaterial({ color });
        const sphere = new THREE.Mesh(geom, mat);
        sphere.position.set(x, y, z);
        tubGroup.add(sphere);
        // ADD LABEL HERE
const label = makeTextLabel(
  face === "bottom"
    ? `B${idx + 1}`
    : face === "front"
    ? `L${idx + 1}`
    : `S${idx + 1}`
);
label.position.set(x + radius * 1.5, y + radius * 1.5, z);
tubGroup.add(label);
      });
    }

        // Add points: Bottom (red), Long/front (blue), Short/right (green)
    addDeflectionPoints(bottomProfile, 0xdd0000, "bottom");
    addDeflectionPoints(longProfile, 0x0000dd, "front");
    addDeflectionPoints(shortProfile, 0x00aa00, "right");

    // Manual rotation & zoom
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let currentRadius = initialRadius;

    const onMouseDown = (event: MouseEvent) => {
      isDragging = true;
      prevX = event.clientX;
      prevY = event.clientY;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      const dx = event.clientX - prevX;
      const dy = event.clientY - prevY;
      prevX = event.clientX;
      prevY = event.clientY;

      const rotSpeed = 0.005;
      tubGroup.rotation.y += dx * rotSpeed;
      tubGroup.rotation.x += dy * rotSpeed;
      tubGroup.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, tubGroup.rotation.x)
      );
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (event: WheelEvent) => {
      const delta = event.deltaY;
      const zoomFactor = 1.05;
      if (delta > 0) {
        currentRadius *= zoomFactor;
      } else {
        currentRadius /= zoomFactor;
      }
      const dir = new THREE.Vector3(
        camera.position.x,
        camera.position.y,
        camera.position.z
      )
        .sub(new THREE.Vector3(0, Hw / 2, 0))
        .normalize();
      camera.position.copy(
        new THREE.Vector3(0, Hw / 2, 0).add(dir.multiplyScalar(currentRadius))
      );
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
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
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [tub, bottomProfile, shortProfile, longProfile]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: 800,
        border: "1px solid #ccc",
        borderRadius: 8,
        overflow: "hidden"
      }}
    />
  );
}
