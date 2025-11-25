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
  const svgWidth = 720;
  const svgHeight = 420;
  const margin = 40;

  // Base scales for 3D-ish view
  const pxPerInLength = 6; // along L
  const pxPerInHeight = 5; // vertical
  const pxPerInDepth = 2.5; // depth (tub width)

  // Raw sizes
  let Lpx = tub.L_tub_in * pxPerInLength;
  let Hpx = tub.H_tub_in * pxPerInHeight;
  let Dpx = tub.W_tub_in * pxPerInDepth;

  // Fit into viewport
  const maxL = svgWidth - 2 * margin - 150;
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

  // Water level (8" from top via freeboard)
  const hWaterIn = tub.H_tub_in - tub.water_freeboard_in;
  const waterFrac = Math.max(0, Math.min(1, hWaterIn / tub.H_tub_in));
  const waterDropPx = Hpx * waterFrac;

  const wIFTL = { x: iFTL.x, y: iFTL.y + waterDropPx };
  const wIFTR = { x: iFTR.x, y: iFTR.y + waterDropPx };
  const wIBTL = { x: iBTL.x, y: iBTL.y + waterDropPx };
  const wIBTR = { x: iBTR.x, y: iBTR.y + waterDropPx };

  // Deflection intensities
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

  const vesselDefMm = bottom.delta_max * INCH_TO_MM;
  const frameDefMm = extr.delta_max * INCH_TO_MM;

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

  // Bottom center (max vessel deflection location marker)
  const bottomCenter = {
    x: (iFBL.x + iFBR.x + iBBL.x + iBBR.x) / 4,
    y: (iFBL.y + iFBR.y + iBBL.y + iBBR.y) / 4
  };

  // -----------------------------
  // Map deflection profiles to points on surfaces (for circles)
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

  // Compute maximum deflection across all profiles (for circle size scaling)
  const allDeflections = [
    ...bottomProfile.map((p) => p.deflection_in),
    ...shortProfile.map((p) => p.deflection_in),
    ...longProfile.map((p) => p.deflection_in)
  ];
  const maxDefProfile = Math.max(...allDeflections.map((d) => Math.abs(d)), eps);

  // Map bottomProfile along inner front bottom edge: iFBL -> iFBR
  const bottomPointsSvg = bottomProfile.map((p) => {
    const t = tub.L_tub_in > 0 ? p.x_in / tub.L_tub_in : 0;
    const pos = lerpPoint(iFBL, iFBR, t);
    return {
      ...p,
      svg: pos
    };
  });

  // Map longProfile along inner right bottom edge: iFBR -> iBBR
  const longPointsSvg = longProfile.map((p) => {
    const t = tub.L_tub_in > 0 ? p.x_in / tub.L_tub_in : 0;
    const pos = lerpPoint(iFBR, iBBR, t);
    return {
      ...p,
      svg: pos
    };
  });

  // Map shortProfile along inner front bottom edge but slightly above: iFBL -> iFBR
  const shortPointsSvg = shortProfile.map((p) => {
    const t = tub.W_tub_in > 0 ? p.x_in / tub.W_tub_in : 0;
    const base = lerpPoint(iFBL, iFBR, t);
    return {
      ...p,
      svg: { x: base.x, y: base.y - 8 } // lift a bit so they don't overlap bottom points
    };
  });

  // Circle radius scaling
  function radiusFromDeflection(defIn: number): number {
    const frac = Math.max(0, Math.min(1, Math.abs(defIn) / maxDefProfile));
    return 3 + 5 * frac; // between 3 and 8 px
  }

  // Build compact legend text (not listing all points, just explaining colors + maxs)
  const legendLines: string[] = [
    `vessel max δ: ${vesselDefMm.toFixed(3)} mm`,
    `frame max δ: ${frameDefMm.toFixed(3)} mm`,
    "",
    "Bottom points: red circles",
    "Short-side points: green circles",
    "Long-side points: blue circles"
  ];

  const legendX = svgWidth - margin - 10;
  const legendY = margin + 10;
  const lineHeight = 12;

  return (
    <svg width={svgWidth} height={svgHeight}>
      {/* Thin outline for top */}
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

      {/* Water: front face */}
      <polygon
        points={poly([wIFTL, wIFTR, iFBR, iFBL])}
        fill="rgba(120,170,255,0.5)"
        stroke="none"
      />

      {/* Water: right face */}
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

      {/* Max vessel deflection marker */}
      <circle cx={bottomCenter.x} cy={bottomCenter.y} r={5} fill="blue" />

      {/* Bottom deflection points (red) */}
      {bottomPointsSvg.map((p, idx) => {
        const mm = p.deflection_in * INCH_TO_MM;
        const r = radiusFromDeflection(p.deflection_in);
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
                {`Bottom B${idx + 1}: x=${p.x_in.toFixed(1)} in, δ=${mm.toFixed(
                  3
                )} mm`}
              </title>
            </circle>
          </g>
        );
      })}

      {/* Short-side deflection points (green) */}
      {shortPointsSvg.map((p, idx) => {
        const mm = p.deflection_in * INCH_TO_MM;
        const r = radiusFromDeflection(p.deflection_in);
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
                {`Short S${idx + 1}: x=${p.x_in.toFixed(1)} in, δ=${mm.toFixed(
                  3
                )} mm`}
              </title>
            </circle>
          </g>
        );
      })}

      {/* Long-side deflection points (blue) */}
      {longPointsSvg.map((p, idx) => {
        const mm = p.deflection_in * INCH_TO_MM;
        const r = radiusFromDeflection(p.deflection_in);
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
                {`Long L${idx + 1}: x=${p.x_in.toFixed(1)} in, δ=${mm.toFixed(
                  3
                )} mm`}
              </title>
            </circle>
          </g>
        );
      })}

      {/* Compact legend */}
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
