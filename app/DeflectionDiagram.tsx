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

type DeflectionPoint = {
  x_in: number;
  deflection_in: number;
};

const INCH_TO_MM = 25.4;

export default function DeflectionDiagram({
  tub,
  frame,
  bottom,
  extr,
  bottomProfile,
  shortProfile,
  longProfile
}: {
  tub: TubGeometry;
  frame: FrameGeometry;
  bottom: BottomResult;
  extr: ExtrResult;
  bottomProfile: DeflectionPoint[];
  shortProfile: DeflectionPoint[];
  longProfile: DeflectionPoint[];
}) {
  // ... keep your existing 3D drawing code here ...

  const svgWidth = 720;
  const svgHeight = 420;
  const margin = 40;

  // Base scales
  const pxPerInLength = 6; // along L
  const pxPerInHeight = 5; // vertical
  const pxPerInDepth = 2.5; // "depth" into page

  // Raw pixel sizes
  let Lpx = tub.L_tub_in * pxPerInLength;
  let Hpx = tub.H_tub_in * pxPerInHeight;
  let Dpx = tub.W_tub_in * pxPerInDepth;

  // Clamp into view
  const maxL = svgWidth - 2 * margin - 150;
  const maxH = svgHeight - 2 * margin - 40;
  const scale = Math.min(
    1,
    maxL / Lpx,
    maxH / (Hpx + Dpx * 0.7) // 0.7 factor for depth projection
  );

  Lpx *= scale;
  Hpx *= scale;
  Dpx *= scale;

  // Depth offset (top face shifted back-right)
  const depthX = Dpx;
  const depthY = -Dpx * 0.6;

  // Base origin = top-left front corner of tub
  const baseX = margin + 60;
  const baseY = margin + 80;

  // Front face corners (outer shell)
  const FTL = { x: baseX, y: baseY }; // front-top-left
  const FTR = { x: baseX + Lpx, y: baseY };
  const FBL = { x: baseX, y: baseY + Hpx };
  const FBR = { x: baseX + Lpx, y: baseY + Hpx };

  // Back face (top) corners
  const BTL = { x: FTL.x + depthX, y: FTL.y + depthY };
  const BTR = { x: FTR.x + depthX, y: FTR.y + depthY };
  const BBL = { x: FBL.x + depthX, y: FBL.y + depthY };
  const BBR = { x: FBR.x + depthX, y: FBR.y + depthY };

  // Inner offset for wall thickness (visual only)
  const wallOffset = 4;
  const iFTL = { x: FTL.x + wallOffset, y: FTL.y + wallOffset };
  const iFTR = { x: FTR.x - wallOffset, y: FTR.y + wallOffset };
  const iFBL = { x: FBL.x + wallOffset, y: FBL.y - wallOffset };
  const iFBR = { x: FBR.x - wallOffset, y: FBR.y - wallOffset };

  const iBTL = { x: BTL.x + wallOffset, y: BTL.y + wallOffset };
  const iBTR = { x: BTR.x - wallOffset, y: BTR.y + wallOffset };
  const iBBL = { x: BBL.x + wallOffset, y: BBL.y - wallOffset };
  const iBBR = { x: BBR.x - wallOffset, y: BBR.y - wallOffset };

  // Water level based on depth inside tub
  const hWaterIn = tub.H_tub_in - tub.water_freeboard_in;
  const waterFrac = Math.max(0, Math.min(1, hWaterIn / tub.H_tub_in));
  const waterDropPx = Hpx * waterFrac;

  // Water plane along front inner face
  const wIFTL = { x: iFTL.x, y: iFTL.y + waterDropPx };
  const wIFTR = { x: iFTR.x, y: iFTR.y + waterDropPx };
  // And corresponding back inner points
  const wIBTL = { x: iBTL.x, y: iBTL.y + waterDropPx };
  const wIBTR = { x: iBTR.x, y: iBTR.y + waterDropPx };

  // Deflection intensities
  const eps = 1e-9;
  const maxDef = Math.max(bottom.delta_max, extr.delta_max, eps);
  const vesselIntensity = bottom.delta_max / maxDef;
  const frameIntensity = extr.delta_max / maxDef;

  const colorFromIntensity = (i: number) => {
    const c = Math.max(0, Math.min(1, i));
    const r = 255;
    const g = Math.round(220 * (1 - c));
    const b = Math.round(220 * (1 - c));
    return `rgb(${r},${g},${b})`; // light pink → strong red
  };

  const vesselColor = colorFromIntensity(vesselIntensity);
  const frameColor = colorFromIntensity(frameIntensity);

  // Deflection in mm for display
  const vesselDefMm = bottom.delta_max * INCH_TO_MM;
  const frameDefMm = extr.delta_max * INCH_TO_MM;
 // Build legend lines for all points in mm
const legendLines: string[] = [];

legendLines.push(`σ_vessel_max: ${bottom.sigma_max.toFixed(1)} psi`);
legendLines.push(`σ_frame_max: ${extr.sigma_max.toFixed(1)} psi`);
legendLines.push("");

legendLines.push("Bottom deflection (mm):");
bottomProfile.forEach((p, i) => {
  const mm = p.deflection_in * INCH_TO_MM;
  legendLines.push(`B${i + 1} @ ${p.x_in.toFixed(1)} in: ${mm.toFixed(2)}`);
});

legendLines.push("");
legendLines.push("Short-side deflection (mm):");
shortProfile.forEach((p, i) => {
  const mm = p.deflection_in * INCH_TO_MM;
  legendLines.push(`S${i + 1} @ ${p.x_in.toFixed(1)} in: ${mm.toFixed(2)}`);
});

legendLines.push("");
legendLines.push("Long-side deflection (mm):");
longProfile.forEach((p, i) => {
  const mm = p.deflection_in * INCH_TO_MM;
  legendLines.push(`L${i + 1} @ ${p.x_in.toFixed(1)} in: ${mm.toFixed(2)}`);
});

const legendX = svgWidth - margin - 10;
const legendY = margin + 10;
const lineHeight = 12;
  const poly = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(" ");

  // Faces (back to front draw order)
  const topFace = [BTL, BTR, FTR, FTL];
  const rightOuter = [FTR, BTR, BBR, FBR];
  const frontOuter = [FTL, FTR, FBR, FBL];

  const rightInner = [iFTR, iBTR, iBBR, iFBR];
  const frontInner = [iFTL, iFTR, iFBR, iFBL];

  // Frame band under front bottom
  const frameBandHeight = 10;
  const FB1 = { x: FBL.x, y: FBL.y + frameBandHeight };
  const FB2 = { x: FBR.x, y: FBR.y + frameBandHeight };
  const frameBand = [FBL, FBR, FB2, FB1];

  // Approximate bottom center for max vessel deflection marker
  const bottomCenter = {
    x: (iFBL.x + iFBR.x + iBBL.x + iBBR.x) / 4,
    y: (iFBL.y + iFBR.y + iBBL.y + iBBR.y) / 4
  };

 
  return (
    <svg width={svgWidth} height={svgHeight}>
      {/* Thin outline for top */}
      <polygon
        points={poly(topFace)}
        fill="none"
        stroke="#777"
        strokeWidth={1}
      />

      {/* Outer right and front walls */}
      <polygon
        points={poly(rightOuter)}
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

      {/* Inner vessel walls (colored by vessel deflection) */}
      <polygon
        points={poly(rightInner)}
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

      {/* Water: top surface */}
      <polygon
        points={poly([wIBTL, wIBTR, wIFTR, wIFTL])}
        fill="rgba(120,170,255,0.85)"
        stroke="#1b4e8a"
        strokeWidth={1}
      />
      {/* Water: front face */}
      <polygon
        points={poly([
          wIFTL,
          wIFTR,
          iFBR,
          iFBL
        ])}
        fill="rgba(120,170,255,0.5)"
        stroke="none"
      />
      {/* Water: right face */}
      <polygon
        points={poly([
          wIFTR,
          wIBTR,
          iBBR,
          iFBR
        ])}
        fill="rgba(120,170,255,0.4)"
        stroke="none"
      />

      
      {/* Frame band under front bottom (frame deflection) */}
      <polygon
        points={poly(frameBand)}
        fill={frameColor}
        stroke="#333"
        strokeWidth={1}
      />
      <text
        x={(FB1.x + FB2.x) / 2}
        y={FB1.y + frameBandHeight + 12}
        fontSize={10}
        textAnchor="middle"
        fill="#444"
      >
        frame / extrusion region
      </text>

      {/* Max vessel deflection marker (bottom mid) */}
      <circle cx={bottomCenter.x} cy={bottomCenter.y} r={5} fill="blue" />
      <text
        x={bottomCenter.x + 8}
        y={bottomCenter.y + 4}
        fontSize={10}
        fill="blue"
      >
        max δ (vessel)
      </text>

      {/* Legend with mm values */}
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
        x={svgWidth - margin - 26}
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
        x={svgWidth - margin - 26}
        y={margin + 34}
        fontSize={10}
        textAnchor="end"
        fill="#222"
      >
        frame deflection: {frameDefMm.toFixed(3)} mm
      </text>

    
    </svg>
  );
}
