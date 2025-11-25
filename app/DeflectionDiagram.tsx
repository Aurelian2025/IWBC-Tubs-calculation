"use client";

import React from "react";
import { TubGeometry, FrameGeometry } from "../calcs";

type BottomResult = {
  span: number;
  w_strip: number;
  M_max: number;
  delta_max: number;
  sigma_max: number;
};

type ExtrResult = {
  span: number;
  w: number;
  M_max: number;
  delta_max: number;
  sigma_max: number;
};

export default function DeflectionDiagram({
  tub,
  frame,
  bottom,
  extr
}: {
  tub: TubGeometry;
  frame: FrameGeometry;
  bottom: BottomResult;
  extr: ExtrResult;
}) {
  const width = 600;
  const height = 380;
  const margin = 20;

  // Basic “3D” scaling – not physically exact, but proportional
  const kWidth = 4;      // px per inch for tub width
  const kDepth = 2.4;    // px per inch for tub length
  const kHeight = 3;     // px per inch for tub height

  const tubWpx = tub.W_tub_in * kWidth;
  const tubDpx = tub.L_tub_in * kDepth;
  const tubHpx = tub.H_tub_in * kHeight;

  // Clamp so it fits reasonably in the SVG
  const maxTubW = 260;
  const scaleFactor = Math.min(1, maxTubW / tubWpx);
  const W = tubWpx * scaleFactor;
  const D = tubDpx * scaleFactor;
  const H = tubHpx * scaleFactor;

  // “Iso” view base point for front–left top corner
  const baseX = margin + 80;
  const baseY = margin + 80;

  // Depth direction: goes up+right
  const depthDx = D;
  const depthDy = -D * 0.5;

  // Width direction: purely right
  const widthDx = W;
  const widthDy = 0;

  // Height direction: purely down
  const heightDx = 0;
  const heightDy = H;

  // Top rectangle of tub (4 corners)
  const TFL = { x: baseX, y: baseY }; // Top Front Left
  const TFR = { x: baseX + widthDx, y: baseY + widthDy }; // Top Front Right
  const TBL = { x: baseX + depthDx, y: baseY + depthDy }; // Top Back Left
  const TBR = {
    x: baseX + depthDx + widthDx,
    y: baseY + depthDy + widthDy
  }; // Top Back Right

  // Bottom of front and side faces
  const BFL = { x: TFL.x + heightDx, y: TFL.y + heightDy }; // Bottom Front Left
  const BFR = { x: TFR.x + heightDx, y: TFR.y + heightDy }; // Bottom Front Right
  const BBL = { x: TBL.x + heightDx, y: TBL.y + heightDy }; // Bottom Back Left
  const BBR = { x: TBR.x + heightDx, y: TBR.y + heightDy }; // Bottom Back Right

  // Deflection intensities: vessel (bottom/walls) vs frame (extrusions)
  const eps = 1e-9;
  const maxDef = Math.max(bottom.delta_max, extr.delta_max, eps);

  const vesselIntensity = bottom.delta_max / maxDef;
  const frameIntensity = extr.delta_max / maxDef;

  const faceColor = (i: number) => {
    const clamped = Math.max(0, Math.min(1, i));
    const r = 255;
    const g = Math.round(220 * (1 - clamped));
    const b = Math.round(220 * (1 - clamped));
    return `rgb(${r},${g},${b})`; // light pink → strong red
  };

  const vesselColor = faceColor(vesselIntensity);
  const frameColor = faceColor(frameIntensity);

  // Helper to make string for polygon
  const poly = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(" ");

  // For visual clarity: we will color
  // - front & side faces based on vessel deflection (MDF walls/bottom)
  // - a “frame band” at the bottom edge based on frame deflection
  const frontFace = [TFL, TFR, BFR, BFL];
  const sideFace = [TFR, TBR, BBR, BFR];
  const topFace = [TBL, TBR, TFR, TFL];

  // Frame band approximated as a strip just below the tub bottom (front edge)
  const frameBandHeight = 10;
  const FBL = { x: BFL.x, y: BFL.y + frameBandHeight };
  const FBR = { x: BFR.x, y: BFR.y + frameBandHeight };
  const frameBandFront = [BFL, BFR, FBR, FBL];

  // Position for labels
  const labelVesselX = baseX + widthDx + 60;
  const labelVesselY = baseY + 40;
  const labelFrameX = baseX + widthDx + 60;
  const labelFrameY = baseY + 80;

  return (
    <svg width={width} height={height}>
      {/* Top face outline for context (light) */}
      <polygon
        points={poly(topFace)}
        fill="none"
        stroke="#888"
        strokeWidth={1}
      />

      {/* Side face (vessel) */}
      <polygon
        points={poly(sideFace)}
        fill={vesselColor}
        stroke="#333"
        strokeWidth={1.5}
      />

      {/* Front face (vessel) */}
      <polygon
        points={poly(frontFace)}
        fill={vesselColor}
        stroke="#333"
        strokeWidth={1.5}
      />

      {/* Frame band at bottom front (frame deflection) */}
      <polygon
        points={poly(frameBandFront)}
        fill={frameColor}
        stroke="#333"
        strokeWidth={1}
      />

      {/* Max bottom deflection marker (center-ish of box bottom) */}
      <circle
        cx={(BFL.x + BFR.x + BBL.x + BBR.x) / 4}
        cy={(BFL.y + BFR.y + BBL.y + BBR.y) / 4}
        r={6}
        fill="blue"
      />
      <text
        x={(BFL.x + BFR.x + BBL.x + BBR.x) / 4 + 8}
        y={(BFL.y + BFR.y + BBL.y + BBR.y) / 4 + 4}
        fontSize={11}
        fill="blue"
      >
        vessel max δ
      </text>

      {/* Simple legend */}
      <rect
        x={labelVesselX}
        y={labelVesselY - 10}
        width={18}
        height={12}
        fill={vesselColor}
        stroke="#333"
        strokeWidth={0.5}
      />
      <text x={labelVesselX + 24} y={labelVesselY} fontSize={11} fill="#222">
        Vessel deflection: {bottom.delta_max.toFixed(5)} in
      </text>

      <rect
        x={labelFrameX}
        y={labelFrameY - 10}
        width={18}
        height={12}
        fill={frameColor}
        stroke="#333"
        strokeWidth={0.5}
      />
      <text x={labelFrameX + 24} y={labelFrameY} fontSize={11} fill="#222">
        Frame deflection: {extr.delta_max.toFixed(5)} in
      </text>

      <text
        x={margin}
        y={height - margin}
        fontSize={11}
        fill="#555"
      >
        Color intensity shows relative deflection: redder = larger. Front & side faces = vessel, bottom band = frame.
      </text>
    </svg>
  );
}
