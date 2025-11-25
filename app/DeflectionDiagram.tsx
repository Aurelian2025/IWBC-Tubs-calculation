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
  // Make SVG/tub bigger so points are not crowded
  const svgWidth = 900;
  const svgHeight = 550;
  const margin = 40;

  // Base scales for 3D-ish view
  const pxPerInLength = 7; // along L (bigger than before)
  const pxPerInHeight = 5; // vertical
  const pxPerInDepth = 3;  // depth (tub width)

  // Raw sizes
  let Lpx = tub.L_tub_in * pxPerInLength;
  let Hpx = tub.H_tub_in * pxPerInHeight;
  let Dpx = tub.W_tub_in * pxPerInDepth;

  // Fit into viewport (leave room on right for legend)
  const maxL = svgWidth - 2 * margin - 220;
  const maxH = svgHeight - 2 * margin - 40;
  const scale = Math.min(
    1,
    maxL / Lpx,
    maxH / (Hpx + Dpx * 0.7)
  );

  Lpx *= scale;
  Hpx *= scale;
  Dpx *= scale;

  // Depth projection
  const depthX = Dpx;
  const depthY = -Dpx * 0.6;

  // Origin for front-top-left
  const baseX = margin + 60;
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

  // Inner “shell” offset (visual wall thickness)
  const wallOffset = 4;
  const iFTL = { x: FTL.x + wallOffset, y: FTL.y + wallOffset };
  const iFTR = { x: FTR.x - wallOffset, y: FTR.y + wallOffset };
  const iFBL = { x: FBL.x + wallOffset, y: FBL.y - wallOffset };
  const iFBR = { x: FBR.x - wallOffset, y: FBR.y - wallOffset };

  const iBTL = { x: BTL.x + wallOffset, y: BTL.y + wallOffset };
  const iBTR = { x: BTR.x - wallOffset, y: BTR.y + wallOffset };
  const iBBL = { x: BBL.x + wallOffset, y: BBL.y - wallOffset };
  const iBBR = { x: BBR.x - wallOffset, y: BBR.y - wallOffset };

  // Water level (freeboard from top)
  const hWaterIn = tub.H_tub_in - tub.water_freeboard_in;
  const waterFrac = Math.max(0, Math.min(1, hWaterIn / tub.H_tub_in));
  const waterDropPx = Hpx * waterFrac;

  const wIFTL = { x: iFTL.x, y: iFTL.y + waterDropPx };
  const wIFTR = { x: iFTR.x, y: iFTR.y + waterDropPx };
  const wIBTL = { x: iBTL.x, y: iBTL.y + waterDropPx };
  const wIBTR = { x: iBTR.x, y: iBTR.y + waterDropPx };

  // Deflection intensities from single max values (for vessel/frame colors)
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

  // Faces
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

  // Bottom center (approx max vessel deflection location)
  const bottomCenter = {
    x: (iFBL.x + iFBR.x + iBBL.x + iBBR.x) / 4,
    y: (iFBL.y + iFBR.y + iBBL.y + iBBR.y) / 4
  };

  // -----------------------------
  // Map deflection profiles to points on surfaces
  // -----------------------------

  // Helper linear interpolation between two SVG points
  function lerpPoint(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    t: number
  ): { x: number; y: number } {
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    };
  }

  // Max deflection across all profiles for radius scaling
  const allDeflections = [
    ...bottomProfile.map((p) => p.deflection_in),
    ...shortProfile.map((p) => p.deflection_in),
    ...longProfile.map((p) => p.deflection_in)
  ];
  const maxDefProfile = Math.max(
    ...allDeflections.map((d) => Math.abs(d)),
    eps
  );

  // Bottom profile -> inner front bottom edge: iFBL -> iFBR
  const bottomPointsSvg = bottomProfile.map((p) => {
    const t = tub.L_tub_in > 0 ? p.x_in / tub.L_tub_in : 0;
    const pos = lerpPoint(iFBL, iFBR, t);
    return {
      ...p,
      svg: pos
    };
  });

  // Long-side profile -> inner right bottom edge: iFBR -> iBBR
  const longPointsSvg = longProfile.map((p) => {
    const t = tub.L_tub_in > 0 ? p.x_in / tub.L_tub_in : 0;
    const pos = lerpPoint(iFBR, iBBR, t);
    return {
      ...p,
      svg: pos
    };
  });

  // Short-side profile -> inner front bottom edge, slightly above for visibility
  const shortPointsSvg = shortProfile.map((p) => {
    const t = tub.W_tub_in > 0 ? p.x_in / tub.W_tub_in : 0;
    const base = lerpPoint(iFBL, iFBR, t);
    return {
      ...p,
      svg: { x: base.x, y: base.y - 10 }
    };
  });

  // Circle radius scaling
  function radiusFromDeflection(defIn: number): number {
    const frac = Math.max(0, Math.min(1, Math.abs(defIn) / maxDefProfile));
    return 4 + 6 * frac; // between 4 and 10 px
  }

  // Legend: show actual values for every point in mm, grouped
  const legendLines: string[] = [];

  legendLines.push("Bottom points δ (mm):");
  bottomProfile.forEach((p, i) => {
    const mm = p.deflection_in * INCH_TO_MM;
    legendLines.push(`B${i + 1}: ${mm.toFixed(3)}`);
  });

  legendLines.push("");
  legendLines.push("Short-side points δ (mm):");
  shortProfile.forEach((p, i) => {
    const mm = p.deflection_in * INCH_TO_MM;
    legendLines.push(`S${i + 1}: ${mm.toFixed(3)}`);
  });

  legendLines.push("");
  legendLines.push("Long-side points δ (mm):");
  longProfile.forEach((p, i) => {
    const mm = p.deflection_in * INCH_TO_MM;
    legendLines.push(`L${i + 1}: ${mm.toFixed(3)}`);
  });

  const legendX = svgWidth - margin - 10;
  const legendY = margin + 10;
  const lineHeight = 12;

  return (
    <svg width={svgWidth} height={svgHeight}>
      {/* Top outline */}
      <polygon
        points={poly(topFace)}
        fill="none"
        stroke="#777"
        strokeWidth={1}
      />

      {/* Outer walls */}
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

      {/* Inner vessel walls (color = vessel deflection) */}
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

      {/* Water: front and right faces */}
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

      {/* Max vessel deflection marker (optional) */}
      <circle cx={bottomCenter.x} cy={bottomCenter.y} r={4} fill="blue" />

      {/* Bottom deflection points (red) with labels B1..B10 */}
      {bottomPointsSvg.map((p, idx) => {
        const mm = p.deflection_in * INCH_TO_MM;
        const r = radiusFromDeflection(p.deflection_in);
        const label = `B${idx + 1}`;
        return (
          <g key={`b-${idx}`}>
            <circle
              cx={p.svg.x}
              cy={p.svg.y}
              r={r}
              fill="rgba(220,0,0,0.8)"
              stroke="#660000"
              strokeWidth={1}
            >
              <title>
                {`Bottom ${label}: x=${p.x_in.toFixed(1)} in, δ=${mm.toFixed(
                  3
                )} mm`}
              </title>
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

      {/* Short-side deflection points (green) with labels S1..S5 */}
      {shortPointsSvg.map((p, idx) => {
        const mm = p.deflection_in * INCH_TO_MM;
        const r = radiusFromDeflection(p.deflection_in);
        const label = `S${idx + 1}`;
        return (
          <g key={`s-${idx}`}>
            <circle
              cx={p.svg.x}
              cy={p.svg.y}
              r={r}
              fill="rgba(0,180,0,0.8)"
              stroke="#004400"
              strokeWidth={1}
            >
              <title>
                {`Short ${label}: x=${p.x_in.toFixed(1)} in, δ=${mm.toFixed(
                  3
                )} mm`}
              </title>
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

      {/* Long-side deflection points (blue) with labels L1..L10 */}
      {longPointsSvg.map((p, idx) => {
        const mm = p.deflection_in * INCH_TO_MM;
        const r = radiusFromDeflection(p.deflection_in);
        const label = `L${idx + 1}`;
        return (
          <g key={`l-${idx}`}>
            <circle
              cx={p.svg.x}
              cy={p.svg.y}
              r={r}
              fill="rgba(0,0,220,0.8)"
              stroke="#000066"
              strokeWidth={1}
            >
              <title>
                {`Long ${label}: x=${p.x_in.toFixed(1)} in, δ=${mm.toFixed(
                  3
                )} mm`}
              </title>
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

      {/* Legend listing actual δ values in mm for each point */}
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
