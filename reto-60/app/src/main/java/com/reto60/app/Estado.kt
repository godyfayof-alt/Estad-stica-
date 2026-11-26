package com.reto60.app

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/** Estado de la app: progreso + reglas para avanzar. Todo se guarda en el teléfono. */
class Estado(private val almacen: Almacen, val retos: List<Reto>) {

    var progreso by mutableStateOf(almacen.cargar())
        private set

    fun reto(n: Int): Reto = retos[n - 1]
    val actual: Reto get() = reto(progreso.actual)
    val estadoActual: RetoEstado? get() = progreso.retos[progreso.actual]

    private fun guardar(p: Progreso) {
        progreso = p
        almacen.guardar(p)
    }

    fun comenzar(ahora: Long) {
        guardar(Progreso(startedAt = ahora, actual = 1, retos = mapOf(1 to RetoEstado(openedAt = ahora))))
    }

    /** Se llama cada segundo: abre el siguiente reto cuando toca y reinicia retos que quedaron a medias. */
    fun sincronizar(ahora: Long) {
        var p = progreso
        if (p.startedAt == null) return
        if (Reglas.siguienteDisponible(p, ahora)) {
            val n = p.actual + 1
            p = p.copy(actual = n, retos = p.retos + (n to RetoEstado(openedAt = ahora)))
        }
        val e = p.retos[p.actual]
        if (e == null) {
            p = p.copy(retos = p.retos + (p.actual to RetoEstado(openedAt = ahora)))
        } else if (Reglas.debeReiniciar(reto(p.actual), e, ahora)) {
            p = p.copy(retos = p.retos + (p.actual to RetoEstado(openedAt = ahora, reinicios = e.reinicios + 1)))
        }
        if (p != progreso) guardar(p)
    }

    fun actualizarPaso(i: Int, ahora: Long, cambio: (PasoEstado) -> PasoEstado) {
        val p = progreso
        val e = p.retos[p.actual] ?: return
        if (e.completedAt != null) return
        val nuevo = cambio(e.pasos[i] ?: PasoEstado())
        var e2 = e.copy(pasos = e.pasos + (i to nuevo))
        val r = reto(p.actual)
        if (r.pasos.indices.all { e2.pasos[it]?.doneAt != null }) e2 = e2.copy(completedAt = ahora)
        guardar(p.copy(retos = p.retos + (p.actual to e2)))
    }

    val cumplidos: Int get() = progreso.retos.values.count { it.completedAt != null }

    fun diasDesdeInicio(ahora: Long): Long {
        val inicio = progreso.startedAt ?: return 0
        return Tiempo.diaLogico(ahora).toEpochDay() - Tiempo.diaLogico(inicio).toEpochDay() + 1
    }

    /** Las anclas acumuladas: la bola de nieve. */
    fun anclas(): List<Pair<Int, Ancla>> = retos
        .filter { it.ancla != null && (it.n < progreso.actual || progreso.retos[it.n]?.completedAt != null) }
        .map { it.n to it.ancla!! }

    val terminado: Boolean get() = progreso.actual == 60 && progreso.retos[60]?.completedAt != null
}
