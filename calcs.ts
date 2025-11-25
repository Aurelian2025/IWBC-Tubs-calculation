// calcs.ts
// Core deflection formulas and calculation logic

// -------------------------
// Type Definitions
// -------------------------

export type MaterialsConfig = {
  water: { gamma_psi_per_in: number };
  mdf_extira: { E_psi: number };
  aluminum_2525: { E_psi: number; I_in4: number; c_in: number };
};

export type TubGeometry = {
  L_tub_in: number;
  W_tub_in: number;
  H_tub_in: number;

  t_mdf_bottom_in: number;
  t_mdf_side_in: number;

  water_freeboard_in: number;

  n_transverse: number;
};

export type FrameGeometry = {
  L_frame_in: number;
  W_frame_in: number;
  H_frame_in: number;

  extr_size_mm: number; // size of the 2525 extrusion side, in mm
};

// -------------------------
// Beam Formulas
// -------------------------

// Simply supported beam under uniform load
export function beamDeflectionUniform(
  L: number, // span (in)
  w: number, // uniform load (lb/in)
  E: number, // modulus (psi)
  I: number  // moment of inertia (in^4)
) {
  const M_max = (w * L * L) / 8;
  const delta_max = (5 * w * Math.pow(L, 4)) / (384 * E * I);
  return { M_max, delta_max };
}

// -------------------------
// Load Calculations
// -------------------------

// Uniform load per inch-width on tub bottom panel
export function uniformLoadBottomStrip(
  tub: TubGeometry,
  materials: MaterialsConfig
): number {
  const h_water = tub.H_tub_in - tub.water_freeboard_in; // in
  const gamma = materials.water.gamma_psi_per_in;

  // approximate average pressure over depth
  const p_mid = gamma * (h_water / 2); // psi
  const b_strip = 1.0;                 // 1-inch wide strip

  const w = p_mid * b_strip;           // lb/in
  return w;
}

// -------------------------
// MDF Bottom Deflection
// -------------------------

export function mdfBottomDeflection(
  tub: TubGeometry,
  materials: MaterialsConfig
) {
  // distance between transverse extrusions
  const span = tub.L_tub_in / (tub.n_transverse - 1);
  const w_strip = uniformLoadBottomStrip(tub, materials);

  const b = tub.W_tub_in;        // width of bottom plate acting as a beam (in)
  const t = tub.t_mdf_bottom_in; // thickness (in)

  const I = (b * Math.pow(t, 3)) / 12; // in^4
  const c = t / 2;

  const { M_max, delta_max } = beamDeflectionUniform(
    span,
    w_strip,
    materials.mdf_extira.E_psi,
    I
  );

  const sigma_max = (M_max * c) / I;

  return {
    span,
    w_strip,
    M_max,
    delta_max,
    sigma_max
  };
}

// -------------------------
// Extrusion Deflection
// -------------------------

export function extrusionDeflection(
  tub: TubGeometry,
  frame
