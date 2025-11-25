"use client";

import { useState } from "react";
import tubDefaults from "../defaultTub.json";
import materialDefaults from "../materials.json";

import {
  TubGeometry,
  FrameGeometry,
  MaterialsConfig,
  mdfBottomDeflection,
  extrusionDeflection
} from "../calcs";

// ---------------------------------------
// UI Helpers
// ---------------------------------------

function LabelInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "block", marginBottom: "0.75rem" }}>
      <div style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>
        {label}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step="0.1"
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

function ResultsTable({ data }: { data: Record<string, number> }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "1rem"
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
                borderBottom: "1px solid #ddd"
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

// ---------------------------------------
// Main Page
// ---------------------------------------

export default function Page() {
  const [tub, setTub] = useState<TubGeometry>(tubDefaults.tub);
  const [frame, setFrame] = useState<FrameGeometry>(tubDefaults.frame);
  const materials = materialDefaults.materials as MaterialsConfig;

  const bottom = mdfBottomDeflection(tub, materials);
  const extr = extrusionDeflection(tub, frame, materials);

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
      <p>
        Values are loaded from <code>materials.json</code> and{" "}
        <code>defaultTub.json</code>.
      </p>

      {/* -------------------------------------------------- */}
      {/* Tub & Frame Inputs                                 */}
      {/* -------------------------------------------------- */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          marginTop: "2rem"
        }}
      >
        {/* Tub section */}
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
            label="Water Freeboard (in)"
            value={tub.water_freeboard_in}
            onChange={(v) => setTub({ ...tub, water_freeboard_in: v })}
          />
          <LabelInput
            label="# of Transverse Extrusions"
            value={tub.n_transverse}
            onChange={(v) => setTub({ ...tub, n_transverse: v })}
          />
        </div>

        {/* Frame section */}
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
            onChange={(v) =>
