"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { TubGeometry } from "../calcs";

type DeflectionPoint = {
  x_in: number;
  deflection_in: number; // inches
};

type Tub3DProps = {
  tub: TubGeometry;
  bottomProfile: DeflectionPoint[];
  shortProfile: DeflectionPoint[];
  longProfile: DeflectionPoint[];
};

// Same sampling patterns as in calcs.ts
const PLATE_SAMPLE_POINTS: { u: number; v: number }[] = [
  { u: 0.05, v: 0.8 },
  { u: 1 / 3, v: 0.8 },
  { u: 2 / 3, v: 0.8 },
  { u: 0.95, v: 0.8 },

  { u: 0.15, v: 0.5 },
  { u: 0.85, v: 0.5 },

  { u: 0.05, v: 0.2 },
  { u: 1 / 3, v: 0.2 },
  { u: 2 / 3, v: 0.2 },
  { u: 0.95, v: 0.2 },

  { u: 0.5, v: 0.5 } // center
];

const SHORT_SAMPLE_POINTS_5: { u: number; v: number }[] = [
  { u: 0.05, v: 0.1 },
  { u: 0.95, v: 0.1 },
  { u: 0.5, v: 0.5 },
  { u: 0.05, v: 0.9 },
  { u: 0.95, v: 0.9 }
];

function makeTextLabel(text: string, color: string): THREE.Sprite {
  const fontSize = 64;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 256;
  canvas.height = 128;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  sprite.scale.set(0.7, 0.3, 1); // larger labels
  return sprite;
}

