package io.liriliri.aya

import android.util.Log
import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoHTTPD.Response.Status
import java.io.File
import java.io.FileInputStream
import java.net.ServerSocket
import java.net.URLDecoder

class HttpFileServer(port: Int) : NanoHTTPD(port) {
    private companion object {
        private const val TAG = "Aya.HttpFileServer"
    }

    override fun serve(session: IHTTPSession): Response {
        val rawPath = session.uri
        val decoded = URLDecoder.decode(rawPath, "UTF-8")
        val target = File(decoded)

        Log.i(HttpFileServer.TAG, "Request file: $rawPath")

        if (!target.exists() || target.isDirectory) {
            return newFixedLengthResponse(Status.NOT_FOUND, "text/plain", "Not Found")
        }

        val total = target.length()
        val mime = when {
            target.name.endsWith(".pdf", ignoreCase = true) -> "application/pdf"
            else -> getMimeTypeForFile(target.name)
        }

        val rangeHeader = session.headers["range"]
        if (rangeHeader != null) {
            val m = Regex("""bytes=(\d*)-(\d*)""").find(rangeHeader)
            if (m != null) {
                val (s, e) = m.destructured
                val start = s.toLongOrNull() ?: 0L
                val end = (e.toLongOrNull() ?: (total - 1)).coerceAtMost(total - 1)
                if (start in 0 until total && end >= start) {
                    val length = end - start + 1
                    val fis = FileInputStream(target)
                    if (start > 0) fis.skip(start)

                    val resp = newFixedLengthResponse(Status.PARTIAL_CONTENT, mime, fis, length)
                    resp.addHeader("Accept-Ranges", "bytes")
                    resp.addHeader("Content-Range", "bytes $start-$end/$total")
                    resp.addHeader("Connection", "close")
                    return resp
                }
            }
        }

        if (session.method == Method.HEAD) {
            val resp = newFixedLengthResponse(Status.OK, mime, "")
            resp.addHeader("Accept-Ranges", "bytes")
            resp.addHeader("Content-Length", total.toString())
            return resp
        }

        val fis = FileInputStream(target)
        val resp = newFixedLengthResponse(Status.OK, mime, fis, total)
        resp.addHeader("Accept-Ranges", "bytes")
        resp.addHeader("Connection", "close")
        return resp
    }
}

object HttpFileServerManager {
    @Volatile
    private var server: HttpFileServer? = null

    @Synchronized
    fun start(): Int {
        stop()
        var port = 9001
        repeat(100) {
            if (isPortAvailable(port)) {
                val srv = HttpFileServer(port)
                srv.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false)
                server = srv
                return port
            }
            port++
        }
        throw IllegalStateException("No available port found")
    }

    @Synchronized
    fun stop() {
        server?.stop()
        server = null
    }

    @Synchronized
    fun isRunning(): Boolean {
        return server?.isAlive ?: false
    }

    private fun isPortAvailable(port: Int): Boolean {
        return try {
            ServerSocket(port).use { true }
        } catch (e: Exception) {
            false
        }
    }
}
