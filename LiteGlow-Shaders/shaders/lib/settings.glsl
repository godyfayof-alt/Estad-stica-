// ============================================================
//  LiteGlow - ajustes compartidos (se muestran en el menu de Iris)
// ============================================================

// ---------- SOMBRAS ----------
#define SHADOWS
const int shadowMapResolution = 2048;   // [1024 1536 2048 3072 4096]
const float shadowDistance = 96.0;      // [48.0 64.0 96.0 128.0 160.0]
#define SHADOW_SAMPLES 6                // [4 6 8 12]
#define SHADOW_SOFTNESS 1.5             // [0.5 1.0 1.5 2.0 3.0]
const float sunPathRotation = -25.0;    // [-40.0 -30.0 -25.0 -20.0 -10.0 0.0 10.0 20.0]

// ---------- ILUMINACION ----------
#define DYNAMIC_LIGHTS
#define BLOCKLIGHT_STRENGTH 1.0         // [0.5 0.75 1.0 1.25 1.5]
#define AMBIENT_STRENGTH 1.0            // [0.5 0.75 1.0 1.25 1.5]

// ---------- ATMOSFERA / IMAGEN ----------
#define WAVING
#define FOG_AMOUNT 1.0                  // [0.0 0.5 1.0 1.5 2.0]
#define EXPOSURE 1.0                    // [0.7 0.8 0.9 1.0 1.1 1.2 1.3]
#define SATURATION 1.1                  // [0.8 0.9 1.0 1.1 1.2 1.3]

const float ambientOcclusionLevel = 1.0;
