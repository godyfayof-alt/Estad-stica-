package com.reto60.app

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.text.Normalizer
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

// ---------- Contenido (assets/retos.json) ----------

@Serializable
data class Ancla(val nombre: String, val detalle: String)

@Serializable
data class Paso(
    val t: String,
    val label: String = "",
    val min: Int = 0,
    val minutes: Int = 0,
    val from: String? = null,
    val to: String? = null,
    val after: String? = null,
    val before: String? = null,
    val gapH: Int = 0,
    val count: Int = 0,
    val spanMin: Int = 0,
    val a: List<String> = emptyList(),
    val must: List<String> = emptyList(),
    val digits: Boolean = false,
    val lines: Int = 0,
    val max: Int = Int.MAX_VALUE,
    val items: List<String> = emptyList(),
    val witness: Boolean = false,
    val noSave: Boolean = false,
)

@Serializable
data class Reto(
    val n: Int,
    val fase: String,
    val titulo: String,
    val ref: String,
    val versiculo: String,
    val leccion: String,
    val reto: String,
    val prueba: String,
    val ancla: Ancla? = null,
    val mostrar: Int? = null,
    val multiDia: Boolean = false,
    val pasos: List<Paso>,
)

// ---------- Progreso guardado en el teléfono ----------

@Serializable
data class Entrada(val at: Long, val text: String)

@Serializable
data class PasoEstado(
    val doneAt: Long? = null,
    val text: String? = null,
    val timerStart: Long? = null,
    val entries: List<Entrada> = emptyList(),
)

@Serializable
data class RetoEstado(
    val openedAt: Long,
    val completedAt: Long? = null,
    val pasos: Map<Int, PasoEstado> = emptyMap(),
    val reinicios: Int = 0,
)

@Serializable
data class Progreso(
    val startedAt: Long? = null,
    val actual: Int = 1,
    val retos: Map<Int, RetoEstado> = emptyMap(),
)

val json = Json { ignoreUnknownKeys = true; encodeDefaults = false }

fun cargarRetos(ctx: Context): List<Reto> =
    json.decodeFromString(ctx.assets.open("retos.json").bufferedReader(Charsets.UTF_8).use { it.readText() })

class Almacen(ctx: Context) {
    private val prefs = ctx.getSharedPreferences("reto60", Context.MODE_PRIVATE)
    fun cargar(): Progreso = prefs.getString("progreso", null)?.let {
        runCatching { json.decodeFromString<Progreso>(it) }.getOrNull()
    } ?: Progreso()

    fun guardar(p: Progreso) {
        prefs.edit().putString("progreso", json.encodeToString(Progreso.serializer(), p)).apply()
    }
}

// ---------- Tiempo ----------

object Tiempo {
    private val zona: ZoneId get() = ZoneId.systemDefault()

    /** El "día" empieza a las 4:00, para que desvelarse no cuente como un día nuevo. */
    fun diaLogico(ts: Long): LocalDate = zdt(ts).minusHours(4).toLocalDate()
    fun zdt(ts: Long): ZonedDateTime = Instant.ofEpochMilli(ts).atZone(zona)
    fun hora(ts: Long): LocalTime = zdt(ts).toLocalTime()
    fun t(s: String): LocalTime = LocalTime.parse(s)

    fun duracion(ms: Long): String {
        val d = Duration.ofMillis(ms.coerceAtLeast(0))
        val h = d.toHours()
        val m = d.toMinutesPart()
        val s = d.toSecondsPart()
        return when {
            h > 0 -> "${h} h ${m} min"
            m > 0 -> "%d:%02d".format(m, s)
            else -> "0:%02d".format(s)
        }
    }

    fun hhmm(ts: Long): String = "%02d:%02d".format(zdt(ts).hour, zdt(ts).minute)
}

// ---------- Reglas ----------

object Reglas {

    /** ¿Ya se puede abrir el siguiente reto? Solo si el actual está cumplido y es otro día. */
    fun siguienteDisponible(p: Progreso, ahora: Long): Boolean {
        val e = p.retos[p.actual] ?: return false
        val hecho = e.completedAt ?: return false
        val inicio = primeraActividad(e) ?: hecho
        return p.actual < 60 && ahora >= hecho && Tiempo.diaLogico(ahora) > Tiempo.diaLogico(inicio)
    }

