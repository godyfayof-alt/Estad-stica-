// Movimiento barato de vegetacion. w = posicion en el mundo.
vec3 waveOffset(vec3 w, float t, float kind, float topVertex, float rain) {
    float speed = 1.0 + rain * 1.5;
    if (kind < 1.5) {                       // plantas: solo se mueve la parte superior
        float a = 0.055 * topVertex * (1.0 + rain);
        return vec3(sin(t * 2.1 * speed + w.x * 0.9 + w.z * 0.7) + 0.4 * sin(t * 3.3 * speed + w.z * 1.7),
                    0.0,
                    cos(t * 1.7 * speed + w.x * 0.6 + w.z * 0.9)) * a;
    }
    // hojas: balanceo muy suave de todo el bloque
    return vec3(sin(t * 1.3 * speed + w.x * 0.8 + w.y * 0.6),
                0.4 * sin(t * 1.9 * speed + w.z * 0.7),
                cos(t * 1.1 * speed + w.z * 0.8 + w.y * 0.5)) * (0.018 * (1.0 + rain));
}
