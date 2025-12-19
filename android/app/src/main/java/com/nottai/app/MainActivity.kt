package com.nottai.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.nottai.app.work.PendingSyncScheduler

class MainActivity : BridgeActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    PendingSyncScheduler.init(this)
  }

  override fun onDestroy() {
    PendingSyncScheduler.dispose(this)
    super.onDestroy()
  }
}
