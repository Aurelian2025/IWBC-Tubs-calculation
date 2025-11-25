// calcs.ts — MINIMAL SAFE VERSION
// This is only to get Vercel to compile. We'll re-add real math after it passes.

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

  extr_size_mm: number;
};

// Return dummy values so build can succeed
export function mdfBottomDeflection() {
  return {
    span: 0,
    w_strip: 0,
    M_max: 0,
    delta_max: 0,
    sigma_max: 0
  };
}

export function extrusionDeflection() {
  return {
    span: 0,
    w: 0,
    M_max: 0,
    delta_max: 0,
    sigma_max: 0
  };
}
