package io.liriliri.aya

import android.net.LocalSocket
import android.util.Log

class Connection(private val client: LocalSocket) : Thread() {
    private companion object {
        private const val TAG = "Aya.Connection"
    }
    override fun run() {
        Log.i(TAG, "run")

        val request = Wire.Request.parseDelimitedFrom(client.inputStream)
        Log.i(TAG, "Request method: ${request.method}")

        client.close()
        Log.i(TAG, "Disconnected")
    }
}
