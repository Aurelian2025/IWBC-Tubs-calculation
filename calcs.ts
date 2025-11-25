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

  extr_size_mm: number; // 25×25 extrusion side dimension, mm
};

// -------------------------
// Beam Formulas
// -------------------------

// Simply supported beam under uniform load
export function beamDeflectionUniform(
  L: number, // span in inches
  w: number, // uniform load lb/in
  E: number, // modulus psi
  I: number  // moment of inertia in^4
) {
  const M_max = (w * L * L) / 8;
  const delta_max = (5 * w * Math.pow(L, 4)) / (384 * E * I);
  return { M_max, delta_max };
}
// Deflection shape for a simply supported beam with uniform load
// x from 0 to L
export function beamDeflectionUniformAt(
  L: number,
  w: number,
  E: number,
  I: number,
  x: number
): number {
  // v(x) = w x (L^3 - 2 L x^2 + x^3) / (24 E I)
  return (w * x * (Math.pow(L, 3) - 2 * L * Math.pow(x, 2) + Math.pow(x, 3))) /
    (24 * E * I);
}

// -------------------------
// Load Calculations
// -------------------------

// Load per inch strip on tub bottom
export function uniformLoadBottomStrip(
  tub: TubGeometry,
  materials: MaterialsConfig
): number {
  const h_water = tub.H_tub_in - tub.water_freeboard_in; // inches
  const gamma = materials.water.gamma_psi_per_in;

  // average hydrostatic pressure across the depth
  const p_mid = gamma * (h_water / 2); // psi
  const b_strip = 1.0; // 1 inch wide strip

  return p_mid * b_strip; // lb/in
}

// -------------------------
// MDF Bottom Deflection
// -------------------------

