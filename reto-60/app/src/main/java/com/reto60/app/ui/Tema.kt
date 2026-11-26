package com.reto60.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object C {
    val fondo = Color(0xFF08090B)
    val platino = Color(0xFFE9E8E6)
    val plata = Color(0xFFB9BAC0)
    val tenue = Color(0xFF7C7E86)
    val linea = Color.White.copy(alpha = 0.10f)
    val ok = Color(0xFFA8DCC0)
    val alerta = Color(0xFFE9B9A6)
    val tinta = Color(0xFF0B0C0F)
}

val brilloPlatino = Brush.linearGradient(listOf(Color(0xFFFFFFFF), Color(0xFFD4D5D9), Color(0xFF9A9CA3)))

object T {
    val etiqueta = TextStyle(fontSize = 11.sp, letterSpacing = 2.4.sp, fontWeight = FontWeight.Medium, color = C.tenue)
    val titulo = TextStyle(fontSize = 30.sp, lineHeight = 36.sp, fontWeight = FontWeight.Light, color = C.platino, letterSpacing = (-0.4).sp)
    val subtitulo = TextStyle(fontSize = 18.sp, lineHeight = 24.sp, fontWeight = FontWeight.Normal, color = C.platino)
    val cuerpo = TextStyle(fontSize = 16.sp, lineHeight = 24.sp, color = C.plata)
    val chico = TextStyle(fontSize = 13.sp, lineHeight = 19.sp, color = C.tenue)
    val versiculo = TextStyle(fontFamily = FontFamily.Serif, fontStyle = FontStyle.Italic, fontSize = 19.sp, lineHeight = 29.sp, color = C.platino)
}

/** Fondo oscuro con dos halos suaves que dan profundidad al vidrio. */
@Composable
fun Fondo(content: @Composable BoxScope.() -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .background(C.fondo)
            .drawBehind {
                val a = Offset(size.width * 0.05f, size.height * 0.06f)
                drawCircle(Brush.radialGradient(listOf(Color(0x40A6ADBD), Color.Transparent), center = a, radius = size.width), size.width, a)
                val b = Offset(size.width * 1.0f, size.height * 0.62f)
                drawCircle(Brush.radialGradient(listOf(Color(0x2E8E98AA), Color.Transparent), center = b, radius = size.width * 0.9f), size.width * 0.9f, b)
            },
        content = content,
    )
}

/** Tarjeta de vidrio esmerilado. */
@Composable
fun Vidrio(modifier: Modifier = Modifier, padding: Dp = 22.dp, content: @Composable ColumnScope.() -> Unit) {
    val forma = RoundedCornerShape(28.dp)
    Column(
        modifier
            .fillMaxWidth()
            .clip(forma)
            .background(Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.10f), Color.White.copy(alpha = 0.035f))))
            .border(
                1.dp,
                Brush.linearGradient(listOf(Color.White.copy(alpha = 0.32f), Color.White.copy(alpha = 0.05f), Color.White.copy(alpha = 0.14f))),
                forma,
            )
            .padding(padding),
        content = content,
    )
}

@Composable
fun BotonPlatino(texto: String, modifier: Modifier = Modifier, enabled: Boolean = true, onClick: () -> Unit) {
    val forma = RoundedCornerShape(18.dp)
    Box(
        modifier
            .fillMaxWidth()
            .clip(forma)
            .background(if (enabled) brilloPlatino else SolidColor(Color.White.copy(alpha = 0.07f)))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(vertical = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(texto, color = if (enabled) C.tinta else C.tenue, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, letterSpacing = 0.4.sp)
    }
}

@Composable
fun BotonVidrio(texto: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val forma = RoundedCornerShape(18.dp)
    Box(
        modifier
            .fillMaxWidth()
            .clip(forma)
            .border(1.dp, Color.White.copy(alpha = 0.18f), forma)
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(texto, color = C.plata, fontSize = 14.sp, letterSpacing = 0.4.sp)
    }
}

@Composable
fun Campo(
    valor: String,
    onCambio: (String) -> Unit,
    placeholder: String = "",
    numerico: Boolean = false,
    minLineas: Int = 3,
    onFoco: (Boolean) -> Unit = {},
) {
    OutlinedTextField(
        value = valor,
        onValueChange = onCambio,
        modifier = Modifier.fillMaxWidth().onFocusChanged { onFoco(it.isFocused) },
        placeholder = { Text(placeholder, color = C.tenue) },
        singleLine = numerico,
        minLines = if (numerico) 1 else minLineas,
        keyboardOptions = if (numerico) KeyboardOptions(keyboardType = KeyboardType.Number)
        else KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
        shape = RoundedCornerShape(16.dp),
        textStyle = TextStyle(fontSize = 16.sp, lineHeight = 23.sp, color = C.platino),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Color.White.copy(alpha = 0.45f),
            unfocusedBorderColor = Color.White.copy(alpha = 0.14f),
            focusedTextColor = C.platino,
            unfocusedTextColor = C.platino,
            cursorColor = C.platino,
            focusedContainerColor = Color.White.copy(alpha = 0.04f),
            unfocusedContainerColor = Color.White.copy(alpha = 0.02f),
        ),
    )
}

@Composable
fun Etiqueta(texto: String, modifier: Modifier = Modifier, color: Color = C.tenue) {
    Text(texto.uppercase(), style = T.etiqueta.copy(color = color), modifier = modifier)
}

@Composable
fun Separador() {
    Box(Modifier.fillMaxWidth().padding(vertical = 18.dp).background(C.linea).padding(top = 1.dp))
}
