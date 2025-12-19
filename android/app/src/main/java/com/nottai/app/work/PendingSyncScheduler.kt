package com.nottai.app.work

import android.content.Context
import android.content.SharedPreferences
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

object PendingSyncScheduler {
  private const val PREFS_NAME = "CapacitorStorage"
  private const val QUEUE_KEY = "nottai_pending_queue_v1"
  private const val UNIQUE_WORK_NAME = "nottai_pending_sync"

  private var listener: SharedPreferences.OnSharedPreferenceChangeListener? = null

  fun init(context: Context) {
    if (listener != null) return
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    listener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
      if (key == QUEUE_KEY) {
        scheduleIfNeeded(context)
      }
    }
    prefs.registerOnSharedPreferenceChangeListener(listener)
    scheduleIfNeeded(context)
  }

  fun dispose(context: Context) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    listener?.let { prefs.unregisterOnSharedPreferenceChangeListener(it) }
    listener = null
  }

  fun scheduleIfNeeded(context: Context) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val raw = prefs.getString(QUEUE_KEY, null) ?: ""
    if (raw.isBlank() || raw == "[]") return

    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    val request = OneTimeWorkRequestBuilder<NottaiPendingSyncWorker>()
      .setConstraints(constraints)
      .build()

    WorkManager.getInstance(context)
      .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.REPLACE, request)
  }
}
