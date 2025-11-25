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
  const svgWidth = 700;
  const svgHeight = 350;
  const margin = 40;

  // We use a side section: length (L) horizontally, depth (H) vertically.
  const ppiBase = 8; // base pixels per inch before clamping

  const tubLengthPx = tub.L_tub_in * ppiBase;
  const tubDepthPx = tub.H_tub_in * ppiBase;

  const maxLen = svgWidth - 2 * margin;
  const maxDepth = svgHeight - 2 * margin;

  const scale = Math.min(
    tubLengthPx > 0 ? maxLen / tubLengthPx : 1,
    tubDepthPx > 0 ? maxDepth / tubDepthPx : 1,
    1
  );

  const Lpx = tub.L_tub_in * ppiBase * scale;
  const Hpx = tub.H_tub_in * ppiBase * scale;

  // Tub outer rectangle (we’ll treat these as outside dims)
  const tubX = margin;
  const tubY = margin;

  // Water level
  const h_water_in = tub.H_tub_in - tub.water_freeboard_in;
  const waterDepthPx = h_water_in * ppiBase * scale;
  const waterTopOffsetPx =
    (tub.H_tub_in - h_water_in) * ppiBase * scale; // from tub top
  const waterX = tubX;
  const waterY = tubY + waterTopOffsetPx;

  // Colors: compare vessel vs frame deflection
  const eps = 1e-9;
  const maxDef = Math.max(bottom.delta_max, extr.delta_max, eps);

  const vesselIntensity = bottom.delta_max / maxDef;
  const frameIntensity = extr.delta_max / maxDef;

  const colorFromIntensity = (i: number) => {
    const clamped = Math.max(0, Math.min(1, i));
    const r = 255;
    const g = Math.round(220 * (1 - clamped));
    const b = Math.round(220 * (1 - clamped));
    return `rgb(${r},${g},${b})`; // pink → red
  };

  const vesselColor = colorFromIntensity(vesselIntensity);
  const frameColor = colorFromIntensity(frameIntensity);

  // Skimmer: we’ll approximate it on the right wall, near water surface
  const skimmerWidthIn = 8; // inches
  const skimmerHeightIn = 6;
  const skWpx = skimmerWidthIn * ppiBase * scale;
  const skHpx = skimmerHeightIn * ppiBase * scale;

  const skimmerX =
    tubX + Lpx - skWpx - 4; // a little left from inner right face
  const skimmerY = waterY + 4; // just below water surface

  // Frame band: outer frame below tub bottom
  const frameBandHeightPx = 12;
  const frameBandX = tubX;
  const frameBandY = tubY + Hpx;
  const frameBandWidth = Lpx;

  // Location of max bottom deflection ~ mid-span in length, at bottom
  const midX = tubX + Lpx / 2;
  const midY = tubY + Hpx - 4;

  return (
    <svg width={svgWidth} height={svgHeight}>
      {/* Tub outer outline */}
      <rect
        x={tubX}
        y={tubY}
        width={Lpx}
        height={Hpx}
        fill="none"
        stroke="#333"
        strokeWidth={2}
      />

      {/* Vessel interior (walls + bottom) tinted by vessel deflection */}
      <rect
        x={tubX + 2}
        y={tubY + 2}
        width={Lpx - 4}
        height={Hpx - 4}
        fill={vesselColor}
        stroke="none"
      />

      {/* Water inside tub */}
      <rect
        x={waterX + 4}
        y={waterY}
        width={Lpx - 8}
        height={waterDepthPx - 4}
        fill="rgba(120, 170, 255, 0.8)"
        stroke="#175a9e"
        strokeWidth={1}
      />

      {/* Water surface line */}
      <line
        x1={waterX + 4}
        y1={waterY}
        x2={waterX + Lpx - 4}
        y2={waterY}
        stroke="#0f3f7a"
        strokeWidth={1.5}
      />

      {/* Skimmer box on the right wall */}
      <rect
        x={skimmerX}
        y={skimmerY}
        width={skWpx}
        height={skHpx}
        fill="#dddddd"
        stroke="#555"
        strokeWidth={1}
        rx={2}
      />
      <line
        x1={skimmerX}
        y1={skimmerY + skHpx / 2}
        x2={skimmerX + skWpx}
        y2={skimmerY + skHpx / 2}
        stroke="#aaa"
        strokeWidth={1}
      />
      <text
        x={skimmerX + skWpx / 2}
        y={skimmerY + skHpx + 12}
        fontSize={10}
        textAnchor="middle"
        fill="#444"
      >
        skimmer
      </text>

      {/* Frame band below tub representing frame deflection */}
      <rect
        x={frameBandX}
        y={frameBandY}
        width={frameBandWidth}
        height={frameBandHeightPx}
        fill={frameColor}
        stroke="#333"
        strokeWidth={1}
      />
      <text
        x={frameBandX + frameBandWidth / 2}
        y={frameBandY + frameBandHeightPx + 12}
        fontSize={10}
        textAnchor="middle"
        fill="#444"
      >
        frame / extrusion region
      </text>

      {/* Marker for max bottom deflection */}
      <circle cx={midX} cy={midY} r={5} fill="blue" />
      <text
        x={midX}
        y={midY - 8}
        fontSize={10}
        textAnchor="middle"
        fill="blue"
      >
        max δ (bottom)
      </text>

      {/* Legend on the right */}
      <rect
        x={svgWidth - margin - 20}
        y={margin}
        width={16}
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
        vessel deflection: {bottom.delta_max.toFixed(5)} in
      </text>

      <rect
        x={svgWidth - margin - 20}
        y={margin + 24}
        width={16}
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
        frame deflection: {extr.delta_max.toFixed(5)} in
      </text>

      <text
        x={margin}
        y={svgHeight - margin / 2}
        fontSize={11}
        fill="#555"
      >
        Side section: length (horizontal) vs depth (vertical). Redder walls/bottom = more vessel
        deflection; redder band = more frame deflection. Water and skimmer are schematic.
      </text>
    </svg>
  );
}
