package io.liriliri.aya

import android.annotation.TargetApi
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
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
        private var packageCache = JSONObject()
        private var packageCacheChanged = false
        private const val PACKAGE_CACHE_FILE = "/data/local/tmp/aya/packageCache.json"

        init {
            loadPackageCache()
        }

        private fun loadPackageCache() {
            Log.i(TAG, "Load package cache")

            val file = File(PACKAGE_CACHE_FILE)
            if (file.exists()) {
                packageCache = JSONObject(file.readText())
            }
        }

        private fun savePackageCache() {
            Log.i(TAG, "Save package cache")
            if (!packageCacheChanged) {
                return
            }
            packageCacheChanged = false

            val file = File(PACKAGE_CACHE_FILE)
            file.writeText(packageCache.toString())
        }
    }

    override fun run() {
        while (!isInterrupted && client.isConnected) {
            try {
                val request = Wire.Request.parseDelimitedFrom(client.inputStream)
                val params = request.params.ifEmpty { "{}" }
                handleRequest(request.id, request.method, params)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to handle request", e)
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
            try {
                result.put(getPackageInfo(it))
            } catch (e: Exception) {
                Log.e(TAG, "Fail to get package info", e)
            }
        }
        savePackageCache()

        return result
    }

    @TargetApi(Build.VERSION_CODES.P)
    private fun getPackageInfo(packageName: String): JSONObject {
        var flags = PackageManager.GET_ACTIVITIES
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            flags = flags or PackageManager.GET_SIGNING_CERTIFICATES
        } else {
            flags = flags or PackageManager.GET_SIGNATURES
        }
        val packageInfo =
            ServiceManager.packageManager.getPackageInfo(packageName, flags)

        val info = JSONObject()
        info.put("packageName", packageInfo.packageName)
        info.put("versionName", packageInfo.versionName)
        info.put("firstInstallTime", packageInfo.firstInstallTime)
        info.put("lastUpdateTime", packageInfo.lastUpdateTime)
        info.put("signatures", getSignatures(packageInfo))

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

        val cacheKey = packageName + apkSize

        if (packageCache.has(cacheKey)) {
            val cacheInfo = packageCache.getJSONObject(cacheKey)
            label = cacheInfo.getString("label")
            icon = cacheInfo.getString("icon")
        } else {
            val resources = getResources(apkPath)
            val labelRes = applicationInfo.labelRes
            if (labelRes != 0) {
                try {
                    label = resources.getString(labelRes)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to get label for $packageName")
                }
            }

            if (applicationInfo.icon != 0) {
                try {
                    val resIcon = resources.getDrawable(applicationInfo.icon)
                    val bitmapIcon = Util.drawableToBitmap(resIcon)
                    icon = "data:image/png;base64,${
                        Base64.encodeToString(
                            Util.bitMapToPng(bitmapIcon, 20),
                            Base64.NO_WRAP
                        )
                    }"
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to get icon for $packageName")
                }
            }
            val cacheInfo = JSONObject()
            cacheInfo.put("label", label)
            cacheInfo.put("icon", icon)
            packageCache.put(cacheKey, cacheInfo)
            packageCacheChanged = true
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

    private fun getSignatures(packageInfo: PackageInfo): JSONArray {
        val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            packageInfo.signingInfo.apkContentsSigners
        } else {
            packageInfo.signatures
        }

        val array = JSONArray()
        signatures.forEach {
            array.put(Base64.encodeToString(it.toByteArray(), Base64.NO_WRAP))
        }
        return array
    }
}
