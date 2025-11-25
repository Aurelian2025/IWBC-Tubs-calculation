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

const INCH_TO_MM = 25.4;

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
  const svgWidth = 720;
  const svgHeight = 420;
  const margin = 30;

  // "3D" scaling – we map tub dimensions to a pseudo-isometric view.
  const kLength = 3.2; // px per inch along tub length
  const kWidth = 2.0;  // px per inch along tub width (depth direction)
  const kHeight = 3.0; // px per inch vertically

  // Base unscaled sizes
  let Lpx = tub.L_tub_in * kLength;
  let Wpx = tub.W_tub_in * kWidth;
  let Hpx = tub.H_tub_in * kHeight;

  // Fit into viewport
  const maxL = svgWidth - 2 * margin - 150;
  const maxH = svgHeight - 2 * margin - 40;
  const scale = Math.min(
    1,
    maxL / Lpx,
    maxH / (Hpx + Wpx * 0.5) // rough box height including "depth"
  );

  Lpx *= scale;
  Wpx *= scale;
  Hpx *= scale;

  // Base origin for the front-left top corner of tub
  const baseX = margin + 80;
  const baseY = margin + 60;

  // Isometric-ish axes:
  // - length (L) goes right
  // - width (W) goes up+right (depth)
  // - height (H) goes down
  const Ldx = Lpx;
  const Ldy = 0;

  const Wdx = Wpx;
  const Wdy = -Wpx * 0.5;

  const Hdx = 0;
  const Hdy = Hpx;

  // Top outer corners of tub (shell)
  const TFL = { x: baseX, y: baseY }; // Top Front Left
  const TFR = { x: baseX + Ldx, y: baseY + Ldy }; // Top Front Right
  const TBL = { x: baseX + Wdx, y: baseY + Wdy }; // Top Back Left
  const TBR = { x: baseX + Wdx + Ldx, y: baseY + Wdy + Ldy }; // Top Back Right

  // Bottom outer corners
  const BFL = { x: TFL.x + Hdx, y: TFL.y + Hdy };
  const BFR = { x: TFR.x + Hdx, y: TFR.y + Hdy };
  const BBL = { x: TBL.x + Hdx, y: TBL.y + Hdy };
  const BBR = { x: TBR.x + Hdx, y: TBR.y + Hdy };

  // Inner offset to show wall thickness visually (purely cosmetic)
  const wallOffset = 4;
  const iTFL = { x: TFL.x + wallOffset, y: TFL.y + wallOffset };
  const iTFR = { x: TFR.x - wallOffset, y: TFR.y + wallOffset };
  const iTBL = { x: TBL.x + wallOffset, y: TBL.y + wallOffset };
  const iTBR = { x: TBR.x - wallOffset, y: TBR.y + wallOffset };

  const iBFL = { x: BFL.x + wallOffset, y: BFL.y - wallOffset };
  const iBFR = { x: BFR.x - wallOffset, y: BFR.y - wallOffset };
  const iBBL = { x: BBL.x + wallOffset, y: BBL.y - wallOffset };
  const iBBR = { x: BBR.x - wallOffset, y: BBR.y - wallOffset };

  // Water volume inside: we approximate as a horizontal plane at the right height
  const h_water_in = tub.H_tub_in - tub.water_freeboard_in;
  const waterFrac = Math.max(0, Math.min(1, h_water_in / tub.H_tub_in));
  const waterDrop = Hpx * waterFrac;

  const wTFL = { x: iTFL.x, y: iTFL.y + waterDrop };
  const wTFR = { x: iTFR.x, y: iTFR.y + waterDrop };
  const wTBL = { x: iTBL.x, y: iTBL.y + waterDrop };
  const wTBR = { x: iTBR.x, y: iTBR.y + waterDrop };

  // Skimmer on the inner right wall near water surface (front-right)
  const skimmerWidthIn = 8;
  const skimmerHeightIn = 6;
  const skWpx = skimmerWidthIn * kLength * scale;
  const skHpx = skimmerHeightIn * kHeight * scale;

  // We'll place skimmer on inner front-right wall at water plane
  const skX = wTFR.x - skWpx - 2;
  const skY = wTFR.y - skHpx / 2;

  // Deflection intensities (still calculated in inches, but display in mm)
  const eps = 1e-9;
  const maxDef = Math.max(bottom.delta_max, extr.delta_max, eps);

  const vesselIntensity = bottom.delta_max / maxDef;
  const frameIntensity = extr.delta_max / maxDef;

  const colorFromIntensity = (i: number) => {
    const clamped = Math.max(0, Math.min(1, i));
    const r = 255;
    const g = Math.round(220 * (1 - clamped));
    const b = Math.round(220 * (1 - clamped));
    return `rgb(${r},${g},${b})`; // light pink → strong red
  };

  const vesselColor = colorFromIntensity(vesselIntensity);
  const frameColor = colorFromIntensity(frameIntensity);

  // Convert deflections to mm for display
  const vesselDefMm = bottom.delta_max * INCH_TO_MM;
  const frameDefMm = extr.delta_max * INCH_TO_MM;

  // Helper to convert array of points to polygon string
  const poly = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(" ");

  // Faces: we draw in back-to-front order for nicer overlap
  const topFace = [TBL, TBR, TFR, TFL];

  const sideOuter = [TBR, TBL, BBL, BBR]; // right/back side
  const sideInner = [iTBR, iTBL, iBBL, iBBR];

  const frontOuter = [TFL, TFR, BFR, BFL];
  const frontInner = [iTFL, iTFR, iBFR, iBFL];

  // Frame band under front edge
  const frameBandHeight = 10;
  const FBL = { x: BFL.x, y: BFL.y + frameBandHeight };
  const FBR = { x: BFR.x, y: BFR.y + frameBandHeight };
  const frameBandFront = [BFL, BFR, FBR, FBL];

  // Approximate center of bottom for max deflection marker
  const midBottom = {
    x: (BFL.x + BFR.x + BBL.x + BBR.x) / 4,
    y: (BFL.y + BFR.y + BBL.y + BBR.y) / 4
  };

  return (
    <svg width={svgWidth} height={svgHeight}>
      {/* Top face outline for context */}
      <polygon
        points={poly(topFace)}
        fill="none"
        stroke="#777"
        strokeWidth={1}
      />

      {/* Outer side and front walls (lines only) */}
      <polygon
        points={poly(sideOuter)}
        fill="none"
        stroke="#555"
        strokeWidth={1.5}
      />
      <polygon
        points={poly(frontOuter)}
        fill="none"
        stroke="#555"
        strokeWidth={1.5}
      />

      {/* Inner vessel (side + front) filled, colored by vessel deflection */}
      <polygon
        points={poly(sideInner)}
        fill={vesselColor}
        stroke="#333"
        strokeWidth={1}
      />
      <polygon
        points={poly(frontInner)}
        fill={vesselColor}
        stroke="#333"
        strokeWidth={1}
      />

      {/* Water volume (top + front/side surfaces) */}
      {/* Top water surface */}
      <polygon
        points={poly([wTBL, wTBR, wTFR, wTFL])}
        fill="rgba(120, 170, 255, 0.8)"
        stroke="#1b4e8a"
        strokeWidth={1}
      />
      {/* Front water face */}
      <polygon
        points={poly([
          { x: wTFL.x, y: wTFL.y },
          { x: wTFR.x, y: wTFR.y },
          { x: iBFR.x, y: iBFR.y },
          { x: iBFL.x, y: iBFL.y }
        ])}
        fill="rgba(120, 170, 255, 0.5)"
        stroke="none"
      />
      {/* Side water face */}
      <polygon
        points={poly([
          { x: wTFR.x, y: wTFR.y },
          { x: wTBR.x, y: wTBR.y },
          { x: iBBR.x, y: iBBR.y },
          { x: iBFR.x, y: iBFR.y }
        ])}
        fill="rgba(120, 170, 255, 0.4)"
        stroke="none"
      />

      {/* Skimmer on inner front-right wall */}
      <rect
        x={skX}
        y={skY}
        width={skWpx}
        height={skHpx}
        fill="#eeeeee"
        stroke="#555"
        strokeWidth={1}
        rx={2}
      />
      <line
        x1={skX + 3}
        y1={skY + skHpx / 2}
        x2={skX + skWpx - 3}
        y2={skY + skHpx / 2}
        stroke="#bbbbbb"
        strokeWidth={1}
      />
      <text
        x={skX + skWpx / 2}
        y={skY + skHpx + 11}
        fontSize={10}
        textAnchor="middle"
        fill="#444"
      >
        skimmer
      </text>

      {/* Frame band under front edge, colored by frame deflection */}
      <polygon
        points={poly(frameBandFront)}
        fill={frameColor}
        stroke="#333"
        strokeWidth={1}
      />
      <text
        x={(FBL.x + FBR.x) / 2}
        y={FBL.y + frameBandHeight + 12}
        fontSize={10}
        textAnchor="middle"
        fill="#444"
      >
        frame / extrusion region
      </text>

      {/* Max vessel deflection marker (bottom mid) */}
      <circle cx={midBottom.x} cy={midBottom.y} r={5} fill="blue" />
      <text
        x={midBottom.x + 8}
        y={midBottom.y + 4}
        fontSize={10}
        fill="blue"
      >
        max δ (vessel)
      </text>

      {/* Legend with deflection in mm */}
      <rect
        x={svgWidth - margin - 22}
        y={margin}
        width={18}
        height={12}
        fill={vesselColor}
        stroke="#333"
        strokeWidth={0.5}
      />
      <text
        x={svgWidth - margin - 28}
        y={margin + 10}
        fontSize={10}
        textAnchor="end"
        fill="#222"
      >
        vessel deflection: {vesselDefMm.toFixed(3)} mm
      </text>

      <rect
        x={svgWidth - margin - 22}
        y={margin + 24}
        width={18}
        height={12}
        fill={frameColor}
        stroke="#333"
        strokeWidth={0.5}
      />
      <text
        x={svgWidth - margin - 28}
        y={margin + 34}
        fontSize={10}
        textAnchor="end"
        fill="#222"
      >
        frame deflection: {frameDefMm.toFixed(3)} mm
      </text>

      <text
        x={margin}
        y={svgHeight - margin / 2}
        fontSize={11}
        fill="#555"
      >
        3D-ish view of tub interior with water & skimmer. Redder walls/bottom = higher vessel
        deflection; redder band = higher frame deflection. Values shown in mm.
      </text>
    </svg>
  );
}
