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

// Normalized plate points (same pattern for all surfaces)
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
  const svgWidth = 1000;
  const svgHeight = 550;
  const margin = 40;

  // Base scales for 3D-ish view
  const pxPerInLength = 7;
  const pxPerInHeight = 5;
  const pxPerInDepth = 3;

  let Lpx = tub.L_tub_in * pxPerInLength;
  let Hpx = tub.H_tub_in * pxPerInHeight;
  let Dpx = tub.W_tub_in * pxPerInDepth;

  const maxL = svgWidth - 2 * margin;
  const maxH = svgHeight - 2 * margin - 40;
  const scale = Math.min(
    1,
    maxL / Lpx,
    maxH / (Hpx + Dpx * 0.7)
  );

  Lpx *= scale;
  Hpx *= scale;
  Dpx *= scale;

  const depthX = Dpx;
  const depthY = -Dpx * 0.6;

  const baseX = margin + 40;
  const baseY = margin + 80;

  // Front outer corners
  const FTL = { x: baseX, y: baseY };
  const FTR = { x: baseX + Lpx, y: baseY };
  const FBL = { x: baseX, y: baseY + Hpx };
  const FBR = { x: baseX + Lpx, y: baseY + Hpx };

  // Back outer corners
  const BTL = { x: FTL.x + depthX, y: FTL.y + depthY };
  const BTR = { x: FTR.x + depthX, y: FTR.y + depthY };
  const BBL = { x: FBL.x + depthX, y: FBL.y + depthY };
  const BBR = { x: FBR.x + depthX, y: FBR.y + depthY };

  // Inner shell
  const wallOffset = 4;
  const iFTL = { x: FTL.x + wallOffset, y: FTL.y + wallOffset };
  const iFTR = { x: FTR.x - wallOffset, y: FTR.y + wallOffset };
  const iFBL = { x: FBL.x + wallOffset, y: FBL.y - wallOffset };
  const iFBR = { x: FBR.x - wallOffset, y: FBR.y - wallOffset };

  const iBTL = { x: BTL.x + wallOffset, y: BTL.y + wallOffset };
  const iBTR = { x: BTR.x - wallOffset, y: BTR.y + wallOffset };
  const iBBL = { x: BBL.x + wallOffset, y: BBL.y - wallOffset };
  const iBBR = { x: BBR.x - wallOffset, y: BBR.y - wallOffset };

  // Water depth interpreted as water_freeboard_in
  const hWaterIn = Math.min(tub.water_freeboard_in, tub.H_tub_in);
  const waterFrac = Math.max(0, Math.min(1, hWaterIn / tub.H_tub_in));
  const freeboardPx = Hpx * (1 - waterFrac);

  const wIFTL = { x: iFTL.x, y: iFTL.y + freeboardPx };
  const wIFTR = { x: iFTR.x, y: iFTR.y + freeboardPx };
  const wIBTL = { x: iBTL.x, y: iBTL.y + freeboardPx };
  const wIBTR = { x: iBTR.x, y: iBTR.y + freeboardPx };

  const eps = 1e-9;
  const maxDefSingle = Math.max(bottom.delta_max, extr.delta_max, eps);

  const vesselIntensity = bottom.delta_max / maxDefSingle;
  const frameIntensity = extr.delta_max / maxDefSingle;

  const colorFromIntensity = (i: number) => {
    const c = Math.max(0, Math.min(1, i));
    const r = 255;
    const g = Math.round(220 * (1 - c));
    const b = Math.round(220 * (1 - c));
    return `rgb(${r},${g},${b})`;
  };

  const vesselColor = colorFromIntensity(vesselIntensity);
  const frameColor = colorFromIntensity(frameIntensity);

  const poly = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(" ");

  const topFace = [BTL, BTR, FTR, FTL];
  const rightOuter = [FTR, BTR, BBR, FBR];
  const frontOuter = [FTL, FTR, FBR, FBL];
  const rightInner = [iFTR, iBTR, iBBR, iFBR];
  const frontInner = [iFTL, iFTR, iFBR, iFBL];

  const frameBandHeight = 10;
  const FB1 = { x: FBL.x, y: FBL.y + frameBandHeight };
  const FB2 = { x: FBR.x, y: FBR.y + frameBandHeight };
  const frameBand = [FBL, FBR, FB2, FB1];

  const bottomCenter = {
    x: (iFBL.x + iFBR.x + iBBL.x + iBBR.x) / 4,
    y: (iFBL.y + iFBR.y + iBBL.y + iBBR.y) / 4
  };

  // Helper: bilinear interpolation on a quad
  function bilerp(
    u: number,
    v: number,
    BL: { x: number; y: number },
    BR: { x: number; y: number },
    TR: { x: number; y: number },
    TL: { x: number; y: number }
  ) {
    const x =
      BL.x * (1 - u) * (1 - v) +
      BR.x * u * (1 - v) +
      TR.x * u * v +
      TL.x * (1 - u) * v;
    const y =
      BL.y * (1 - u) * (1 - v) +
      BR.y * u * (1 - v) +
      TR.y * u * v +
      TL.y * (1 - u) * v;
    return { x, y };
  }

  // Combine all deflections for radius scaling
  const allDeflections = [
    ...bottomProfile.map((p) => p.deflection_in),
    ...shortProfile.map((p) => p.deflection_in),
    ...longProfile.map((p) => p.deflection_in)
  ];
  const maxDefProfile = Math.max(
    ...allDeflections.map((d) => Math.abs(d)),
    eps
  );

  function radiusFromDeflection(defIn: number): number {
    const frac = Math.max(0, Math.min(1, Math.abs(defIn) / maxDefProfile));
    return 4 + 6 * frac; // between 4 and 10 px
  }

  // Map bottom points to interior bottom surface (quad: iFBL, iFBR, iBBR, iBBL)
  const bottomPointsSvg = bottomProfile.map((p, idx) => {
    const uv = PLATE_SAMPLE_POINTS[idx] ?? PLATE_SAMPLE_POINTS[PLATE_SAMPLE_POINTS.length - 1];
    const svg = bilerp(uv.u, uv.v, iFBL, iFBR, iBBR, iBBL);
    return { def: p.deflection_in, idx: idx + 1, svg };
  });

  // Map short-side points to front interior wall (quad: iFBL, iFBR, iFTR, iFTL)
  const shortPointsSvg = shortProfile.map((p, idx) => {
    const uv = PLATE_SAMPLE_POINTS[idx] ?? PLATE_SAMPLE_POINTS[PLATE_SAMPLE_POINTS.length - 1];
    const svg = bilerp(uv.u, uv.v, iFBL, iFBR, iFTR, iFTL);
    return { def: p.deflection_in, idx: idx + 1, svg };
  });

  // Map long-side points to right interior wall (quad: iFBR, iBBR, iBTR, iFTR)
  const longPointsSvg = longProfile.map((p, idx) => {
    const uv = PLATE_SAMPLE_POINTS[idx] ?? PLATE_SAMPLE_POINTS[PLATE_SAMPLE_POINTS.length - 1];
    const svg = bilerp(uv.u, uv.v, iFBR, iBBR, iBTR, iFTR);
    return { def: p.deflection_in, idx: idx + 1, svg };
  });

  // Legend with actual values (mm)
  const legendLines: string[] = [];

  legendLines.push("Bottom δ (mm):");
  bottomProfile.forEach((p, i) => {
    const mm = p.deflection_in * INCH_TO_MM;
    legendLines.push(`B${i + 1}: ${mm.toFixed(3)}`);
  });

  legendLines.push("");
  legendLines.push("Short-side δ (mm):");
  shortProfile.forEach((p, i) => {
    const mm = p.deflection_in * INCH_TO_MM;
    legendLines.push(`S${i + 1}: ${mm.toFixed(3)}`);
  });

  legendLines.push("");
  legendLines.push("Long-side δ (mm):");
  longProfile.forEach((p, i) => {
    const mm = p.deflection_in * INCH_TO_MM;
    legendLines.push(`L${i + 1}: ${mm.toFixed(3)}`);
  });

  const legendX = svgWidth - margin - 10;
  const legendY = margin + 20;
  const lineHeight = 12;

  return (
    <svg width={svgWidth} height={svgHeight}>
      {/* Main 3D-ish tub */}
      <polygon
        points={poly(topFace)}
        fill="none"
        stroke="#777"
        strokeWidth={1}
      />

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

      {/* Water */}
      <polygon
        points={poly([wIBTL, wIBTR, wIFTR, wIFTL])}
        fill="rgba(120,170,255,0.85)"
        stroke="#1b4e8a"
        strokeWidth={1}
      />
      <polygon
        points={poly([wIFTL, wIFTR, iFBR, iFBL])}
        fill="rgba(120,170,255,0.5)"
        stroke="none"
      />
      <polygon
        points={poly([wIFTR, wIBTR, iBBR, iFBR])}
        fill="rgba(120,170,255,0.4)"
        stroke="none"
      />

      {/* Frame band */}
      <polygon
        points={poly(frameBand)}
        fill={frameColor}
        stroke="#333"
        strokeWidth={1}
      />

      {/* Max vessel δ marker */}
      <circle cx={bottomCenter.x} cy={bottomCenter.y} r={4} fill="blue" />

      {/* Bottom points (red) on interior bottom */}
      {bottomPointsSvg.map((p) => {
        const mm = p.def * INCH_TO_MM;
        const r = radiusFromDeflection(p.def);
        const label = `B${p.idx}`;
        return (
          <g key={`b-${p.idx}`}>
            <circle
              cx={p.svg.x}
              cy={p.svg.y}
              r={r}
              fill="rgba(220,0,0,0.8)"
              stroke="#660000"
              strokeWidth={1}
            >
              <title>{`${label}: δ=${mm.toFixed(3)} mm`}</title>
            </circle>
            <text
              x={p.svg.x + r + 2}
              y={p.svg.y + 3}
              fontSize={9}
              fill="#660000"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Short-side points (green) on front interior wall */}
      {shortPointsSvg.map((p) => {
        const mm = p.def * INCH_TO_MM;
        const r = radiusFromDeflection(p.def);
        const label = `S${p.idx}`;
        return (
          <g key={`s-${p.idx}`}>
            <circle
              cx={p.svg.x}
              cy={p.svg.y}
              r={r}
              fill="rgba(0,180,0,0.85)"
              stroke="#004400"
              strokeWidth={1}
            >
              <title>{`${label}: δ=${mm.toFixed(3)} mm`}</title>
            </circle>
            <text
              x={p.svg.x + r + 2}
              y={p.svg.y + 3}
              fontSize={9}
              fill="#004400"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Long-side points (blue) on right interior wall */}
      {longPointsSvg.map((p) => {
        const mm = p.def * INCH_TO_MM;
        const r = radiusFromDeflection(p.def);
        const label = `L${p.idx}`;
        return (
          <g key={`l-${p.idx}`}>
            <circle
              cx={p.svg.x}
              cy={p.svg.y}
              r={r}
              fill="rgba(0,0,220,0.85)"
              stroke="#000066"
              strokeWidth={1}
            >
              <title>{`${label}: δ=${mm.toFixed(3)} mm`}</title>
            </circle>
            <text
              x={p.svg.x + r + 2}
              y={p.svg.y + 3}
              fontSize={9}
              fill="#000066"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Legend of numeric deflections */}
      {legendLines.map((text, idx) => (
        <text
          key={idx}
          x={legendX}
          y={legendY + idx * lineHeight}
          fontSize={10}
          textAnchor="end"
          fill="#222"
        >
          {text}
        </text>
      ))}
    </svg>
  );
}