export function mdfBottomDeflection(
  tub: TubGeometry,
  materials: MaterialsConfig
) {
  const span = tub.L_tub_in / (tub.n_transverse - 1); // spacing between beams

  // Load for the full bottom width
  const w_per_in_strip = uniformLoadBottomStrip(tub, materials); // lb/in for 1" strip
  const w_total = w_per_in_strip * tub.W_tub_in;                 // lb/in along span

  const b = tub.W_tub_in;             // width of plate (in)
  const t = tub.t_mdf_bottom_in;      // thickness (in)

  const I = (b * Math.pow(t, 3)) / 12; // moment of inertia (in^4)
  const c = t / 2;

  const { M_max, delta_max } = beamDeflectionUniform(
    span,
    w_total,
    materials.mdf_extira.E_psi,
    I
  );

  const sigma_max = (M_max * c) / I;

  return {
    span,
    w_strip: w_total, // rename in UI later if you want
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
  frame: FrameGeometry,
  materials: MaterialsConfig
) {
  // convert extrusion size to inches
  const extrSizeIn = frame.extr_size_mm / 25.4;

    // clear span of each extrusion
  const L = frame.W_frame_in - 2 * extrSizeIn;

  // tributary length on each extrusion
  const trib_L = tub.L_tub_in / tub.n_transverse;

  const h_water = tub.H_tub_in - tub.water_freeboard_in;
  const gamma = materials.water.gamma_psi_per_in;

  // average hydrostatic pressure along depth
  const p_avg = gamma * (h_water / 2); // psi

  const area = trib_L * tub.W_tub_in;  // in^2
  const total_load = p_avg * area;     // lb

  const w = total_load / L;            // lb/in

  const { M_max, delta_max } = beamDeflectionUniform(
    L,
    w,
    materials.aluminum_2525.E_psi,
    materials.aluminum_2525.I_in4
  );

  const sigma_max =
    (M_max * materials.aluminum_2525.c_in) / materials.aluminum_2525.I_in4;

  return {
    span: L,
    w,
    M_max,
    delta_max,
    sigma_max
  };
}

// -------------------------
// Bottom deflection profile (10 points)
// Repeats the span between extrusions along the full tub length
// -------------------------
export function bottomDeflectionProfile(
  tub: TubGeometry,
  materials: MaterialsConfig,
  nPoints: number = 10
): { x_in: number; deflection_in: number }[] {
  const L_total = tub.L_tub_in;
  const L_span = tub.L_tub_in / (tub.n_transverse - 1); // distance between extrusions

  // same load as mdfBottomDeflection: full-width water load
  const h_water = tub.H_tub_in - tub.water_freeboard_in;
  const gamma = materials.water.gamma_psi_per_in;
  const p_avg = gamma * (h_water / 2);           // psi
  const w_per_in_strip = p_avg * 1;              // lb/in on 1" strip
  const w = w_per_in_strip * tub.W_tub_in;       // lb/in along span

  const b = tub.W_tub_in;
  const t = tub.t_mdf_bottom_in;
  const I = (b * Math.pow(t, 3)) / 12;
  const E = materials.mdf_extira.E_psi;

  const result: { x_in: number; deflection_in: number }[] = [];

  if (nPoints <= 1) {
    const mid = L_span / 2;
    result.push({
      x_in: mid,
      deflection_in: beamDeflectionUniformAt(L_span, w, E, I, mid)
    });
    return result;
  }

  const dx_total = L_total / (nPoints - 1);

  for (let i = 0; i < nPoints; i++) {
    const x_global = i * dx_total;
    const x_local = x_global % L_span; // position within a span
    const v = beamDeflectionUniformAt(L_span, w, E, I, x_local);
    result.push({ x_in: x_global, deflection_in: v });
  }

  return result;
}


// -------------------------
// Short-side wall deflection profile (5 points)
// Right wall treated as 2 spans (1 post in the middle)
// -------------------------
export function shortSideDeflectionProfile(
  tub: TubGeometry,
  materials: MaterialsConfig,
  nPoints: number = 5
): { x_in: number; deflection_in: number }[] {
  const W_total = tub.W_tub_in;
  const n_spans = 2;                // one post in the middle
  const L_span = W_total / n_spans;

  const h_water = tub.H_tub_in - tub.water_freeboard_in;
  const gamma = materials.water.gamma_psi_per_in;

  // lateral line load on wall: integrate p(z)=gamma*z from 0..h
  // w = gamma * h^2 / 2   (lb/in)
  const w = gamma * h_water * h_water / 2;

  const t = tub.t_mdf_side_in;
  const H = tub.H_tub_in;           // full wall height for stiffness
  const I = (H * Math.pow(t, 3)) / 12;
  const E = materials.mdf_extira.E_psi;

  const result: { x_in: number; deflection_in: number }[] = [];

  if (nPoints <= 1) {
    const mid = L_span / 2;
    result.push({
      x_in: mid,
      deflection_in: beamDeflectionUniformAt(L_span, w, E, I, mid)
    });
    return result;
  }

  const dx_total = W_total / (nPoints - 1);

  for (let i = 0; i < nPoints; i++) {
    const x_global = i * dx_total;
    const x_local = x_global % L_span;
    const v = beamDeflectionUniformAt(L_span, w, E, I, x_local);
    result.push({ x_in: x_global, deflection_in: v });
  }

  return result;
}

// -------------------------
// Long-side wall deflection profile (10 points)
// Long wall has 3 posts -> 4 spans
// -------------------------
export function longSideDeflectionProfile(
  tub: TubGeometry,
  materials: MaterialsConfig,
  nPoints: number = 10
): { x_in: number; deflection_in: number }[] {
  const L_total = tub.L_tub_in;
  const n_spans = 4;                 // 3 posts + 2 corners
  const L_span = L_total / n_spans;

  const h_water = tub.H_tub_in - tub.water_freeboard_in;
  const gamma = materials.water.gamma_psi_per_in;
  const w = gamma * h_water * h_water / 2; // lb/in lateral

  const t = tub.t_mdf_side_in;
  const H = tub.H_tub_in;
  const I = (H * Math.pow(t, 3)) / 12;
  const E = materials.mdf_extira.E_psi;

  const result: { x_in: number; deflection_in: number }[] = [];

  if (nPoints <= 1) {
    const mid = L_span / 2;
    result.push({
      x_in: mid,
      deflection_in: beamDeflectionUniformAt(L_span, w, E, I, mid)
    });
    return result;
  }

  const dx_total = L_total / (nPoints - 1);

  for (let i = 0; i < nPoints; i++) {
    const x_global = i * dx_total;
    const x_local = x_global % L_span;
    const v = beamDeflectionUniformAt(L_span, w, E, I, x_local);
    result.push({ x_in: x_global, deflection_in: v });
  }

  return result;
}

