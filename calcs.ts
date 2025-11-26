
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

  // water depth (in)
  water_freeboard_in: number;

  // bottom transverse extrusions (2525)
  n_transverse: number;

  // NEW: transverse stiffeners / posts on the long side walls
  n_long_side_posts: number;   // per long wall

  // NEW: transverse stiffeners / posts on the short side walls
  n_short_side_posts: number;  // per short wall
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
// Normalized plate measurement points (u,v) in [0,1]x[0,1]
// Pattern roughly matches your image: 4 top, 2 mid, 4 bottom.
const PLATE_SAMPLE_POINTS: { u: number; v: number }[] = [
  { u: 0.05, v: 0.80 },
  { u: 1 / 3, v: 0.80 },
  { u: 2 / 3, v: 0.80 },
  { u: 0.95, v: 0.80 },

  { u: 0.15, v: 0.50 },
  { u: 0.85, v: 0.50 },

  { u: 0.05, v: 0.20 },
  { u: 1 / 3, v: 0.20 },
  { u: 2 / 3, v: 0.20 },
  { u: 0.95, v: 0.20 },
 { u: 0.50, v: 0.50 }  // NEW center point
];
// Short-side 5-point layout: 4 near corners + 1 in center
const SHORT_SAMPLE_POINTS_5: { u: number; v: number }[] = [
  { u: 0.05, v: 0.10 }, // bottom-front corner
  { u: 0.95, v: 0.10 }, // bottom-back corner
  { u: 0.50, v: 0.50 }, // center
  { u: 0.05, v: 0.90 }, // top-front corner
  { u: 0.95, v: 0.90 }  // top-back corner
];


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

    // Plate dimensions: bottom of the tub, broken into panels by transverse extrusions
  // Treat n_transverse as the number of supports along the length.
  const nPanels = Math.max(2, tub.n_transverse);  // at least two supports
  const panelLen = tub.L_tub_in / (nPanels - 1);  // spacing between extrusions (in)

  // Use the panel span as the "shorter side" of the plate
  const a = Math.min(panelLen, tub.W_tub_in);     // effective short side (in)
  const b = Math.max(panelLen, tub.W_tub_in);     // long side (in)

  const t = tub.t_mdf_bottom_in;         // thickness (in)
  const E = materials.mdf_extira.E_psi;  // psi
  const D = plateFlexuralRigidity(E, t); // lb·in

  const delta_max =
    PLATE_DEFLECTION_COEFF * (q_bottom * Math.pow(a, 4)) / D;

  // For stress, approximate as a beam spanning along the short side a,
  // with tributary width b (one panel)
  const w_line = q_bottom * b;              // lb/in along span a
  const I_beam = (b * Math.pow(t, 3)) / 12; // in^4
  const c = t / 2;

  const M_max = (w_line * Math.pow(a, 2)) / 8;
  const sigma_max = (M_max * c) / I_beam;

  return {
    span: a,
    w_strip: w_line,
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

    // Plate properties: panel between bottom extrusions, same as mdfBottomDeflection
  const nPanels = Math.max(2, tub.n_transverse);
  const panelLen = tub.L_tub_in / (nPanels - 1);
  const a = Math.min(panelLen, tub.W_tub_in); // effective short side (in)

  const t = tub.t_mdf_bottom_in;                  // thickness (in)
  const E = materials.mdf_extira.E_psi;           // psi
  const D = plateFlexuralRigidity(E, t);          // lb·in

  const w_max =
    PLATE_DEFLECTION_COEFF * (q_bottom * Math.pow(a, 4)) / D;

  const L_len = tub.L_tub_in; // length direction
  const W_len = tub.W_tub_in; // width direction

  const pts = PLATE_SAMPLE_POINTS.slice(0, nPoints);

  const result: { x_in: number; deflection_in: number }[] = [];

  for (const p of pts) {
    const u = p.u; // 0..1 along length
    const v = p.v; // 0..1 along width

    // physical position in inches (we only return x for now)
    const x = u * L_len;
    // const y = v * W_len; // could be returned later if needed

    // plate mode shape: 0 at edges, max at center
    const shape = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
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
  const h_water = Math.min(tub.water_freeboard_in, tub.H_tub_in);
  const gamma = materials.water.gamma_psi_per_in;

  // average lateral pressure on wall
  const q_side = gamma * h_water * 0.5; // psi

  // vertical span (height)
  const a = tub.H_tub_in;

  // FULL width of the short-side wall
  const b_full = tub.W_tub_in;

  // posts divide the width into equal panels
  // use 0 if the field is missing/undefined so we fall back to old behavior
  const nShortRaw = tub.n_short_side_posts ?? 0;
  const nShort = nShortRaw > 0 ? nShortRaw : 0;

  const b_panel = b_full / (nShort + 1); // panel width between posts

  const t = tub.t_mdf_side_in;
  const E = materials.mdf_extira.E_psi;
  const D = plateFlexuralRigidity(E, t);

  // base plate deflection using full height
  let w_max =
    PLATE_DEFLECTION_COEFF * (q_side * Math.pow(a, 4)) / D;

  // if b_full is valid, scale deflection by (panel width / full width)^4 → stiffer with more posts
  if (b_full > 0) {
    w_max *= Math.pow(b_panel / b_full, 4);
  }

  const pts = SHORT_SAMPLE_POINTS_5.slice(0, nPoints);

  const result: { x_in: number; deflection_in: number }[] = [];

  for (const p of pts) {
    const u = p.u; // 0..1 across the full width
    const v = p.v; // 0..1 along height

    // physical x-position uses FULL width (for drawing and labeling)
    const x = u * b_full;

    const shape = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    const w = w_max * shape;

    result.push({ x_in: x, deflection_in: w });
  }

  return result;
}


// -------------------------
// Long-side wall deflection profile (10 points)
// 4-edge simply supported plate under average lateral pressure
// -------------------------

// -------------------------
// Long-side wall deflection profile (using posts)
// -------------------------

export function longSideDeflectionProfile(
  tub: TubGeometry,
  materials: MaterialsConfig,
  nPoints: number = 11
): { x_in: number; deflection_in: number }[] {
  const h_water = Math.min(tub.water_freeboard_in, tub.H_tub_in);
  const gamma = materials.water.gamma_psi_per_in;

  // average lateral pressure on wall
  const q_side = gamma * h_water * 0.5; // psi

  // vertical span (height)
  const a = tub.H_tub_in;

  // FULL length of the long-side wall
  const b_full = tub.L_tub_in;

  // posts divide the length into equal panels
  // if the field is missing, fall back to 0 posts (old behavior)
  const nLongRaw = tub.n_long_side_posts ?? 0;
  const nLong = nLongRaw > 0 ? nLongRaw : 0;

  const b_panel = b_full / (nLong + 1); // panel length between posts

  const t = tub.t_mdf_side_in;
  const E = materials.mdf_extira.E_psi;
  const D = plateFlexuralRigidity(E, t);

  // base plate deflection using full height
  let w_max =
    PLATE_DEFLECTION_COEFF * (q_side * Math.pow(a, 4)) / D;

  // scale deflection by (panel length / full length)^4 → more posts = stiffer
  if (b_full > 0) {
    w_max *= Math.pow(b_panel / b_full, 4);
  }

  const pts = PLATE_SAMPLE_POINTS.slice(0, nPoints);

  const result: { x_in: number; deflection_in: number }[] = [];

  for (const p of pts) {
    const u = p.u; // 0..1 along FULL length
    const v = p.v; // 0..1 along height

    // physical x-position uses FULL length (for drawing/labels)
    const x = u * b_full;

    const shape = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    const w = w_max * shape;

    result.push({ x_in: x, deflection_in: w });
  }

  return result;
}

