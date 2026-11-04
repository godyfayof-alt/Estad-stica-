#version 120
uniform sampler2D texture;
uniform float far;
varying vec2 texcoord;
varying vec4 glcolor;
varying float dist;
void main() {
    vec4 c = texture2D(texture, texcoord) * glcolor;
    c.a *= 1.0 - smoothstep(far * 0.9, far * 2.2, dist);
    gl_FragData[0] = c;
}
