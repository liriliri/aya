package io.liriliri.aya

import android.content.pm.ApplicationInfo
import android.content.res.AssetManager
import android.content.res.Configuration
import android.content.res.Resources
import android.net.LocalSocket
import android.os.Build
import android.util.Base64
import android.util.DisplayMetrics
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class Connection(private val client: LocalSocket) : Thread() {
    private companion object {
        private const val TAG = "Aya.Connection"
        private val cache = mutableMapOf<String, Cache>()
    }

    override fun run() {
        while (!isInterrupted && client.isConnected) {
            try {
                val request = Wire.Request.parseDelimitedFrom(client.inputStream)
                val params = request.params.ifEmpty { "{}" }
                handleRequest(request.id, request.method, params)
            } catch (e: Exception) {
                break
            }
        }

        client.close()
        Log.i(TAG, "Client disconnected")
    }

    private fun handleRequest(id: String, method: String, params: String) {
        Log.i(TAG, "Request method: $method, params: $params")

        val result = JSONObject()

        when (method) {
            "getVersion" -> {
                result.put("version", getVersion())
            }

            "getPackageInfos" -> {
                result.put("packageInfos", getPackageInfos(JSONObject(params)))
            }

            else -> {
                Log.e(TAG, "Unknown method: $method")
            }
        }

        Log.i(TAG, "Response: $result")
        Wire.Response.newBuilder().setId(id).setResult(result.toString()).build()
            .writeDelimitedTo(client.outputStream)
    }

    private fun getVersion(): String {
        return BuildConfig.VERSION_NAME
    }

    private fun getPackageInfos(params: JSONObject): JSONArray {
        val packageNames = Util.jsonArrayToStringArray(params.getJSONArray("packageNames"))
        val result = JSONArray()

        packageNames.forEach {
            result.put(getPackageInfo(it))
        }

        return result
    }

    private fun getPackageInfo(packageName: String): JSONObject {
        val packageInfo =
            ServiceManager.packageManager.getPackageInfo(packageName)

        val info = JSONObject()
        info.put("packageName", packageInfo.packageName)
        info.put("versionName", packageInfo.versionName)
        info.put("firstInstallTime", packageInfo.firstInstallTime)
        info.put("lastUpdateTime", packageInfo.lastUpdateTime)

        val applicationInfo = packageInfo.applicationInfo
        var apkSize = 0L
        val apkPath = applicationInfo.sourceDir
        apkSize = File(apkPath).length()
        info.put("apkPath", apkPath)
        info.put("apkSize", apkSize)
        info.put("enabled", applicationInfo.enabled)

        var system = false
        if ((applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) == ApplicationInfo.FLAG_SYSTEM) {
            system = true
        }
        info.put("system", system)

        var label = packageName
        var icon = ""

        if (cache[packageName] != null) {
            val cacheInfo = cache[packageName]!!
            label = cacheInfo.label
            icon = cacheInfo.icon
        } else {
            val resources = getResources(apkPath)
            val labelRes = applicationInfo.labelRes
            if (labelRes != 0) {
                label = resources.getString(labelRes)
            }

            if (applicationInfo.icon != 0) {
                try {
                    val resIcon = resources.getDrawable(applicationInfo.icon)
                    val bitmapIcon = Util.drawableToBitmap(resIcon)
                    icon = "data:image/png;base64,${
                        Base64.encodeToString(
                            Util.bitMapToPng(bitmapIcon, 20),
                            Base64.DEFAULT
                        )
                    }"
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to get icon for $packageName")
                }
            }
            cache[packageName] = Cache(label, icon)
        }
        info.put("label", label)
        info.put("icon", icon)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            info.put("minSdkVersion", applicationInfo.minSdkVersion)
            info.put("targetSdkVersion", applicationInfo.targetSdkVersion)
        }

        return info
    }

    private fun getResources(apkPath: String): Resources {
        val assetManager = AssetManager::class.java.newInstance() as AssetManager
        val addAssetManagerMethod =
            assetManager.javaClass.getMethod("addAssetPath", String::class.java)
        addAssetManagerMethod.invoke(assetManager, apkPath)

        val displayMetrics = DisplayMetrics()
        displayMetrics.setToDefaults()
        val configuration = Configuration()
        configuration.setToDefaults()

        return Resources(assetManager, displayMetrics, configuration)
    }
}

class Cache(val label: String, val icon: String)
