package io.liriliri.aya

import android.net.LocalSocket
import android.util.Log
import java.io.BufferedReader
import java.io.InputStreamReader

class Connection(private val client: LocalSocket) : Thread() {
    private companion object {
        private const val TAG = "Aya.Connection"
    }
    override fun run() {
        Log.i(TAG, "run")

        val sb = StringBuilder()
        val br = BufferedReader(InputStreamReader(client.inputStream))
        var line = br.readLine()
        while (line != null) {
            sb.append(line)
            line = br.readLine()
        }
        val content = sb.toString()
        Log.i(TAG, "Received: $content")

        client.close()
        Log.i(TAG, "Disconnected")
    }
}
