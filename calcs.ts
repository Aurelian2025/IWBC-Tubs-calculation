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
// Using the same beam model as mdfBottomDeflection
// -------------------------

export function bottomDeflectionProfile(
  tub: TubGeometry,
  materials: MaterialsConfig,
  nPoints: number = 10
): { x_in: number; deflection_in: number }[] {
  // span between extrusions
  const L = tub.L_tub_in / (tub.n_transverse - 1);

  // same load as mdfBottomDeflection: full-width water load
  const w_per_in_strip = uniformLoadBottomStrip(tub, materials); // lb/in for 1" strip
  const w = w_per_in_strip * tub.W_tub_in;                       // lb/in along span

  const b = tub.W_tub_in;
  const t = tub.t_mdf_bottom_in;
  const I = (b * Math.pow(t, 3)) / 12;
  const E = materials.mdf_extira.E_psi;

  const result: { x_in: number; deflection_in: number }[] = [];

  if (nPoints <= 1) {
    const mid = L / 2;
    result.push({
      x_in: mid,
      deflection_in: beamDeflectionUniformAt(L, w, E, I, mid)
    });
    return result;
  }

  const dx = L / (nPoints - 1);

  for (let i = 0; i < nPoints; i++) {
    const x = i * dx;
    const v = beamDeflectionUniformAt(L, w, E, I, x);
    result.push({ x_in: x, deflection_in: v });
  }

  return result;
}

// -------------------------
// Short-side wall deflection profile (5 points)
// Treat each short side as a beam along tub width
// -------------------------

export function shortSideDeflectionProfile(
  tub: TubGeometry,
  materials: MaterialsConfig,
  nPoints: number = 5
): { x_in: number; deflection_in: number }[] {
  const L = tub.W_tub_in; // span along width (short side length)

  const h_water = tub.H_tub_in - tub.water_freeboard_in;
  const gamma = materials.water.gamma_psi_per_in;
  const p_avg = gamma * (h_water / 2); // psi

  // lateral load per unit length on the wall: p_avg * wall height
  const w = p_avg * tub.H_tub_in; // lb/in along width

  const t = tub.t_mdf_side_in;         // thickness of side wall (in)
  const H = tub.H_tub_in;              // wall height (in)
  const I = (H * Math.pow(t, 3)) / 12; // in^4
  const E = materials.mdf_extira.E_psi;

  const result: { x_in: number; deflection_in: number }[] = [];

  if (nPoints <= 1) {
    const mid = L / 2;
    result.push({
      x_in: mid,
      deflection_in: beamDeflectionUniformAt(L, w, E, I, mid)
    });
    return result;
  }

  const dx = L / (nPoints - 1);

  for (let i = 0; i < nPoints; i++) {
    const x = i * dx;
    const v = beamDeflectionUniformAt(L, w, E, I, x);
    result.push({ x_in: x, deflection_in: v });
  }

  return result;
}
// -------------------------
// Long-side wall deflection profile (10 points)
// Treat each long side as a beam along tub length
// -------------------------

export function longSideDeflectionProfile(
  tub: TubGeometry,
  materials: MaterialsConfig,
  nPoints: number = 10
): { x_in: number; deflection_in: number }[] {
  const L = tub.L_tub_in; // span along length (long side length)

  const h_water = tub.H_tub_in - tub.water_freeboard_in;
  const gamma = materials.water.gamma_psi_per_in;
  const p_avg = gamma * (h_water / 2); // psi

  // lateral load per unit length on the wall: p_avg * wall height
  const w = p_avg * tub.H_tub_in; // lb/in along length

  const t = tub.t_mdf_side_in;         // thickness of side wall (in)
  const H = tub.H_tub_in;              // wall height (in)
  const I = (H * Math.pow(t, 3)) / 12; // in^4
  const E = materials.mdf_extira.E_psi;

  const result: { x_in: number; deflection_in: number }[] = [];

  if (nPoints <= 1) {
    const mid = L / 2;
    result.push({
      x_in: mid,
      deflection_in: beamDeflectionUniformAt(L, w, E, I, mid)
    });
    return result;
  }

  const dx = L / (nPoints - 1);

  for (let i = 0; i < nPoints; i++) {
    const x = i * dx;
    const v = beamDeflectionUniformAt(L, w, E, I, x);
    result.push({ x_in: x, deflection_in: v });
  }

  return result;
}
