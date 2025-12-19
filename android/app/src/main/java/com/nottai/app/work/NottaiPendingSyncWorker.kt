package com.nottai.app.work

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.tasks.await
import org.json.JSONArray
import org.json.JSONObject

class NottaiPendingSyncWorker(appContext: Context, workerParams: WorkerParameters) :
  CoroutineWorker(appContext, workerParams) {

  companion object {
    private const val TAG = "NottaiPendingSyncWorker"
    private const val PREFS_NAME = "CapacitorStorage"
    private const val QUEUE_KEY = "nottai_pending_queue_v1"
    private const val MAX_PER_RUN = 25
  }

  override suspend fun doWork(): Result {
    val user = FirebaseAuth.getInstance().currentUser
    if (user == null) {
      Log.w(TAG, "No authenticated user, retrying later.")
      return Result.retry()
    }
    val uid = user.uid

    val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val rawQueue = prefs.getString(QUEUE_KEY, null) ?: ""
    if (rawQueue.isBlank() || rawQueue == "[]") {
      return Result.success()
    }

    val jsonArray = try {
      JSONArray(rawQueue)
    } catch (e: Exception) {
      Log.e(TAG, "Invalid queue JSON", e)
      return Result.success()
    }

    val db = FirebaseFirestore.getInstance()
    val items = mutableListOf<JSONObject>()
    for (i in 0 until jsonArray.length()) {
      val obj = jsonArray.optJSONObject(i) ?: continue
      items.add(obj)
    }

    val toProcess = items.take(MAX_PER_RUN)
    val remaining = items.drop(MAX_PER_RUN).toMutableList()
    var hasNetworkFailure = false

    for (item in toProcess) {
      val attempts = item.optInt("attempts", 0) + 1
      item.put("attempts", attempts)
      try {
        handleItem(db, uid, item)
      } catch (e: Exception) {
        val msg = e.message ?: e.javaClass.simpleName
        item.put("lastError", msg)
        item.put("status", "FAILED")
        remaining.add(item)
        if (e is FirebaseNetworkException) {
          hasNetworkFailure = true
        }
      }
    }

    val newQueue = JSONArray()
    remaining.forEach { newQueue.put(it) }
    prefs.edit().putString(QUEUE_KEY, newQueue.toString()).apply()

    PendingSyncScheduler.scheduleIfNeeded(applicationContext)

    return if (remaining.isEmpty()) {
      Result.success()
    } else if (hasNetworkFailure) {
      Result.retry()
    } else {
      Result.success()
    }
  }

  private suspend fun handleItem(db: FirebaseFirestore, uid: String, item: JSONObject) {
    val type = item.optString("type")
    val payload = item.opt("payload")
    when (type) {
      "UPSERT_CLIENT" -> {
        val client = payload as? JSONObject ?: JSONObject(payload.toString())
        val id = client.optString("id")
        require(id.isNotBlank()) { "client id missing" }
        db.collection("users").document(uid).collection("clients").document(id)
          .set(jsonToMap(client), SetOptions.merge()).await()
      }
      "DELETE_CLIENT" -> {
        val id = payload as? String ?: payload?.toString().orEmpty()
        require(id.isNotBlank()) { "client id missing" }
        db.collection("users").document(uid).collection("clients").document(id).delete().await()
      }
      "UPSERT_SALE" -> {
        val sale = payload as? JSONObject ?: JSONObject(payload.toString())
        val id = sale.optString("id")
        require(id.isNotBlank()) { "sale id missing" }
        db.collection("users").document(uid).collection("sales").document(id)
          .set(jsonToMap(sale), SetOptions.merge()).await()
      }
      "DELETE_SALE" -> {
        val id = payload as? String ?: payload?.toString().orEmpty()
        require(id.isNotBlank()) { "sale id missing" }
        db.collection("users").document(uid).collection("sales").document(id).delete().await()
      }
      "UPSERT_PAYMENT" -> {
        val data = payload as? JSONObject ?: JSONObject(payload.toString())
        val payment = data.optJSONObject("payment") ?: JSONObject(data.opt("payment").toString())
        val id = payment.optString("id")
        require(id.isNotBlank()) { "payment id missing" }
        val batch = db.batch()
        val paymentRef = db.collection("users").document(uid).collection("payments").document(id)
        batch.set(paymentRef, jsonToMap(payment), SetOptions.merge())

        val salesToMark = data.optJSONArray("salesToMarkAsPaid")
        if (salesToMark != null) {
          for (i in 0 until salesToMark.length()) {
            val saleObj = salesToMark.optJSONObject(i) ?: continue
            val saleId = saleObj.optString("id")
            if (saleId.isNotBlank()) {
              val saleRef = db.collection("users").document(uid).collection("sales").document(saleId)
              batch.set(saleRef, jsonToMap(saleObj), SetOptions.merge())
            }
          }
        }
        batch.commit().await()
      }
      "DELETE_PAYMENT" -> {
        val id = payload as? String ?: payload?.toString().orEmpty()
        require(id.isNotBlank()) { "payment id missing" }
        db.collection("users").document(uid).collection("payments").document(id).delete().await()
      }
      "SAVE_PRICE_SETTINGS" -> {
        val settings = payload as? JSONObject ?: JSONObject(payload.toString())
        val ref = db.collection("users").document(uid).collection("settings").document("price")
        ref.set(jsonToMap(settings), SetOptions.merge()).await()
      }
      else -> {
        Log.w(TAG, "Unknown queue item type: $type")
      }
    }
  }

  private fun jsonToMap(obj: JSONObject): Map<String, Any?> {
    val map = mutableMapOf<String, Any?>()
    val it = obj.keys()
    while (it.hasNext()) {
      val key = it.next()
      when (val value = obj.get(key)) {
        is JSONObject -> map[key] = jsonToMap(value)
        is JSONArray -> map[key] = jsonArrayToList(value)
        JSONObject.NULL -> map[key] = null
        else -> map[key] = value
      }
    }
    return map
  }

  private fun jsonArrayToList(arr: JSONArray): List<Any?> {
    val list = mutableListOf<Any?>()
    for (i in 0 until arr.length()) {
      when (val value = arr.get(i)) {
        is JSONObject -> list.add(jsonToMap(value))
        is JSONArray -> list.add(jsonArrayToList(value))
        JSONObject.NULL -> list.add(null)
        else -> list.add(value)
      }
    }
    return list
  }
}