    fun primeraActividad(e: RetoEstado): Long? =
        e.pasos.values.flatMap { listOfNotNull(it.doneAt, it.timerStart) + it.entries.map { x -> x.at } }.minOrNull()

    /** Si un reto de un solo día quedó a medias, se reinicia al día siguiente. */
    fun debeReiniciar(reto: Reto, e: RetoEstado, ahora: Long): Boolean {
        if (e.completedAt != null) return false
        val primera = primeraActividad(e) ?: return false
        val dias = Tiempo.diaLogico(ahora).toEpochDay() - Tiempo.diaLogico(primera).toEpochDay()
        return if (reto.multiDia) dias > 1 else dias > 0
    }

    /** Devuelve null si el paso puede hacerse ahora, o el motivo por el que aún no. */
    fun bloqueo(paso: Paso, previoHecho: Long?, ahora: Long, esTimerIniciado: Boolean = false): String? {
        val h = Tiempo.hora(ahora)
        if (paso.gapH > 0 && previoHecho != null) {
            val listo = previoHecho + paso.gapH * 3_600_000L
            if (ahora < listo) return "Disponible en ${Tiempo.duracion(listo - ahora)}"
        }
        if (!esTimerIniciado && paso.from != null && paso.to != null) {
            if (h.isBefore(Tiempo.t(paso.from)) || h.isAfter(Tiempo.t(paso.to)))
                return "Solo de ${paso.from} a ${paso.to}"
        }
        if (paso.after != null && h.isBefore(Tiempo.t(paso.after)) && Tiempo.hora(ahora).hour >= 4)
            return "Disponible después de las ${paso.after}"
        if (paso.before != null && !h.isBefore(Tiempo.t(paso.before)))
            return "Solo antes de las ${paso.before}"
        return null
    }

    fun normalizar(s: String): String =
        Normalizer.normalize(s.lowercase(), Normalizer.Form.NFD)
            .replace(Regex("\\p{Mn}+"), "")
            .replace(Regex("[^a-z0-9ñ\\s]"), " ")
            .replace("ñ", "n")
            .replace(Regex("\\s+"), " ")
            .trim()

    /** Errores de un texto escrito (vacío = válido). */
    fun validarTexto(paso: Paso, texto: String): List<String> {
        val errores = mutableListOf<String>()
        val limpio = texto.trim()
        if (limpio.length < paso.min) errores += "Escribe al menos ${paso.min} caracteres (llevas ${limpio.length})."
        val norm = normalizar(limpio)
        val faltan = paso.must.filter { !norm.contains(normalizar(it)) }
        if (faltan.isNotEmpty()) errores += "Debe incluir: ${faltan.joinToString(", ") { "“$it”" }}."
        if (paso.digits && limpio.none { it.isDigit() }) errores += "Incluye los números (horas, minutos o cantidades)."
        if (paso.lines > 0) {
            val n = limpio.lines().count { it.isNotBlank() }
            if (n < paso.lines) errores += "Escribe ${paso.lines} líneas distintas (llevas $n)."
        }
        return errores
    }

    /** Porcentaje de coincidencia palabra por palabra (subsecuencia común más larga). */
    fun similitud(escrito: String, original: String): Double {
        val a = normalizar(escrito).split(" ").filter { it.isNotBlank() }
        val b = normalizar(original).split(" ").filter { it.isNotBlank() }
        if (b.isEmpty()) return 0.0
        val dp = Array(a.size + 1) { IntArray(b.size + 1) }
        for (i in 1..a.size) for (j in 1..b.size)
            dp[i][j] = if (a[i - 1] == b[j - 1]) dp[i - 1][j - 1] + 1 else maxOf(dp[i - 1][j], dp[i][j - 1])
        return dp[a.size][b.size].toDouble() / maxOf(a.size, b.size)
    }

    const val UMBRAL_MEMORIA = 0.9

    fun quizCorrecto(paso: Paso, respuesta: String): Boolean {
        val r = normalizar(respuesta)
        return paso.a.all { r.contains(normalizar(it)) }
    }

    /** Un registro (log) está completo con suficientes entradas y separación en el tiempo. */
    fun registroCompleto(paso: Paso, entradas: List<Entrada>): Boolean {
        if (entradas.size < paso.count) return false
        if (paso.spanMin <= 0 || entradas.size < 2) return entradas.size >= paso.count
        val span = (entradas.maxOf { it.at } - entradas.minOf { it.at }) / 60_000L
        return span >= paso.spanMin
    }
}
