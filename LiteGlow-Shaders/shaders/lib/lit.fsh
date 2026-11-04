#include "/lib/settings.glsl"
#include "/lib/common.glsl"

uniform sampler2D texture;
#if defined SHADOWS && !defined PARTICLES
uniform sampler2D shadowtex1;
uniform mat4 shadowModelView;
uniform mat4 shadowProjection;
#endif
uniform vec4 entityColor;
uniform int heldBlockLightValue;
uniform int heldBlockLightValue2;
uniform int isEyeInWater;
uniform float nightVision;
uniform float rainStrength;
uniform float far;
uniform float frameTimeCounter;
uniform vec3 fogColor;
uniform vec3 skyColor;
uniform vec3 cameraPosition;

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

#if defined SHADOWS && !defined PARTICLES
float interleavedNoise(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

// 1.0 = iluminado, 0.0 = en sombra
float getShadow(float NdotL, float dist) {
    vec3 p = playerPos + normalW * (0.04 + 0.12 * (1.0 - NdotL));
    vec4 sp = shadowProjection * (shadowModelView * vec4(p, 1.0));
    float df = length(sp.xy) * 0.9 + 0.1;            // misma distorsion que shadow.vsh
    sp.xy /= df;
    sp.xyz = sp.xyz * 0.5 + 0.5;
    if (sp.x < 0.0 || sp.x > 1.0 || sp.y < 0.0 || sp.y > 1.0 || sp.z > 1.0) return 1.0;
    sp.z -= 0.0005;

    float radius = SHADOW_SOFTNESS / float(shadowMapResolution);
    float rot = interleavedNoise(gl_FragCoord.xy) * 6.2831853;
    float s = 0.0;
    for (int i = 0; i < SHADOW_SAMPLES; i++) {
        float fi = float(i);
        float r = sqrt((fi + 0.5) / float(SHADOW_SAMPLES));
        float a = fi * 2.3999632 + rot;
        vec2 o = vec2(cos(a), sin(a)) * (r * radius);
        s += step(sp.z, texture2D(shadowtex1, sp.xy + o).r);
    }
    s /= float(SHADOW_SAMPLES);
    return mix(s, 1.0, smoothstep(0.8, 1.0, dist / shadowDistance));
}
#endif

void main() {
    vec4 tex = texture2D(texture, texcoord) * glcolor;
    if (tex.a < 0.1) discard;
    tex.rgb = mix(tex.rgb, entityColor.rgb, entityColor.a);

    vec3 albedo = tex.rgb * tex.rgb;                  // sRGB -> lineal (aprox. barata)
    vec2 lm = clamp((lmcoord - 0.03125) * 1.0667, 0.0, 1.0);
    float skyL = lm.y;
    vec3 N = normalize(normalV);
    float dist = length(viewPos);

    // ---------- luz natural: sol / luna con sombras ----------
    vec3 direct = vec3(0.0);
    float strength = dot(directCol, vec3(0.333));
#ifdef PARTICLES
    direct = directCol * 0.5 * smoothstep(0.3, 0.8, skyL);
#else
    float NdotL = dot(N, lightDirV);
    if (strength > 0.01 && NdotL > 0.0 && skyL > 0.1) {
        float sh = 1.0;
    #ifdef SHADOWS
        sh = getShadow(NdotL, dist);
    #endif
        direct = directCol * (NdotL * sh * smoothstep(0.35, 0.8, skyL));
    }
#endif

    // ---------- luz ambiente del cielo ----------
    vec3 ambient = ambientCol * (skyL * skyL) + vec3(0.012) + vec3(0.5) * nightVision;

    // ---------- luz de bloques + luz dinamica (antorcha en mano) ----------
    float bl = lm.x * lm.x * sqrt(lm.x);
    bl *= 1.0 - 0.7 * dayF * skyL;
#ifdef DYNAMIC_LIGHTS
    float held = float(max(heldBlockLightValue, heldBlockLightValue2));
    if (held > 0.5) {
        float att = clamp(1.0 - dist / held, 0.0, 1.0);
        float facing = 0.6 + 0.4 * clamp(dot(N, -viewPos / max(dist, 0.001)), 0.0, 1.0);
        bl = max(bl, att * att * (held / 15.0) * facing * (1.0 - 0.4 * dayF * skyL));
    }
#endif
    vec3 blockLight = vec3(1.0, 0.58, 0.27) * (bl * 1.4 * BLOCKLIGHT_STRENGTH);

    vec3 col = albedo * (ambient + direct + blockLight) * EXPOSURE;
    col = sqrt(aces(col));                            // tonemap + gamma
    col = saturateColor(col, SATURATION);
    float alpha = tex.a;

    // ---------- agua: reflejo del cielo + brillo del sol ----------
    if (isWater > 0.5 && isEyeInWater == 0) {
        vec3 V = normalize(-playerPos);
        vec2 wp = playerPos.xz + cameraPosition.xz;
        float t = frameTimeCounter;
        vec3 Nw = normalize(normalW + vec3(sin(wp.x * 1.3 + t * 1.2) + sin(wp.y * 2.1 - t * 1.6), 0.0,
                                           sin(wp.y * 1.7 + t * 1.4) + sin(wp.x * 2.3 + t)) * 0.03);
        float fr = pow(1.0 - clamp(dot(Nw, V), 0.0, 1.0), 4.0);
        col = mix(col, mix(fogColor, skyColor, 0.6), fr * 0.6);
        float spec = pow(clamp(dot(reflect(-V, Nw), lightDirW), 0.0, 1.0), 160.0);
        col += min(directCol, vec3(1.0)) * (spec * 0.9);
        alpha = clamp(alpha + fr * 0.35, 0.0, 1.0);
    }

    // ---------- niebla ----------
    col = mix(col, fogColor, fogFactor(dist, far, rainStrength, isEyeInWater));

    gl_FragData[0] = vec4(col, alpha);
}
