package io.liriliri.aya

import android.util.Log

class AyaServer {
    companion object {
        private val TAG = "AyaServer"
        @JvmStatic
        fun main(args: Array<String>) {
            AyaServer().start(args)
        }
    }
    fun start(args: Array<String>) {
        Log.d(TAG, "Start Aya Server")
    }
}
