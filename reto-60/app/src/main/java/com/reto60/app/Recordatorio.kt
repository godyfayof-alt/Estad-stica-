package com.reto60.app

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

/** Recordatorio diario a las 5:00. */
object Recordatorio {
    private const val CANAL = "reto_del_dia"

    fun crearCanal(ctx: Context) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CANAL, "Reto del día", NotificationManager.IMPORTANCE_HIGH)
                .apply { description = "Aviso a las 5:00 con tu tarjeta del día" }
        )
    }

    fun programar(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        val zona = ZoneId.systemDefault()
        var cuando = LocalDate.now(zona).atTime(LocalTime.of(5, 0)).atZone(zona)
        if (!cuando.toInstant().isAfter(java.time.Instant.now())) cuando = cuando.plusDays(1)
        val t = cuando.toInstant().toEpochMilli()
        val pi = PendingIntent.getBroadcast(
            ctx, 0, Intent(ctx, ReminderReceiver::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val exacta = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()
        if (exacta) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi)
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi)
    }

    fun mostrar(ctx: Context) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        val p = Almacen(ctx).cargar()
        if (p.startedAt == null) return
        val abrir = PendingIntent.getActivity(
            ctx, 1, Intent(ctx, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val texto = if (p.retos[p.actual]?.completedAt != null) "Tu siguiente tarjeta ya está lista."
        else "Tu reto ${p.actual} sigue esperando. Hoy es un buen día para cumplirlo."
        val n = android.app.Notification.Builder(ctx, CANAL)
            .setSmallIcon(R.drawable.ic_fg)
            .setContentTitle("Buenos días. 1% mejor hoy.")
            .setContentText(texto)
            .setContentIntent(abrir)
            .setAutoCancel(true)
            .build()
        ctx.getSystemService(NotificationManager::class.java).notify(1, n)
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        Recordatorio.mostrar(ctx)
        Recordatorio.programar(ctx)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) Recordatorio.programar(ctx)
    }
}
