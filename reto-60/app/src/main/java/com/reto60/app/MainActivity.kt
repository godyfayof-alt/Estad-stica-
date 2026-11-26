package com.reto60.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.reto60.app.ui.App

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Recordatorio.crearCanal(this)
        Recordatorio.programar(this)
        val estado = Estado(Almacen(this), cargarRetos(this))
        setContent { App(estado) }
    }
}
