"use client";
import DeflectionDiagram from "./DeflectionDiagram";
import React, { useState } from "react";

import tubDefaults from "../defaultTub.json";
import materialDefaults from "../materials.json";
import Tub3D from "./Tub3D";

import {
  TubGeometry,
  FrameGeometry,
  MaterialsConfig,
  mdfBottomDeflection,
  extrusionDeflection,
  bottomDeflectionProfile,
  shortSideDeflectionProfile,
  longSideDeflectionProfile
} from "../calcs";

type LabelInputProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
};

function LabelInput({ label, value, onChange }: LabelInputProps) {
  return (
    <label style={{ display: "block", marginBottom: "0.75rem" }}>
      <div style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value || "0"))}
        step={0.1}
        style={{
          padding: "0.3rem 0.4rem",
          width: "100%",
          border: "1px solid #bbb",
          borderRadius: "4px"
        }}
      />
    </label>
  );
}

type ResultsTableProps = {
  data: Record<string, number>;
};

function ResultsTable({ data }: ResultsTableProps) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "1rem",
        fontSize: "0.9rem"
      }}
    >
      <tbody>
        {Object.entries(data).map(([key, val]) => (
          <tr key={key}>
            <td
              style={{
                padding: "6px",
                borderBottom: "1px solid #ddd",
                fontWeight: 600
              }}
            >
              {key}
            </td>
            <td
              style={{
                padding: "6px",
                borderBottom: "1px solid #ddd",
                textAlign: "right"
              }}
            >
              {val.toFixed(5)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Page() {
  const [tub, setTub] = useState<TubGeometry>(tubDefaults.tub as TubGeometry);
  const [frame, setFrame] = useState<FrameGeometry>(
    tubDefaults.frame as FrameGeometry
  );

  const materials = materialDefaults.materials as MaterialsConfig;

  const bottom = mdfBottomDeflection(tub, materials);
  const extr = extrusionDeflection(tub, frame, materials);
const bottomProfile = bottomDeflectionProfile(tub, materials, 10);
const shortProfile = shortSideDeflectionProfile(tub, materials, 5);
const longProfile = longSideDeflectionProfile(tub, materials, 10);

  return (
    <main
      style={{
        padding: "2rem",
        maxWidth: "1100px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <h1>IWBC Tub Deflection Calculator</h1>
      
      {/* Inputs */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          marginTop: "2rem"
        }}
      >
        <div>
          <h2>Tub Geometry</h2>

          <LabelInput
            label="Tub Length L (in)"
            value={tub.L_tub_in}
            onChange={(v) => setTub({ ...tub, L_tub_in: v })}
          />
          <LabelInput
            label="Tub Width W (in)"
            value={tub.W_tub_in}
            onChange={(v) => setTub({ ...tub, W_tub_in: v })}
          />
          <LabelInput
            label="Tub Height H (in)"
            value={tub.H_tub_in}
            onChange={(v) => setTub({ ...tub, H_tub_in: v })}
          />
          <LabelInput
            label="MDF Bottom Thickness (in)"
            value={tub.t_mdf_bottom_in}
            onChange={(v) => setTub({ ...tub, t_mdf_bottom_in: v })}
          />
          <LabelInput
            label="MDF Side Thickness (in)"
            value={tub.t_mdf_side_in}
            onChange={(v) => setTub({ ...tub, t_mdf_side_in: v })}
          />
          <LabelInput
  label="Water Depth (in)"
  value={tub.water_freeboard_in}
  onChange={(v) => setTub({ ...tub, water_freeboard_in: v })}
/>

          <LabelInput
            label="# of Transverse Extrusions"
            value={tub.n_transverse}
            onChange={(v) => setTub({ ...tub, n_transverse: v })}
          />
        </div>

        <div>
          <h2>Frame Geometry</h2>

          <LabelInput
            label="Frame Length (in)"
            value={frame.L_frame_in}
            onChange={(v) => setFrame({ ...frame, L_frame_in: v })}
          />
          <LabelInput
            label="Frame Width (in)"
            value={frame.W_frame_in}
            onChange={(v) => setFrame({ ...frame, W_frame_in: v })}
          />
          <LabelInput
            label="Frame Height (in)"
            value={frame.H_frame_in}
            onChange={(v) => setFrame({ ...frame, H_frame_in: v })}
          />
          <LabelInput
            label="Extrusion Size (mm)"
            value={frame.extr_size_mm}
            onChange={(v) => setFrame({ ...frame, extr_size_mm: v })}
          />
        </div>
      </section>
      
{/* Deflection Visualization */}
<section style={{ marginTop: "3rem" }}>
  <h2>Deflection Visualization</h2>
  <DeflectionDiagram
  tub={tub}
  frame={frame}
  bottom={bottom}
  extr={extr}
  bottomProfile={bottomProfile}
  shortProfile={shortProfile}
  longProfile={longProfile}
/>
<h2 style={{ marginTop: "2rem" }}>3D Interactive View</h2>
<Tub3D
  tub={tub}
  bottomProfile={bottomProfile}   // 10 points (correct)
  shortProfile={shortProfile}     // 5 points (GREEN)
  longProfile={longProfile}       // 10 points (BLUE)
/>


</section>

      {/* Results */}
      <section style={{ marginTop: "3rem" }}>
        <h2>Results – MDF Bottom</h2>
        <ResultsTable
          data={{
            "Span between extrusions (in)": bottom.span,
            "Uniform load w (lb/in)": bottom.w_strip,
            "Max Stress σ (psi)": bottom.sigma_max
          }}
        />

        <h2 style={{ marginTop: "2rem" }}>Results – Transverse Extrusion</h2>
        <ResultsTable
          data={{
            "Extrusion Span (in)": extr.span,
            "Uniform load w (lb/in)": extr.w,
            "Max Stress σ (psi)": extr.sigma_max
          }}
        />
      </section>
    </main>
  );
}
