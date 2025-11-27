"use client";

import React, { useState } from "react";
import materialDefaults from "../materials.json";
import defaultTubConfig from "../defaultTub.json";
import iwbcLogo from "./iwbc-logo.jpg.jpg";

import {
  MaterialsConfig,
  TubGeometry,
  FrameGeometry,
  mdfBottomDeflection,
  extrusionDeflection,
  bottomDeflectionProfile,
  shortSideDeflectionProfile,
  longSideDeflectionProfile
} from "../calcs";

import Tub3D from "./Tub3D";

type LabelInputProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
};

function LabelInput({ label, value, onChange }: LabelInputProps) {
  return (
    <label style={{ display: "block", marginBottom: "0.5rem" }}>
      <div style={{ fontSize: "0.85rem", marginBottom: "0.15rem" }}>{label}</div>
            <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          padding: "0.25rem 0.4rem",
          width: "8rem",               // ~1/3 column width
          boxSizing: "border-box"
        }}
      />
    </label>
  );
}

const INCH_TO_MM = 25.4;

export default function Page() {
  const materials = materialDefaults.materials as MaterialsConfig;

  const [tub, setTub] = useState<TubGeometry>(defaultTubConfig.tub as TubGeometry);
  // Frame is still used for extrusionDeflection, but no UI controls
  const [frame] = useState<FrameGeometry>(defaultTubConfig.frame as FrameGeometry);

  // --- Calculations ---
  const bottom = mdfBottomDeflection(tub, materials);
  const extr = extrusionDeflection(tub, frame, materials);

  const bottomProfile = bottomDeflectionProfile(tub, materials, 11);
  const shortProfile = shortSideDeflectionProfile(tub, materials, 5);
  const longProfile = longSideDeflectionProfile(tub, materials, 11);

  // Legend lines (for both 2D and 3D; we now only show them in 3D overlay)
  const legend3DLines: string[] = [];

  legend3DLines.push("Bottom δ (mm):");
  bottomProfile.forEach((p, i) => {
    const mm = p.deflection_in * INCH_TO_MM;
    legend3DLines.push(`B${i + 1}: ${mm.toFixed(3)}`);
  });

  legend3DLines.push("");
  legend3DLines.push("Short-side δ (mm):");
  shortProfile.forEach((p, i) => {
    const mm = p.deflection_in * INCH_TO_MM;
    legend3DLines.push(`S${i + 1}: ${mm.toFixed(3)}`);
  });

  legend3DLines.push("");
  legend3DLines.push("Long-side δ (mm):");
  longProfile.forEach((p, i) => {
    const mm = p.deflection_in * INCH_TO_MM;
    legend3DLines.push(`L${i + 1}: ${mm.toFixed(3)}`);
  });

  return (
    <main
      style={{
        padding: "2rem",
        maxWidth: "1400px",
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
     <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
  <img
    src={iwbcLogo.src}
    alt="Ice Works Bath Co Logo"
    style={{ width: "80px", height: "80px", marginRight: "1rem" }}
  />
  <h1 style={{ fontSize: "1.8rem", margin: 0 }}>
    Ice Works Bath Co Tub Deflection Calculator
  </h1>
</div>


            {/* Top layout: left = inputs, right = 3D view */}
      <div
        style={{
          display: "grid",
           gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 3.2fr)",
          gap: "1.5rem",
          alignItems: "flex-start",
          marginBottom: "2rem"
        }}
      >
        {/* LEFT COLUMN: Inputs */}
        <div>
          {/* Tub Geometry */}
          <section style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
              Tub Geometry
            </h2>
            <LabelInput
              label="Length (in)"
              value={tub.L_tub_in}
              onChange={(v) => setTub({ ...tub, L_tub_in: v })}
            />
            <LabelInput
              label="Width (in)"
              value={tub.W_tub_in}
              onChange={(v) => setTub({ ...tub, W_tub_in: v })}
            />
            <LabelInput
              label="Height (in)"
              value={tub.H_tub_in}
              onChange={(v) => setTub({ ...tub, H_tub_in: v })}
            />
            <LabelInput
              label="Bottom Thickness (MDF, in)"
              value={tub.t_mdf_bottom_in}
              onChange={(v) => setTub({ ...tub, t_mdf_bottom_in: v })}
            />
            <LabelInput
              label="Side Thickness (MDF, in)"
              value={tub.t_mdf_side_in}
              onChange={(v) => setTub({ ...tub, t_mdf_side_in: v })}
            />
          </section>

          {/* Water & Supports */}
          <section>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
              Water & Supports
            </h2>
            <LabelInput
              label="Water Depth (in)"
              value={tub.water_freeboard_in}
              onChange={(v) => setTub({ ...tub, water_freeboard_in: v })}
            />
            <LabelInput
              label="# Bottom Transverse Extrusions"
              value={tub.n_transverse}
              onChange={(v) => setTub({ ...tub, n_transverse: v })}
            />
            <LabelInput
              label="# Posts on Long Sides"
              value={tub.n_long_side_posts}
              onChange={(v) => setTub({ ...tub, n_long_side_posts: v })}
            />
            <LabelInput
              label="# Posts on Short Sides"
              value={tub.n_short_side_posts}
              onChange={(v) => setTub({ ...tub, n_short_side_posts: v })}
            />
          </section>
        </div>

        {/* RIGHT COLUMN: 3D Interactive View */}
        <div>
          <h2 style={{ marginTop: 0, marginBottom: "0.3rem" }}>
            3D Interactive View
          </h2>

          <div
            style={{
              position: "relative",
              marginTop: "0.5rem",
              height: "560px"
            }}
          >
            <Tub3D
              tub={tub}
              bottomProfile={bottomProfile}
              shortProfile={shortProfile}
              longProfile={longProfile}
            />

            {/* Instructions overlay */}
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                background: "rgba(255,255,255,0.85)",
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: "0.75rem",
                lineHeight: 1.3,
                maxWidth: 240
              }}
            >
              <strong>3D Controls:</strong>
              <br />
              • Zoom: mouse wheel
              <br />
              • Rotate: left-click + drag
              <br />
              • Pan: right-click or Ctrl + drag
            </div>

            {/* Legend overlay in top-right corner */}
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(255,255,255,0.85)",
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: "0.75rem",
                lineHeight: 1.3,
                maxWidth: 220
              }}
            >
              {legend3DLines.map((line, idx) => (
                <div key={idx}>{line === "" ? <span>&nbsp;</span> : line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Basic numeric summary for bottom and frame */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
          Summary (Center Max Values)
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            fontSize: "0.9rem"
          }}
        >
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "0.5rem 0.75rem"
            }}
          >
            <strong>Bottom MDF Panel</strong>
            <div>Max δ (mm): {(bottom.delta_max * INCH_TO_MM).toFixed(3)}</div>
            <div>Max σ (psi): {bottom.sigma_max.toFixed(1)}</div>
          </div>
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "0.5rem 0.75rem"
            }}
          >
            <strong>Frame Extrusions</strong>
            <div>Max δ (mm): {(extr.delta_max * INCH_TO_MM).toFixed(3)}</div>
            <div>Max σ (psi): {extr.sigma_max.toFixed(1)}</div>
          </div>
        </div>
      </section>

     
        {/* Instructions overlay */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "rgba(255,255,255,0.85)",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: "0.75rem",
            lineHeight: 1.3,
            maxWidth: 240
          }}
        >
          <strong>3D Controls:</strong>
          <br />
          • Zoom: mouse wheel
          <br />
          • Rotate: left-click + drag
          <br />
          • Pan: right-click or Ctrl + drag
        </div>

        {/* Legend overlay in top-right corner */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "rgba(255,255,255,0.85)",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: "0.75rem",
            lineHeight: 1.3,
            maxWidth: 220
          }}
        >
          {legend3DLines.map((line, idx) => (
            <div key={idx}>{line === "" ? <span>&nbsp;</span> : line}</div>
          ))}
        </div>
      </div>
<div
  style={{
    marginTop: "3rem",
    textAlign: "center",
    fontSize: "0.75rem",
    color: "#666",
    letterSpacing: "0.5px"
  }}
>
  ICE WORKS BATH CO © 2025. ALL RIGHTS RESERVED.
</div>

    </main>
  );
}
