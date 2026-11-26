package com.reto60.app.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.reto60.app.Estado
import com.reto60.app.Reto
import com.reto60.app.RetoEstado
import com.reto60.app.Tiempo
import kotlinx.coroutines.delay
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun App(estado: Estado) {
    var ahora by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var pantalla by remember { mutableStateOf("hoy") }

    LaunchedEffect(Unit) {
        while (true) {
            ahora = System.currentTimeMillis()
            estado.sincronizar(ahora)
            delay(1000)
        }
    }

    MaterialTheme(colorScheme = darkColorScheme(primary = C.platino, background = C.fondo, surface = C.fondo, onSurface = C.platino)) {
        Fondo {
            when {
                estado.progreso.startedAt == null -> Bienvenida { estado.comenzar(System.currentTimeMillis()) }
                pantalla == "historial" -> {
                    BackHandler { pantalla = "hoy" }
                    Historial(estado) { pantalla = "hoy" }
                }
                else -> Hoy(estado, ahora) { pantalla = "historial" }
            }
        }
    }
}

@Composable
private fun Contenedor(content: @Composable () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) { content() }
}

// ---------------- Bienvenida ----------------

@Composable
private fun Bienvenida(onComenzar: () -> Unit) {
    val permiso = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { onComenzar() }
    Contenedor {
        Spacer(Modifier.height(24.dp))
        Text("1%", style = T.titulo.copy(fontSize = 72.sp, lineHeight = 76.sp, brush = brilloPlatino, fontWeight = FontWeight.ExtraLight))
        Text("60 retos para construir fe y disciplina, una tarjeta a la vez.", style = T.subtitulo)
        Text(
            "Como el libro de 40 días de A prueba de fuego: cosas pequeñas que, juntas, cambian todo. Cada reto se suma al anterior, como una bola de nieve.",
            style = T.cuerpo,
        )
        Vidrio {
            Etiqueta("Las reglas")
            Spacer(Modifier.height(14.dp))
            Regla("1", "Una tarjeta por día. No puedes saltarte ninguna ni ver las siguientes.")
            Regla("2", "La siguiente se abre al día siguiente de cumplir la actual. Si no la cumples, la repites.")
            Regla("3", "Sin prueba no se marca. Cada tarjeta dice abajo cuál es la prueba.")
            Regla("4", "La app comprueba lo que puede: la hora, el tiempo, lo que memorizas. Lo demás depende de tu integridad, y eso también es parte del reto.")
            Regla("5", "Todo se queda solo en este teléfono. Nadie más lo ve.")
        }
        Vidrio {
            Text(
                "“El que es fiel en lo muy poco, también en lo más es fiel.”",
                style = T.versiculo,
            )
            Spacer(Modifier.height(8.dp))
            Etiqueta("Lucas 16:10 · RVR1960")
        }
        BotonPlatino("Comenzar mi día 1") {
            if (Build.VERSION.SDK_INT >= 33) permiso.launch(Manifest.permission.POST_NOTIFICATIONS) else onComenzar()
        }
        Text("Recibirás un aviso cada día a las 5:00.", style = T.chico, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun Regla(n: String, texto: String) {
    Row(Modifier.padding(bottom = 12.dp)) {
        Text(n, style = T.cuerpo.copy(color = C.platino, fontWeight = FontWeight.Medium), modifier = Modifier.width(22.dp))
        Text(texto, style = T.cuerpo)
    }
}

// ---------------- Hoy ----------------

@Composable
private fun Hoy(estado: Estado, ahora: Long, onHistorial: () -> Unit) {
    val p = estado.progreso
    val reto = estado.actual
    val e = estado.estadoActual ?: return
    var ocultar by remember(reto.n) { mutableStateOf(false) }
    var intento by remember(reto.n) { mutableIntStateOf(0) }

    Contenedor {
        // Encabezado
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("1%", style = T.subtitulo.copy(brush = brilloPlatino, fontWeight = FontWeight.Light, fontSize = 22.sp))
            Spacer(Modifier.weight(1f))
            Text(
                "Historial",
                style = T.chico.copy(color = C.plata),
                modifier = Modifier.clip(RoundedCornerShape(12.dp)).clickable(onClick = onHistorial).padding(8.dp),
            )
        }

        Column {
            Etiqueta("Reto ${reto.n} de 60")
            Spacer(Modifier.height(10.dp))
            Progreso(estado.cumplidos / 60f)
            Spacer(Modifier.height(10.dp))
            Text("Día ${estado.diasDesdeInicio(ahora)} desde que empezaste · ${estado.cumplidos} cumplidos", style = T.chico)
        }

        if (estado.terminado) {
            Final(estado)
            return@Contenedor
        }

        Tarjeta(reto, ocultarVersiculo = ocultar, reinicios = e.reinicios) {
            ocultar = false
            intento++
        }

        reto.mostrar?.let { n -> AnterioresVista(estado.reto(n), p.retos[n]) }

        if (e.completedAt != null) {
            Cumplido(e)
        } else {
            Vidrio {
                Etiqueta("Presenta tu prueba")
                Spacer(Modifier.height(18.dp))
                Column(verticalArrangement = Arrangement.spacedBy(26.dp)) {
                    reto.pasos.forEachIndexed { i, paso ->
                        val previo = if (i == 0) null else e.pasos[i - 1]?.doneAt
                        val habilitado = i == 0 || previo != null
                        PasoVista(
                            indice = i,
                            paso = paso,
                            estado = e.pasos[i],
                            previoHecho = previo,
                            habilitado = habilitado,
                            ahora = ahora,
                            versiculo = reto.versiculo,
                            intentoMemoria = intento,
                            onActualizar = { cambio -> estado.actualizarPaso(i, System.currentTimeMillis(), cambio) },
                            onOcultarVersiculo = { ocultar = it },
                        )
                    }
                }
            }
        }

        BolaDeNieve(estado)
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun Progreso(fraccion: Float) {
    Box(Modifier.fillMaxWidth().height(3.dp).clip(RoundedCornerShape(2.dp)).background(Color.White.copy(alpha = 0.08f))) {
        Box(Modifier.fillMaxWidth(fraccion.coerceIn(0f, 1f)).height(3.dp).background(brilloPlatino))
    }
}

@Composable
private fun Tarjeta(reto: Reto, ocultarVersiculo: Boolean, reinicios: Int, onVerVersiculo: () -> Unit) {
    Vidrio(padding = 24.dp) {
        Etiqueta(reto.fase)
        Spacer(Modifier.height(12.dp))
        Text(reto.titulo, style = T.titulo)
        Spacer(Modifier.height(22.dp))

        if (ocultarVersiculo) {
            Text("Versículo oculto mientras lo escribes de memoria.", style = T.versiculo.copy(color = C.tenue, fontSize = 16.sp))
            Spacer(Modifier.height(8.dp))
            Text(
                "Ver versículo (borra lo que llevas)",
                style = T.chico.copy(color = C.plata),
                modifier = Modifier.clip(RoundedCornerShape(10.dp)).clickable(onClick = onVerVersiculo).padding(vertical = 6.dp),
            )
        } else {
            Text("“${reto.versiculo}”", style = T.versiculo)
        }
        Spacer(Modifier.height(10.dp))
        Etiqueta("${reto.ref} · RVR1960")

        Separador()
        Etiqueta("La lección")
        Spacer(Modifier.height(8.dp))
        Text(reto.leccion, style = T.cuerpo)

        Spacer(Modifier.height(20.dp))
        Etiqueta("Tu reto")
        Spacer(Modifier.height(8.dp))
        Text(reto.reto, style = T.cuerpo.copy(color = C.platino))

        reto.ancla?.let {
            Spacer(Modifier.height(16.dp))
            Text("Nueva ancla para tu bola de nieve: ${it.nombre}. ${it.detalle}", style = T.chico.copy(color = C.plata))
        }

        Spacer(Modifier.height(22.dp))
        val forma = RoundedCornerShape(18.dp)
        Column(
            Modifier
                .fillMaxWidth()
                .clip(forma)
                .background(Color.Black.copy(alpha = 0.28f))
                .border(1.dp, Color.White.copy(alpha = 0.10f), forma)
                .padding(16.dp),
        ) {
            Etiqueta("🔒  La prueba", color = C.plata)
            Spacer(Modifier.height(6.dp))
            Text(reto.prueba, style = T.cuerpo.copy(fontSize = 15.sp))
        }

        if (reinicios > 0) {
            Spacer(Modifier.height(12.dp))
            Text("Esta tarjeta se reinició porque no se terminó el mismo día. Hoy es otra oportunidad.", style = T.chico.copy(color = C.alerta))
        }
    }
}

@Composable
private fun AnterioresVista(reto: Reto, e: RetoEstado?) {
    if (e == null) return
    Vidrio {
        Etiqueta("Lo que escribiste en el reto ${reto.n}")
        Spacer(Modifier.height(12.dp))
        reto.pasos.forEachIndexed { i, paso ->
            val st = e.pasos[i] ?: return@forEachIndexed
            val textos = buildList {
                st.text?.takeIf { paso.t in listOf("write", "number", "chapter") && !paso.noSave }?.let { add(it) }
                st.entries.forEach { add("${Tiempo.hhmm(it.at)} · ${it.text}") }
            }
            if (textos.isEmpty()) return@forEachIndexed
            Text(paso.label, style = T.chico)
            textos.forEach { Text(it, style = T.cuerpo.copy(color = C.platino), modifier = Modifier.padding(top = 4.dp)) }
            Spacer(Modifier.height(14.dp))
        }
    }
}

@Composable
private fun Cumplido(e: RetoEstado) {
    Vidrio {
        Text("✓", style = T.titulo.copy(brush = brilloPlatino, fontSize = 40.sp))
        Text("Cumplido", style = T.titulo)
        Spacer(Modifier.height(6.dp))
        Text("Prueba entregada a las ${Tiempo.hhmm(e.completedAt!!)}.", style = T.chico)
        Spacer(Modifier.height(14.dp))
        Text("Tu siguiente tarjeta se abre mañana. Mantén tus anclas hasta entonces.", style = T.cuerpo)
    }
}

@Composable
private fun BolaDeNieve(estado: Estado) {
    val anclas = estado.anclas()
    if (anclas.isEmpty()) return
    Vidrio {
        Etiqueta("Tu bola de nieve · cada día")
        Spacer(Modifier.height(14.dp))
        anclas.forEach { (n, a) ->
            Row(Modifier.padding(bottom = 12.dp)) {
                Text("◆", color = C.platino, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp, end = 12.dp))
                Column {
                    Text(a.nombre, style = T.cuerpo.copy(color = C.platino))
                    Text("${a.detalle}  ·  desde el reto $n", style = T.chico)
                }
            }
        }
    }
}

@Composable
private fun Final(estado: Estado) {
    Vidrio(padding = 26.dp) {
        Etiqueta("60 de 60")
        Spacer(Modifier.height(10.dp))
        Text("Terminaste.", style = T.titulo.copy(fontSize = 38.sp, brush = brilloPlatino))
        Spacer(Modifier.height(14.dp))
        Text(
            "Sesenta piedras pequeñas. Ahora vive tu regla de vida del reto 58. Todo lo que escribiste sigue en tu historial.",
            style = T.cuerpo,
        )
        Spacer(Modifier.height(18.dp))
        Text("“He peleado la buena batalla, he acabado la carrera, he guardado la fe.”", style = T.versiculo)
        Spacer(Modifier.height(8.dp))
        Etiqueta("2 Timoteo 4:7 · RVR1960")
    }
    AnterioresVista(estado.reto(58), estado.progreso.retos[58])
}

// ---------------- Historial ----------------

@Composable
private fun Historial(estado: Estado, onVolver: () -> Unit) {
    val formato = remember { DateTimeFormatter.ofPattern("EEEE d 'de' MMMM", Locale.forLanguageTag("es-MX")) }
    var abierto by remember { mutableIntStateOf(-1) }
    val hechos = estado.retos.filter { estado.progreso.retos[it.n]?.completedAt != null }

    Contenedor {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "← Volver",
                style = T.chico.copy(color = C.plata),
                modifier = Modifier.clip(RoundedCornerShape(12.dp)).clickable(onClick = onVolver).padding(8.dp),
            )
        }
        Text("Historial", style = T.titulo)
        Text("${hechos.size} retos cumplidos. Toca uno para ver tus pruebas.", style = T.chico)

        if (hechos.isEmpty()) {
            Vidrio { Text("Aquí aparecerán tus retos cumplidos.", style = T.cuerpo) }
        }

        hechos.reversed().forEach { r ->
            val e = estado.progreso.retos[r.n]!!
            Vidrio(modifier = Modifier.clickable { abierto = if (abierto == r.n) -1 else r.n }, padding = 18.dp) {
                Etiqueta("Reto ${r.n} · ${r.fase}")
                Spacer(Modifier.height(6.dp))
                Text(r.titulo, style = T.subtitulo)
                Text(Tiempo.zdt(e.completedAt!!).format(formato), style = T.chico)
                if (abierto == r.n) {
                    Spacer(Modifier.height(12.dp))
                    Text("“${r.versiculo}” — ${r.ref}", style = T.versiculo.copy(fontSize = 15.sp, lineHeight = 22.sp))
                    Spacer(Modifier.height(12.dp))
                    r.pasos.forEachIndexed { i, paso ->
                        val st = e.pasos[i] ?: return@forEachIndexed
                        Text(paso.label, style = T.chico)
                        val txt = when {
                            paso.noSave -> "(privado, no se guardó)"
                            paso.t == "memory" -> "Recitado de memoria ✓"
                            paso.t == "timer" -> "${paso.minutes} min completos ✓"
                            paso.t == "window" -> "Marcado a las ${st.doneAt?.let { Tiempo.hhmm(it) }}"
                            paso.t == "log" -> st.entries.joinToString("\n") { "${Tiempo.hhmm(it.at)} · ${it.text}" }
                            paso.t == "check" -> "Todo confirmado ✓"
                            else -> st.text ?: "✓"
                        }
                        Text(txt, style = T.cuerpo.copy(color = C.platino, fontSize = 15.sp), modifier = Modifier.padding(top = 2.dp, bottom = 10.dp))
                    }
                }
            }
        }
        Spacer(Modifier.height(20.dp))
    }
}
