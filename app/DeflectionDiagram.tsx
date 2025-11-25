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
  // Bigger canvas
  const svgWidth = 1000;
  const svgHeight = 550;
  const margin = 40;

  // Reserve space on right for short-side view + legend
  const rightPanelWidth = 260;

  // Base scales for main 3D-ish view (left)
  const pxPerInLength = 7; // along L
  const pxPerInHeight = 5; // vertical
  const pxPerInDepth = 3;  // depth (tub width)

  let Lpx = tub.L_tub_in * pxPerInLength;
  let Hpx = tub.H_tub_in * pxPerInHeight;
  let Dpx = tub.W_tub_in * pxPerInDepth;

  const maxL = svgWidth - 2 * margin - rightPanelWidth;
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

  // Back outer
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

  // water_freeboard_in is actually water depth from bottom
const hWaterIn = Math.min(tub.water_freeboard_in, tub.H_tub_in);
const waterFrac = Math.max(0, Math.min(1, hWaterIn / tub.H_tub_in));
// distance from top to water surface
const freeboardPx = Hpx * (1 - waterFrac);

const wIFTL = { x: iFTL.x, y: iFTL.y + freeboardPx };
const wIFTR = { x: iFTR.x, y: iFTR.y + freeboardPx };
const wIBTL = { x: iBTL.x, y: iBTL.y + freeboardPx };
const wIBTR = { x: iBTR.x, y: iBTR.y + freeboardPx };


  // Vessel/frame colors from max δ
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

  // Helpers
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

  const allDeflections = [
    ...bottomProfile.map((p) => p.deflection_in),
    ...shortProfile.map((p) => p.deflection_in),
    ...longProfile.map((p) => p.deflection_in)
  ];
  const maxDefProfile = Math.max(
    ...allDeflections.map((d) => Math.abs(d)),
    eps
  );

  // Map profiles to main 3D view
  const bottomPointsSvg = bottomProfile.map((p) => {
    const t = tub.L_tub_in > 0 ? p.x_in / tub.L_tub_in : 0;
    const pos = lerpPoint(iFBL, iFBR, t);
    return { ...p, svg: pos };
  });

  const longPointsSvg = longProfile.map((p) => {
    const t = tub.L_tub_in > 0 ? p.x_in / tub.L_tub_in : 0;
    const pos = lerpPoint(iFBR, iBBR, t);
    return { ...p, svg: pos };
  });

  const shortPointsSvg = shortProfile.map((p) => {
    const t = tub.W_tub_in > 0 ? p.x_in / tub.W_tub_in : 0;
    const base = lerpPoint(iFBL, iFBR, t);
    return { ...p, svg: { x: base.x, y: base.y - 10 } };
  });

  function radiusFromDeflection(defIn: number): number {
    const frac = Math.max(0, Math.min(1, Math.abs(defIn) / maxDefProfile));
    return 4 + 6 * frac;
  }

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
  const legendY = margin + 130;
  const lineHeight = 12;

    // Place short-side panel centered below the main tub
  const sidePanelW = rightPanelWidth - 30;
  const sidePanelH = 180;
  const sidePanelX = baseX + Lpx / 2 - sidePanelW / 2; // centered under tub
  const sidePanelY = baseY + Hpx + 60;                 // below tub

  const sideMaxW = sidePanelW - 40;
  const sideMaxH = sidePanelH - 40;

  const sideScaleW = tub.W_tub_in > 0 ? sideMaxW / tub.W_tub_in : 1;
  const sideScaleH = tub.H_tub_in > 0 ? sideMaxH / tub.H_tub_in : 1;
  const sideScale = Math.min(sideScaleW, sideScaleH);

  const sideWpx = tub.W_tub_in * sideScale;
  const sideHpx = tub.H_tub_in * sideScale;

  const sideOriginX = sidePanelX + 20;
  const sideOriginY = sidePanelY + 10;

  // Side-view rectangle (looking at right wall): width horizontal, height vertical
  const sideTopLeft = { x: sideOriginX, y: sideOriginY };
  const sideBottomLeft = { x: sideOriginX, y: sideOriginY + sideHpx };
  const sideTopRight = { x: sideOriginX + sideWpx, y: sideOriginY };
  const sideBottomRight = { x: sideOriginX + sideWpx, y: sideOriginY + sideHpx };

  // Water level in side view
  const sideWaterDepthPx = hWaterIn * sideScale;
  const sideWaterTopY = sideOriginY + (tub.H_tub_in * sideScale - sideWaterDepthPx);

  // Short-side points mapped into side view
  const shortSidePointsView = shortProfile.map((p, i) => {
    const t = tub.W_tub_in > 0 ? p.x_in / tub.W_tub_in : 0;
    const x = sideOriginX + t * sideWpx;
    const y = sideBottomLeft.y; // along bottom edge
    return { ...p, idx: i + 1, svg: { x, y } };
  });

  return (
    <svg width={svgWidth} height={svgHeight}>
      {/* Main 3D-ish tub on left */}
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

      {/* Water in main view */}
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

      <polygon
        points={poly(frameBand)}
        fill={frameColor}
        stroke="#333"
        strokeWidth={1}
      />

      {/* Max vessel δ marker */}
      <circle cx={bottomCenter.x} cy={bottomCenter.y} r={4} fill="blue" />

      {/* Bottom points (red) */}
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

      
      {/* Short-side points still faintly in main view (optional) */}
      {shortPointsSvg.map((p, idx) => {
        const r = radiusFromDeflection(p.deflection_in);
        const label = `S${idx + 1}`;
        return (
          <g key={`s-main-${idx}`}>
            <circle
              cx={p.svg.x}
              cy={p.svg.y}
              r={r * 0.7}
              fill="rgba(0,180,0,0.4)"
              stroke="#004400"
              strokeWidth={0.8}
            />
            <text
              x={p.svg.x + r * 0.7 + 1}
              y={p.svg.y + 3}
              fontSize={8}
              fill="#004400"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* RIGHT SIDE: Short-side 2D view */}
           {/* Panel frame */}
      <rect
        x={sidePanelX}
        y={sidePanelY}
        width={sidePanelW}
        height={sidePanelH}
        fill="none"
        stroke="#999"
        strokeWidth={1}
      />
      <text
        x={sidePanelX + sidePanelW / 2}
        y={sidePanelY - 6}
        fontSize={11}
        textAnchor="middle"
        fill="#333"
      >
        Short-side view (right wall, 3D)
      </text>

      {/* 3D-ish short-side wall: front face + top depth */}
      {/* front face */}
      <rect
        x={sideTopLeft.x}
        y={sideTopLeft.y}
        width={sideWpx}
        height={sideHpx}
        fill="rgba(255, 220, 220, 0.7)"
        stroke="#333"
        strokeWidth={1}
      />

      {/* top face (simple depth) */}
      {(() => {
        const depth = 12; // px depth for 3D effect
        const tTL = { x: sideTopLeft.x, y: sideTopLeft.y };
        const tTR = { x: sideTopRight.x, y: sideTopRight.y };
        const tBL = { x: sideTopLeft.x + depth, y: sideTopLeft.y - depth };
        const tBR = { x: sideTopRight.x + depth, y: sideTopRight.y - depth };
        return (
          <>
            <polygon
              points={`${tTL.x},${tTL.y} ${tTR.x},${tTR.y} ${tBR.x},${tBR.y} ${tBL.x},${tBL.y}`}
              fill="rgba(255, 235, 235, 0.9)"
              stroke="#666"
              strokeWidth={1}
            />
            {/* back edge */}
            <line
              x1={tBL.x}
              y1={tBL.y}
              x2={tBR.x}
              y2={tBR.y}
              stroke="#666"
              strokeWidth={1}
            />
          </>
        );
      })()}

      {/* Water level line in side view */}
      <line
        x1={sideTopLeft.x}
        y1={sideWaterTopY}
        x2={sideTopRight.x}
        y2={sideWaterTopY}
        stroke="#1b4e8a"
        strokeWidth={1.5}
      />

      {/* Short-side points clearly on side view (green) */}
      {shortSidePointsView.map((p) => {
        const mm = p.deflection_in * INCH_TO_MM;
        const r = radiusFromDeflection(p.deflection_in);
        const label = `S${p.idx}`;
        return (
          <g key={`s-side-${p.idx}`}>
            <circle
              cx={p.svg.x}
              cy={p.svg.y}
              r={r}
              fill="rgba(0,180,0,0.85)"
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
              x={p.svg.x}
              y={p.svg.y - r - 2}
              fontSize={9}
              textAnchor="middle"
              fill="#004400"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Legend of values on the right below the short-side view */}
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