const Tub3D: React.FC<Tub3DProps> = ({
  tub,
  bottomProfile,
  shortProfile,
  longProfile
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Basic sizes in "world units" (feet-ish)
    const Lw = tub.L_tub_in / 12;
    const Ww = tub.W_tub_in / 12;
    const Hw = tub.H_tub_in / 12;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const width = mount.clientWidth || 800;
const height = mount.clientHeight || 560;

renderer.setSize(width, height);
mount.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  45,
  width / height,
  0.1,
  200
);

    const radius0 = Math.max(Lw, Ww, Hw) * 2;
    camera.position.set(radius0, radius0, radius0);
    camera.lookAt(0, Hw / 2, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(1, 2, 1);
    scene.add(dir);

    const tubGroup = new THREE.Group();
    scene.add(tubGroup);

    // Tub walls (wireframe box)
    const tubGeom = new THREE.BoxGeometry(Lw, Hw, Ww);
    const tubEdges = new THREE.EdgesGeometry(tubGeom);
    const tubLines = new THREE.LineSegments(
      tubEdges,
      new THREE.LineBasicMaterial({ color: 0x333333 })
    );
    tubLines.position.set(0, Hw / 2, 0);
    tubGroup.add(tubLines);

    // Water plane
    const waterDepthIn = Math.min(tub.water_freeboard_in, tub.H_tub_in);
    const waterDepthWorld = (waterDepthIn / 12);
    const waterY = waterDepthWorld; // from bottom
    const waterGeom = new THREE.PlaneGeometry(Lw * 0.98, Ww * 0.98);
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x88c8ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, waterY, 0);
    tubGroup.add(waterMesh);

    // Ground grid
    const grid = new THREE.GridHelper(Lw * 2, 20, 0xbbbbbb, 0xe0e0e0);
    grid.position.y = 0;
    tubGroup.add(grid);

    // --- Visual supports: bottom extrusions & wall posts ---
    function addSupports() {
      const supportMat = new THREE.MeshPhongMaterial({
        color: 0x777777,
        transparent: true,
        opacity: 0.4
      });

      const bottomY = 0;
      const postHeight = Hw; // full tub height
      const postSize = Math.min(Lw, Ww) * 0.03;

      // 1) Bottom transverse extrusions (beams across width)
      const nBottomRaw = tub.n_transverse ?? 0;
      const nBottom = Math.max(0, nBottomRaw);

      if (nBottom > 0) {
        const extrHeight = Hw * 0.05;
        const xPositions: number[] = [];

        if (nBottom === 1) {
          xPositions.push(0);
        } else if (nBottom === 2) {
          const left = -Lw / 2;
          xPositions.push(left + Lw / 3, left + (2 * Lw) / 3);
        } else {
          const spanLen = Lw;
          const spacingBottom = spanLen / (nBottom - 1);
          for (let i = 0; i < nBottom; i++) {
            const x = -Lw / 2 + i * spacingBottom;
            xPositions.push(x);
          }
        }

        xPositions.forEach((x) => {
          const geom = new THREE.BoxGeometry(postSize, extrHeight, Ww);
          const mesh = new THREE.Mesh(geom, supportMat);
          mesh.position.set(x, bottomY - extrHeight / 2, 0);
          tubGroup.add(mesh);
        });
      }

      // 2) Posts on long sides (front & back walls)
      const nLongRaw = tub.n_long_side_posts ?? 0;
      const nLong = Math.max(0, nLongRaw);
      if (nLong > 0) {
        const spanL = Lw;
        const spacingL = spanL / (nLong + 1);
        const zOffset = Ww / 2 + postSize / 2; // outside front/back

        for (let i = 1; i <= nLong; i++) {
          const x = -Lw / 2 + i * spacingL;
          [-zOffset, zOffset].forEach((z) => {
            const geom = new THREE.BoxGeometry(postSize, postHeight, postSize);
            const mesh = new THREE.Mesh(geom, supportMat);
            mesh.position.set(x, postHeight / 2, z);
            tubGroup.add(mesh);
          });
        }
      }

      // 3) Posts on short sides (left & right walls)
      const nShortRaw = tub.n_short_side_posts ?? 0;
      const nShort = Math.max(0, nShortRaw);
      if (nShort > 0) {
        const spanW = Ww;
        const spacingW = spanW / (nShort + 1);
        const xOffset = Lw / 2 + postSize / 2; // outside left/right

        for (let i = 1; i <= nShort; i++) {
          const z = -Ww / 2 + i * spacingW;
          [-xOffset, xOffset].forEach((x) => {
            const geom = new THREE.BoxGeometry(postSize, postHeight, postSize);
            const mesh = new THREE.Mesh(geom, supportMat);
            mesh.position.set(x, postHeight / 2, z);
            tubGroup.add(mesh);
          });
        }
      }
    }

    addSupports();

       // Helper to add deflection spheres & labels
    function addDeflectionPoints(
      profile: DeflectionPoint[],
      color: number,
      face: "bottom" | "front" | "right"
    ) {
      // work in mm so this matches the legend values exactly
      const maxDefMm = Math.max(
        ...profile.map((p) => Math.abs(p.deflection_in * 25.4)),
        1e-6
      );

      // smaller base, larger extra → more visible difference
      const baseRadius = Math.min(Lw, Ww, Hw) * 0.01;
      const extraRadius = baseRadius * 6;

      profile.forEach((p, idx) => {
        let u = 0.5;
        let v = 0.5;

        if (face === "bottom" || face === "front") {
          const uv = PLATE_SAMPLE_POINTS[idx] ?? { u: 0.5, v: 0.5 };
          u = uv.u;
          v = uv.v;
        } else {
          const uv = SHORT_SAMPLE_POINTS_5[idx] ?? { u: 0.5, v: 0.5 };
          u = uv.u;
          v = uv.v;
        }

        let x = 0;
        let y = 0;
        let z = 0;

        if (face === "bottom") {
          x = (u - 0.5) * Lw;
          y = 0.02;
          z = (v - 0.5) * Ww;
        } else if (face === "front") {
          x = (u - 0.5) * Lw;
          y = v * Hw;
          z = -Ww / 2;
        } else {
          x = Lw / 2;
          y = v * Hw;
          z = (u - 0.5) * Ww;
        }

        const defMm = Math.abs(p.deflection_in * 25.4);
        const norm = defMm / maxDefMm;
        const radius = baseRadius + norm * extraRadius;

        const geom = new THREE.SphereGeometry(radius, 16, 16);
        const mat = new THREE.MeshPhongMaterial({ color });
        const sphere = new THREE.Mesh(geom, mat);
        sphere.position.set(x, y, z);
        tubGroup.add(sphere);

        // label
        let labelText = "";
        let labelColor = "";
        if (face === "bottom") {
          labelText = `B${idx + 1}`;
          labelColor = "#660000";
        } else if (face === "front") {
          labelText = `L${idx + 1}`;
          labelColor = "#000066";
        } else {
          labelText = `S${idx + 1}`;
          labelColor = "#004400";
        }

        const label = makeTextLabel(labelText, labelColor);
        label.position.set(x + radius * 1.5, y + radius * 1.5, z);
        tubGroup.add(label);
      });
    }


    // Add bottom, short, long points
    addDeflectionPoints(bottomProfile, 0xcc0000, "bottom");
    addDeflectionPoints(longProfile, 0x0000cc, "front");
    addDeflectionPoints(shortProfile, 0x008800, "right");

    // Simple mouse controls (rotate + pan + wheel zoom)
    let isDragging = false;
    let isPanning = false;
    let prevX = 0;
    let prevY = 0;
    let currentRadius = radius0;

    const center = new THREE.Vector3(0, Hw / 2, 0);

    function updateCameraFromAngles(theta: number, phi: number) {
      const r = currentRadius;
      const x = center.x + r * Math.sin(phi) * Math.cos(theta);
      const y = center.y + r * Math.cos(phi);
      const z = center.z + r * Math.sin(phi) * Math.sin(theta);
      camera.position.set(x, y, z);
      camera.lookAt(center);
    }

    let theta = Math.PI / 4;
    let phi = Math.PI / 4;

    updateCameraFromAngles(theta, phi);

    const onMouseDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }
      event.preventDefault();
      if (event.button === 2 || event.ctrlKey) {
        isPanning = true;
      } else {
        isDragging = true;
      }
      prevX = event.clientX;
      prevY = event.clientY;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging && !isPanning) return;
      const dx = event.clientX - prevX;
      const dy = event.clientY - prevY;
      prevX = event.clientX;
      prevY = event.clientY;

      if (isDragging) {
        const rotSpeed = 0.005;
        theta -= dx * rotSpeed;
        phi -= dy * rotSpeed;
        const eps = 0.1;
        phi = Math.max(eps, Math.min(Math.PI - eps, phi));
        updateCameraFromAngles(theta, phi);
      } else if (isPanning) {
        const panSpeed = 0.002 * currentRadius;
        const offsetX = -dx * panSpeed;
        const offsetY = dy * panSpeed;
        center.x += offsetX;
        center.y += offsetY;
        updateCameraFromAngles(theta, phi);
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      isPanning = false;
    };

    const onWheel = (event: WheelEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }
      event.preventDefault();
      const delta = event.deltaY;
      const zoomFactor = 1.05;
      if (delta > 0) {
        currentRadius *= zoomFactor;
      } else {
        currentRadius /= zoomFactor;
      }
      currentRadius = Math.max(
        Math.max(Lw, Ww, Hw) * 0.8,
        Math.min(currentRadius, Math.max(Lw, Ww, Hw) * 10)
      );
      updateCameraFromAngles(theta, phi);
    };

    const canvas = renderer.domElement;

canvas.addEventListener("mousedown", onMouseDown);
canvas.addEventListener("mousemove", onMouseMove);
canvas.addEventListener("mouseup", onMouseUp);
canvas.addEventListener("mouseleave", onMouseUp);
canvas.addEventListener("wheel", onWheel, { passive: false });


    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      const canvas = renderer.domElement;
canvas.removeEventListener("mousedown", onMouseDown);
canvas.removeEventListener("mousemove", onMouseMove);
canvas.removeEventListener("mouseup", onMouseUp);
canvas.removeEventListener("mouseleave", onMouseUp);
canvas.removeEventListener("wheel", onWheel);
mount.removeChild(canvas);

    };
  }, [tub, bottomProfile, shortProfile, longProfile]);

  return (
  <div
    ref={mountRef}
    className="tub3d-root"
    style={{
      width: "100%",
      height: "100%",
      border: "1px solid #ddd",
      borderRadius: 8,
      overflow: "hidden",
      background: "#ffffff"
    }}
  />
);
};

export default Tub3D;
