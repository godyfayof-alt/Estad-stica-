package com.reto60.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.reto60.app.Entrada
import com.reto60.app.Paso
import com.reto60.app.PasoEstado
import com.reto60.app.Reglas
import com.reto60.app.Tiempo

/**
 * Un paso de la prueba. Los pasos van en orden: uno se habilita cuando el anterior está hecho.
 */
@Composable
fun PasoVista(
    indice: Int,
    paso: Paso,
    estado: PasoEstado?,
    previoHecho: Long?,
    habilitado: Boolean,
    ahora: Long,
    versiculo: String,
    intentoMemoria: Int,
    onActualizar: ((PasoEstado) -> PasoEstado) -> Unit,
    onOcultarVersiculo: (Boolean) -> Unit,
) {
    val hecho = estado?.doneAt != null
    Column(Modifier.fillMaxWidth().alpha(if (habilitado || hecho) 1f else 0.38f)) {
        Row(verticalAlignment = Alignment.Top) {
            Box(
                Modifier
                    .size(26.dp)
                    .clip(CircleShape)
                    .background(if (hecho) C.platino else Color.Transparent)
                    .border(1.dp, if (hecho) C.platino else Color.White.copy(alpha = 0.3f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(if (hecho) "✓" else "${indice + 1}", color = if (hecho) C.tinta else C.plata, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                if (paso.witness) Etiqueta("Testigo · dale el teléfono a tu mamá o papá", color = C.plata)
                Text(paso.label, style = T.cuerpo.copy(color = C.platino))
            }
        }
        Spacer(Modifier.height(12.dp))

        Column(Modifier.padding(start = 38.dp)) {
            when {
                hecho -> Resumen(paso, estado!!)
                !habilitado -> Text("Completa el paso anterior.", style = T.chico)
                else -> Control(paso, estado, previoHecho, ahora, versiculo, intentoMemoria, onActualizar, onOcultarVersiculo)
            }
        }
    }
}

@Composable
private fun Resumen(paso: Paso, e: PasoEstado) {
    val hora = e.doneAt?.let { Tiempo.hhmm(it) } ?: ""
    when {
        paso.noSave -> Text("Entregado a las $hora. No se guardó, como prometimos.", style = T.chico)
        paso.t == "log" -> Column {
            e.entries.forEach { Text("${Tiempo.hhmm(it.at)} · ${it.text}", style = T.chico) }
        }
        paso.t == "check" -> Text("Todo confirmado a las $hora.", style = T.chico)
        !e.text.isNullOrBlank() && paso.t != "memory" -> Text("“${e.text}”  ·  $hora", style = T.chico)
        else -> Text("Hecho a las $hora", style = T.chico)
    }
}

@Composable
private fun Aviso(texto: String, color: Color = C.alerta) {
    Text(texto, style = T.chico.copy(color = color), modifier = Modifier.padding(top = 8.dp))
}

@Composable
private fun Control(
    paso: Paso,
    estado: PasoEstado?,
    previoHecho: Long?,
    ahora: Long,
    versiculo: String,
    intentoMemoria: Int,
    onActualizar: ((PasoEstado) -> PasoEstado) -> Unit,
    onOcultarVersiculo: (Boolean) -> Unit,
) {
    val e = estado ?: PasoEstado()
    val timerIniciado = e.timerStart != null
    val bloqueo = Reglas.bloqueo(paso, previoHecho, ahora, esTimerIniciado = timerIniciado)

    when (paso.t) {
        "window" -> {
            if (bloqueo != null) Text(bloqueo, style = T.chico)
            else BotonPlatino("Marcar ahora · ${Tiempo.hhmm(ahora)}") { onActualizar { it.copy(doneAt = ahora) } }
        }

        "timer" -> {
            val total = paso.minutes * 60_000L
            if (!timerIniciado) {
                if (bloqueo != null) Text(bloqueo, style = T.chico)
                else BotonPlatino("Iniciar ${paso.minutes} min") { onActualizar { it.copy(timerStart = ahora) } }
            } else {
                val resta = total - (ahora - e.timerStart!!)
                if (resta > 0) {
                    Text(Tiempo.duracion(resta), style = T.titulo.copy(fontSize = 44.sp, lineHeight = 50.sp))
                    Text("Puedes bloquear el teléfono: el tiempo sigue corriendo.", style = T.chico)
                    Spacer(Modifier.height(10.dp))
                    BotonVidrio("Reiniciar temporizador") { onActualizar { it.copy(timerStart = null) } }
                } else {
                    BotonPlatino("Terminar") { onActualizar { it.copy(doneAt = ahora) } }
                }
            }
        }

        "write", "memory", "quiz", "number", "chapter" -> Escritura(paso, e, bloqueo, ahora, versiculo, intentoMemoria, onActualizar, onOcultarVersiculo)

        "log" -> Registro(paso, e, bloqueo, ahora, onActualizar)

        "check" -> Lista(paso, e, bloqueo, ahora, onActualizar)
    }
}

@Composable
private fun Escritura(
    paso: Paso,
    e: PasoEstado,
    bloqueo: String?,
    ahora: Long,
    versiculo: String,
    intentoMemoria: Int,
    onActualizar: ((PasoEstado) -> PasoEstado) -> Unit,
    onOcultarVersiculo: (Boolean) -> Unit,
) {
    // Los borradores se guardan para no perderlos, excepto en los pasos privados.
    val esMemoria = paso.t == "memory"
    // En memoria, ver el versículo cambia el intento y borra lo escrito.
    var local by remember(intentoMemoria) { mutableStateOf(if (paso.noSave || esMemoria) "" else e.text ?: "") }
    var error by remember { mutableStateOf<String?>(null) }
    val numerico = paso.t == "number" || paso.t == "chapter"

    if (bloqueo != null) {
        Text(bloqueo, style = T.chico)
        return
    }

    Campo(
        valor = local,
        onCambio = { v ->
            local = v
            error = null
            if (!paso.noSave && !esMemoria) onActualizar { it.copy(text = v) }
        },
        placeholder = when (paso.t) {
            "memory" -> "Escríbelo de memoria…"
            "quiz" -> "Tu respuesta"
            "number", "chapter" -> "Número"
            else -> if (paso.witness) "Con sus palabras…" else "Escribe aquí…"
        },
        numerico = numerico,
        minLineas = if (paso.t == "quiz") 1 else 3,
        onFoco = { if (esMemoria && it) onOcultarVersiculo(true) },
    )

    if (paso.t == "write") {
        val n = local.trim().length
        Text("$n / ${paso.min}", style = T.chico, modifier = Modifier.padding(top = 6.dp))
    }
    error?.let { Aviso(it) }
    Spacer(Modifier.height(12.dp))

    BotonPlatino("Entregar") {
        val problema: String? = when (paso.t) {
            "write" -> Reglas.validarTexto(paso, local).firstOrNull()
            "memory" -> {
                val s = Reglas.similitud(local, versiculo)
                if (s >= Reglas.UMBRAL_MEMORIA) null
                else "Coincide en ${(s * 100).toInt()}%. Necesitas al menos ${(Reglas.UMBRAL_MEMORIA * 100).toInt()}%. Repásalo y vuelve a intentar."
            }
            "quiz" -> if (Reglas.quizCorrecto(paso, local)) null else "Esa no es la respuesta. Vuelve a leer el pasaje."
            "number" -> {
                val v = local.trim().toIntOrNull()
                when {
                    v == null || v < 0 -> "Escribe un número."
                    v > paso.max -> "Para cumplir debe ser ${paso.max} o menos. Si hoy no se logró, mañana lo vuelves a intentar."
                    else -> null
                }
            }
            "chapter" -> {
                val v = local.trim().toIntOrNull()
                if (v == Tiempo.diaLogico(ahora).dayOfMonth) null else "Ese no es el capítulo que corresponde a la fecha de hoy."
            }
            else -> null
        }
        if (problema != null) {
            error = problema
        } else {
            if (esMemoria) onOcultarVersiculo(false)
            onActualizar { it.copy(doneAt = ahora, text = if (paso.noSave || paso.t == "memory") null else local.trim()) }
        }
    }
}

@Composable
private fun Registro(paso: Paso, e: PasoEstado, bloqueo: String?, ahora: Long, onActualizar: ((PasoEstado) -> PasoEstado) -> Unit) {
    var local by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    e.entries.forEach { Text("${Tiempo.hhmm(it.at)} · ${it.text}", style = T.chico.copy(color = C.plata)) }
    if (e.entries.isNotEmpty()) Spacer(Modifier.height(10.dp))
    Text("${e.entries.size} de ${paso.count} registros", style = T.chico)
    Spacer(Modifier.height(8.dp))

    if (bloqueo != null) {
        Text(bloqueo, style = T.chico)
    } else {
        Campo(local, { local = it; error = null }, placeholder = "Escribe en el momento…", minLineas = 2)
        error?.let { Aviso(it) }
        Spacer(Modifier.height(10.dp))
        BotonVidrio("Registrar · ${Tiempo.hhmm(ahora)}") {
            if (local.trim().length < paso.min) error = "Escribe al menos ${paso.min} caracteres."
            else {
                val texto = local.trim()
                onActualizar { it.copy(entries = it.entries + Entrada(ahora, texto)) }
                local = ""
            }
        }
    }

    if (e.entries.size >= paso.count) {
        Spacer(Modifier.height(10.dp))
        if (Reglas.registroCompleto(paso, e.entries)) {
            BotonPlatino("Completar registro") { onActualizar { it.copy(doneAt = ahora) } }
        } else {
            val horas = paso.spanMin / 60
            val txt = if (horas >= 1) "$horas h" else "${paso.spanMin} min"
            Aviso("Reparte tus registros en el día: necesitas al menos $txt entre el primero y el último.", C.plata)
        }
    }
}

@Composable
private fun Lista(paso: Paso, e: PasoEstado, bloqueo: String?, ahora: Long, onActualizar: ((PasoEstado) -> PasoEstado) -> Unit) {
    if (bloqueo != null) {
        Text(bloqueo, style = T.chico)
        return
    }
    val marcados = e.text?.split(",")?.mapNotNull { it.toIntOrNull() }?.toSet() ?: emptySet()
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        paso.items.forEachIndexed { i, item ->
            val si = i in marcados
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .border(1.dp, Color.White.copy(alpha = if (si) 0.4f else 0.12f), RoundedCornerShape(14.dp))
                    .clickable {
                        val nuevo = if (si) marcados - i else marcados + i
                        onActualizar { it.copy(text = nuevo.sorted().joinToString(",")) }
                    }
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(if (si) "◉" else "○", color = C.platino, fontSize = 16.sp)
                Spacer(Modifier.width(12.dp))
                Text(item, style = T.cuerpo)
            }
        }
        Spacer(Modifier.height(4.dp))
        BotonPlatino("Entregar", enabled = marcados.size == paso.items.size) {
            onActualizar { it.copy(doneAt = ahora) }
        }
    }
}
