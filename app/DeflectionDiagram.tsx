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
  const svgWidth = 550;
  const svgHeight = 300;
  const margin = 20;

  const scaleX = svgWidth / frame.L_frame_in;
  const scaleY = svgHeight / frame.W_frame_in;

  // Frame rectangle
  const frameW = frame.L_frame_in * scaleX;
  const frameH = frame.W_frame_in * scaleY;
  const frameX = margin;
  const frameY = margin;

  // Tub rectangle (centered)
  const tubW = tub.L_tub_in * scaleX;
  const tubH = tub.W_tub_in * scaleY;
  const tubX = frameX + (frameW - tubW) / 2;
  const tubY = frameY + (frameH - tubH) / 2;

  // Extrusions: evenly spaced along tub length
  const n = tub.n_transverse;
  const spacing = tub.L_tub_in / (n - 1);

  // Deflection intensity scaling
  const maxDef = Math.max(bottom.delta_max, extr.delta_max);
  const bottomIntensity = bottom.delta_max / maxDef;
  const extrIntensity = extr.delta_max / maxDef;

  const colorFromIntensity = (i: number) => {
    const clamped = Math.max(0, Math.min(1, i));
    const r = 255;
    const g = Math.round(200 * (1 - clamped));
    const b = Math.round(200 * (1 - clamped));
    return `rgb(${r},${g},${b})`; // pink → red
  };

  const tubFill = colorFromIntensity(bottomIntensity);
  const extrColor = colorFromIntensity(extrIntensity);

  const extrLines = [];
  for (let i = 0; i < n; i++) {
    const xLocal = i * spacing;
    const x = tubX + xLocal * scaleX;

    extrLines.push(
      <line
        key={i}
        x1={x}
        y1={tubY}
        x2={x}
        y2={tubY + tubH}
        stroke={extrColor}
        strokeWidth={3}
      />
    );
  }

  // Max bottom deflection point
  const mx = tubX + tubW / 2;
  const my = tubY + tubH / 2;

  return (
    <svg width={svgWidth + margin * 2} height={svgHeight + margin * 2}>
      {/* Frame outline */}
      <rect
        x={frameX}
        y={frameY}
        width={frameW}
        height={frameH}
        fill="none"
        stroke="#555"
        strokeWidth={2}
      />

      {/* Tub outline & fill */}
      <rect
        x={tubX}
        y={tubY}
        width={tubW}
        height={tubH}
        fill={tubFill}
        stroke="#222"
        strokeWidth={2}
      />

      {/* Extrusion lines */}
      {extrLines}

      {/* Max deflection marker */}
      <circle cx={mx} cy={my} r={6} fill="blue" />
      <text x={mx + 8} y={my + 4} fontSize={11} fill="blue">
        max δ bottom
      </text>
    </svg>
  );
}
