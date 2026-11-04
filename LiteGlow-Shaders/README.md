# LiteGlow Shaders (Iris + Sodium)

Shader pack ligero para Minecraft Java con **sombras**, **luz dinámica** y **luz natural** (ciclo día/noche).
Todo el cálculo se hace en una sola pasada (sin post-procesado), así que el coste en FPS es bajo.

## Instalación
1. Instala **Sodium** + **Iris** (Fabric/Quilt, o Iris Installer) para tu versión de Minecraft.
2. Copia `LiteGlow-Shaders.zip` a la carpeta `.minecraft/shaderpacks/` (sin descomprimir).
3. En el juego: *Opciones → Ajustes de vídeo → Paquetes de shaders* → elige **LiteGlow-Shaders**.

## Qué incluye
- **Sombras** del sol y la luna con distorsión (más nitidez cerca del jugador) y suavizado con ruido entrelazado.
- **Luz dinámica**: lo que lleves en la mano (antorcha, linterna, glowstone…) ilumina el entorno según su nivel de luz.
- **Luz natural**: sol cálido en amanecer/atardecer, luz blanca de día, luz azulada de luna, ambiente según el cielo y la lluvia.
- Cielo con degradado, halo del sol y tonos de atardecer; niebla suave; agua con reflejo y brillo solar.
- Hierba, flores, cultivos y hojas con movimiento (también en las sombras).
- Tonemap ACES + saturación ajustable.

## Rendimiento
Perfiles en el menú: `POTATO`, `LOW`, `MEDIUM`, `HIGH`.
Si pierdes FPS, baja en este orden: *Distancia de sombras* → *Resolución de sombras* → *Calidad del suavizado* → desactiva *Sombras*.
(Con `POTATO` no hay sombras y el coste es casi el de vanilla.)

## Estructura
`shaders/` contiene los programas `gbuffers_*`, `shadow`, `lib/` (código compartido), `block.properties`, `shaders.properties` y `lang/`.
Para reconstruir el zip: `cd LiteGlow-Shaders && zip -r LiteGlow-Shaders.zip shaders`.
