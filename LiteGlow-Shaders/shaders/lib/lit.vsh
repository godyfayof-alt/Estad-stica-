#include "/lib/settings.glsl"
#include "/lib/wave.glsl"

attribute vec4 mc_Entity;
attribute vec2 mc_midTexCoord;

uniform mat4 gbufferModelView;
uniform mat4 gbufferModelViewInverse;
uniform vec3 cameraPosition;
uniform vec3 sunPosition;
uniform vec3 shadowLightPosition;
uniform float frameTimeCounter;
uniform float rainStrength;

varying vec2 texcoord;
varying vec2 lmcoord;
varying vec4 glcolor;
varying vec3 normalV;
varying vec3 normalW;
varying vec3 viewPos;
varying vec3 playerPos;
varying vec3 lightDirV;
varying vec3 lightDirW;
varying vec3 ambientCol;
varying vec3 directCol;
varying float dayF;
varying float isWater;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    lmcoord  = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
    glcolor  = gl_Color;

    vec3 nV = normalize(gl_NormalMatrix * gl_Normal);
    vec3 pp = (gbufferModelViewInverse * (gl_ModelViewMatrix * gl_Vertex)).xyz;
    isWater = 0.0;

#ifdef TERRAIN
    float id = mc_Entity.x;
    isWater = float(id > 10001.5 && id < 10002.5);
    if (id > 10000.5 && id < 10001.5) {                  // plantas: normal hacia arriba
        nV = normalize(mat3(gbufferModelView) * vec3(0.0, 1.0, 0.0));
    }
    #ifdef WAVING
    if (id > 10000.5 && id < 10001.5) {
        float top = float(gl_MultiTexCoord0.t < mc_midTexCoord.t);
        pp += waveOffset(pp + cameraPosition, frameTimeCounter, 1.0, top, rainStrength);
    } else if (id > 10002.5 && id < 10003.5) {
        pp += waveOffset(pp + cameraPosition, frameTimeCounter, 2.0, 1.0, rainStrength);
    }
    #endif
#endif

    mat3 invRot = mat3(gbufferModelViewInverse);
    vec4 vp = gbufferModelView * vec4(pp, 1.0);
    viewPos   = vp.xyz;
    playerPos = pp;
    normalV   = nV;
    normalW   = invRot * nV;
    lightDirV = normalize(shadowLightPosition);
    lightDirW = invRot * lightDirV;

    // ---- colores del cielo segun la hora (calculados por vertice, no por pixel) ----
    float sunH = normalize(invRot * sunPosition).y;
    dayF = smoothstep(-0.12, 0.25, sunH);
    float dusk = 1.0 - smoothstep(0.0, 0.35, abs(sunH));

    vec3 amb = mix(vec3(0.055, 0.075, 0.16), vec3(0.50, 0.62, 0.86), dayF);
    amb *= mix(vec3(1.0), vec3(1.18, 0.92, 0.82), dusk * dayF);
    float l = dot(amb, vec3(0.333));
    amb = mix(amb, vec3(l * 0.9), rainStrength * 0.5);

    float sunStr  = smoothstep(0.0, 0.10, sunH);
    float moonStr = smoothstep(0.0, 0.10, -sunH);
    vec3 sunCol  = mix(vec3(1.0, 0.50, 0.22), vec3(1.0, 0.92, 0.80), smoothstep(0.0, 0.5, sunH)) * 1.9;
    vec3 moonCol = vec3(0.32, 0.45, 0.90) * 0.35;
    ambientCol = amb * AMBIENT_STRENGTH;
    directCol  = (sunCol * sunStr + moonCol * moonStr) * (1.0 - 0.85 * rainStrength);

    gl_Position = gl_ProjectionMatrix * vp;
}
