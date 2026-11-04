#version 120
uniform float viewWidth;
uniform float viewHeight;
uniform mat4 gbufferProjectionInverse;
uniform vec3 fogColor;
uniform vec3 skyColor;
uniform vec3 upPosition;
uniform vec3 sunPosition;
uniform float rainStrength;
varying vec4 starData;

void main() {
    if (starData.a > 0.5) {
        gl_FragData[0] = vec4(starData.rgb, 1.0);
        return;
    }
    vec4 p = gbufferProjectionInverse * vec4(gl_FragCoord.xy / vec2(viewWidth, viewHeight) * 2.0 - 1.0, 1.0, 1.0);
    vec3 dir = normalize(p.xyz);
    vec3 up = normalize(upPosition);
    vec3 sunDir = normalize(sunPosition);

    float h = dot(dir, up);
    vec3 sky = mix(fogColor, skyColor, sqrt(clamp(h * 2.0, 0.0, 1.0)));

    float sunElev = dot(sunDir, up);
    float sd = max(dot(dir, sunDir), 0.0);
    float dayW = smoothstep(-0.2, 0.1, sunElev) * (1.0 - rainStrength);
    float dusk = clamp(1.0 - abs(sunElev) * 3.5, 0.0, 1.0);
    float horizon = pow(1.0 - clamp(h, 0.0, 1.0), 4.0);

    sky += vec3(1.0, 0.80, 0.55) * (pow(sd, 6.0) * 0.30 + pow(sd, 64.0) * 0.45) * dayW;   // halo solar
    sky += vec3(0.60, 0.25, 0.08) * horizon * dusk * (0.3 + 0.7 * sd * sd) * dayW;         // amanecer/atardecer
    gl_FragData[0] = vec4(sky, 1.0);
}
