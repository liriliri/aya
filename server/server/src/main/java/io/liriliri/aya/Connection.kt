package io.liriliri.aya

import android.net.LocalSocket
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

class Connection(private val client: LocalSocket) : Thread() {
    private companion object {
        private const val TAG = "Aya.Connection"
    }

    override fun run() {
        while (!isInterrupted && client.isConnected) {
            val request = Wire.Request.parseDelimitedFrom(client.inputStream)
            val params = request.params.ifEmpty { "{}" }
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

            "getPackageInfo" -> {
                result.put("packageInfo", getPackageInfo(JSONObject(params)))
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

    private fun getPackageInfo(params: JSONObject): JSONObject {
        val packageName = params.getString("packageName")
        val packageInfo = ServiceManager.packageManager.getPackageInfo(packageName)

        val result = JSONObject()
        result.put("versionName", packageInfo.versionName)

        return result
    }
}
