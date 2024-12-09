package io.liriliri.aya

import android.net.LocalSocket
import android.util.Log
import org.json.JSONObject

class Connection(private val client: LocalSocket) : Thread() {
    private companion object {
        private const val TAG = "Aya.Connection"
    }

    override fun run() {
        while (!isInterrupted && client.isConnected) {
            val request = Wire.Request.parseDelimitedFrom(client.inputStream)
            val params = if (request.params.isEmpty()) "{}" else ""
            handleRequest(request.id, request.method, params)
        }

        client.close()
        Log.i(TAG, "Disconnected")
    }

    private fun handleRequest(id: String, method: String, params: String) {
        Log.i(TAG, "Request method: $method, params: $params")

        val result = JSONObject()

        when (method) {
            "getVersion" -> {
                result.put("version", getVersion())
            }

            else -> {
                Log.e(TAG, "Unknown method: $method")
            }
        }

        Wire.Response.newBuilder().setId(id).setResult(result.toString()).build()
            .writeDelimitedTo(client.outputStream)
    }

    private fun getVersion(): String {
        return BuildConfig.VERSION_NAME
    }
}
