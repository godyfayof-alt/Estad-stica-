#version 120
uniform sampler2D texture;
uniform float rainStrength;
varying vec2 texcoord;
varying vec4 glcolor;
void main() {
    vec4 c = texture2D(texture, texcoord) * glcolor;
    c.a *= 0.75;
    gl_FragData[0] = c;
}
