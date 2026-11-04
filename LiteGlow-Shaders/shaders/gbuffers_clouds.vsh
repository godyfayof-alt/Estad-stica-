#version 120
varying vec2 texcoord;
varying vec4 glcolor;
varying float dist;
void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    glcolor = gl_Color;
    vec4 vp = gl_ModelViewMatrix * gl_Vertex;
    dist = length(vp.xyz);
    gl_Position = gl_ProjectionMatrix * vp;
}
