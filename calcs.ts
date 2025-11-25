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
// Plate helpers
// -------------------------

// approximate Poisson's ratio for MDF
const POISSON_MDF = 0.30;
// approximate coefficient for max deflection of simply supported plate, uniform load
const PLATE_DEFLECTION_COEFF = 0.004; // dimensionless

// Flexural rigidity of a plate: D = E t^3 / [12 (1 - ν^2)]
function plateFlexuralRigidity(
  E_psi: number,
  t_in: number,
  nu: number = POISSON_MDF
  
) {
  return (E_psi * Math.pow(t_in, 3)) / (12 * (1 - nu * nu));
}

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
  // water_freeboard_in is actually water depth from the bottom
const h_water = Math.min(tub.water_freeboard_in, tub.H_tub_in); // inches
  const gamma = materials.water.gamma_psi_per_in;

  // average hydrostatic pressure across the depth
  const p_mid = gamma * (h_water / 2); // psi
  const b_strip = 1.0; // 1 inch wide strip

  return p_mid * b_strip; // lb/in
}

// -------------------------
// MDF Bottom Deflection (plate model, 4 edges simply supported)
// -------------------------

export function mdfBottomDeflection(
  tub: TubGeometry,
  materials: MaterialsConfig
) {
  // We interpret water_freeboard_in as **water depth from the bottom**
  const h_water = Math.min(tub.water_freeboard_in, tub.H_tub_in); // in
  const gamma = materials.water.gamma_psi_per_in;                 // psi per inch of depth

  // Uniform pressure on the bottom (psi = lb/in^2)
  const q_bottom = gamma * h_water;

  // Plate dimensions: bottom of the tub
  const a = Math.min(tub.L_tub_in, tub.W_tub_in); // shorter side (in)
  const b = Math.max(tub.L_tub_in, tub.W_tub_in); // longer side (in)

  const t = tub.t_mdf_bottom_in;         // thickness (in)
  const E = materials.mdf_extira.E_psi;  // psi
  const D = plateFlexuralRigidity(E, t); // lb·in

  // Max deflection of a simply supported rectangular plate under uniform load:
  // w_max ≈ q * a^4 / (64 * D)
  const delta_max =
  PLATE_DEFLECTION_COEFF * (q_bottom * Math.pow(a, 4)) / D;


  // For stress, approximate plate as a beam spanning along the short side a
  // line load w_line = q_bottom * b (lb/in)
  const w_line = q_bottom * b;            // lb/in along span a
  const I_beam = (b * Math.pow(t, 3)) / 12; // in^4
  const c = t / 2;

  // Simply supported beam, uniform load: M_max = wL^2 / 8
  const M_max = (w_line * Math.pow(a, 2)) / 8;
  const sigma_max = (M_max * c) / I_beam;

  return {
    span: a,         // effective span (shorter side)
    w_strip: w_line, // line load along that span
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

  // water_freeboard_in is actually water depth from the bottom
const h_water = Math.min(tub.water_freeboard_in, tub.H_tub_in);

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
// 4-edge simply supported plate; profile along tub length
// -------------------------

export function bottomDeflectionProfile(
  tub: TubGeometry,
  materials: MaterialsConfig,
  nPoints: number = 10
): { x_in: number; deflection_in: number }[] {
  // water_freeboard_in is used as water depth from the bottom (in)
  const h_water = Math.min(tub.water_freeboard_in, tub.H_tub_in);
  const gamma = materials.water.gamma_psi_per_in; // psi per inch of depth

  // Uniform pressure on the bottom (psi)
  const q_bottom = gamma * h_water;

  // Plate properties: use same as mdfBottomDeflection
  const a = Math.min(tub.L_tub_in, tub.W_tub_in); // shorter side of plate (in)
  const t = tub.t_mdf_bottom_in;                  // thickness (in)
  const E = materials.mdf_extira.E_psi;           // psi
  const D = plateFlexuralRigidity(E, t);          // lb·in

  // Max deflection from plate theory (simply supported, uniform load)
  // w_max ≈ q * a^4 / (64 * D)
  const w_max =
  PLATE_DEFLECTION_COEFF * (q_bottom * Math.pow(a, 4)) / D;


  // We sample deflection along the tub length (L direction)
  const L_len = tub.L_tub_in;
  const n = nPoints < 2 ? 2 : nPoints;
  const dx = L_len / (n - 1);

  const result: { x_in: number; deflection_in: number }[] = [];

  for (let i = 0; i < n; i++) {
    const x = i * dx;

    // Simple mode shape along length: 0 at x=0 and x=L, max at midspan
    // w(x) ≈ w_max * sin(pi * x / L)
    const shape = Math.sin((Math.PI * x) / L_len);
    const w = w_max * shape;

    result.push({ x_in: x, deflection_in: w });
  }

  return result;
}


// -------------------------
// Short-side wall deflection profile (5 points)
// 4-edge simply supported plate under average lateral pressure
// -------------------------

export function shortSideDeflectionProfile(
  tub: TubGeometry,
  materials: MaterialsConfig,
  nPoints: number = 5
): { x_in: number; deflection_in: number }[] {
  // water_freeboard_in is used as water depth from the bottom (in)
  const h_water = Math.min(tub.water_freeboard_in, tub.H_tub_in);
  const gamma = materials.water.gamma_psi_per_in; // psi per inch of depth

  // Lateral pressure on wall is triangular from 0 at free surface to γ*h at bottom.
  // We approximate the plate as under uniform **average** pressure:
  // q_side ≈ (γ * h_water) / 2
  const q_side = gamma * h_water * 0.5; // psi

  // Plate dimensions for the short side (right wall):
  // a = shorter side (vertical height), b = longer side (horizontal width)
  const a = tub.H_tub_in; // height (in)
  const b = tub.W_tub_in; // width (in) – we sample deflection along this direction

  const t = tub.t_mdf_side_in;        // wall thickness (in)
  const E = materials.mdf_extira.E_psi;
  const D = plateFlexuralRigidity(E, t); // lb·in

  // Max deflection of a simply supported rectangular plate under uniform load:
  // w_max ≈ q * a^4 / (64 * D)
  const w_max =
  PLATE_DEFLECTION_COEFF * (q_side * Math.pow(a, 4)) / D;


  // We sample deflection along the width b, from 0 to b
  const n = nPoints < 2 ? 2 : nPoints;
  const dx = b / (n - 1);

  const result: { x_in: number; deflection_in: number }[] = [];

  for (let i = 0; i < n; i++) {
    const x = i * dx;

    // Simple mode shape along width: 0 at edges, max at middle
    // w(x) ≈ w_max * sin(pi * x / b)
    const shape = Math.sin((Math.PI * x) / b);
    const w = w_max * shape;

    result.push({ x_in: x, deflection_in: w });
  }

  return result;
}


// -------------------------
// Long-side wall deflection profile (10 points)
// 4-edge simply supported plate under average lateral pressure
// -------------------------

export function longSideDeflectionProfile(
  tub: TubGeometry,
  materials: MaterialsConfig,
  nPoints: number = 10
): { x_in: number; deflection_in: number }[] {
  // water_freeboard_in is used as water depth from the bottom (in)
  const h_water = Math.min(tub.water_freeboard_in, tub.H_tub_in);
  const gamma = materials.water.gamma_psi_per_in; // psi per inch of depth

  // Lateral pressure on wall is triangular from 0 at free surface to γ*h at bottom.
  // Approximate as uniform **average** pressure:
  // q_side ≈ (γ * h_water) / 2
  const q_side = gamma * h_water * 0.5; // psi

  // Plate dimensions for the long side wall:
  // a = shorter side (vertical height), b = longer side (horizontal length)
  const a = tub.H_tub_in; // height (in)
  const b = tub.L_tub_in; // length (in) – we sample deflection along this direction

  const t = tub.t_mdf_side_in;        // wall thickness (in)
  const E = materials.mdf_extira.E_psi;
  const D = plateFlexuralRigidity(E, t); // lb·in

  // Max deflection of a simply supported rectangular plate under uniform load:
  // w_max ≈ q * a^4 / (64 * D)
  const w_max =
  PLATE_DEFLECTION_COEFF * (q_side * Math.pow(a, 4)) / D;


  // We sample deflection along the length b, from 0 to b
  const n = nPoints < 2 ? 2 : nPoints;
  const dx = b / (n - 1);

  const result: { x_in: number; deflection_in: number }[] = [];

  for (let i = 0; i < n; i++) {
    const x = i * dx;

    // Simple mode shape along length: 0 at edges, max at middle
    // w(x) ≈ w_max * sin(pi * x / b)
    const shape = Math.sin((Math.PI * x) / b);
    const w = w_max * shape;

    result.push({ x_in: x, deflection_in: w });
  }

  return result;
}


