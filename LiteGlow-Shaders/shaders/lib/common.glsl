// Funciones comunes (tonemap, saturacion, niebla)

vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 saturateColor(vec3 c, float s) {
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(l), c, s);
}

// Niebla: distancia de render + bruma atmosferica ligera + agua/lava
float fogFactor(float dist, float farPlane, float rain, int eyeInWater) {
    if (eyeInWater == 1) return 1.0 - exp(-dist * 0.10);
    if (eyeInWater == 2) return 1.0 - exp(-dist * 0.60);
    float edge = clamp((dist - farPlane * 0.55) / (farPlane * 0.45), 0.0, 1.0);
    edge *= edge;
    float haze = (1.0 - exp(-dist * 0.0013 * (1.0 + rain * 3.0))) * FOG_AMOUNT;
    return clamp(max(edge, haze), 0.0, 1.0);
}
