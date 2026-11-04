#version 120
#include "/lib/settings.glsl"
#include "/lib/wave.glsl"
attribute vec4 mc_Entity;
attribute vec2 mc_midTexCoord;
uniform mat4 shadowModelView;
uniform mat4 shadowModelViewInverse;
uniform vec3 cameraPosition;
uniform float frameTimeCounter;
uniform float rainStrength;
varying vec2 texcoord;
varying vec4 glcolor;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    glcolor = gl_Color;
    vec4 pos = gl_ProjectionMatrix * (gl_ModelViewMatrix * gl_Vertex);
#ifdef WAVING
    float id = mc_Entity.x;
    bool plant = id > 10000.5 && id < 10001.5;
    bool leaf  = id > 10002.5 && id < 10003.5;
    if (plant || leaf) {
        vec3 pp = (shadowModelViewInverse * (gl_ModelViewMatrix * gl_Vertex)).xyz;
        float top = float(gl_MultiTexCoord0.t < mc_midTexCoord.t);
        pp += waveOffset(pp + cameraPosition, frameTimeCounter, plant ? 1.0 : 2.0, top, rainStrength);
        pos = gl_ProjectionMatrix * (shadowModelView * vec4(pp, 1.0));
    }
#endif
    pos.xy /= length(pos.xy) * 0.9 + 0.1;             // distorsion: mas resolucion cerca del jugador
    gl_Position = pos;
}
