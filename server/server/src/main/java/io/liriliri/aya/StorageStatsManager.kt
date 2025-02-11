package io.liriliri.aya

import android.annotation.TargetApi
import android.app.usage.StorageStats
import android.os.Build
import android.os.IInterface
import android.util.Log
import java.lang.reflect.Method

class StorageStatsManager(private val manager: IInterface) {
    companion object {
        private const val TAG = "Aya.StorageStatsManager"
    }

    private val queryStatsForPackageMethod: Method by lazy {
        manager.javaClass.getMethod(
            "queryStatsForPackage",
            String::class.java, String::class.java, Integer.TYPE, String::class.java
        )
    }

    @TargetApi(Build.VERSION_CODES.O)
    fun queryStatsForPackage(packageName: String): StorageStats {
        Log.i(TAG, "Query storage stats: $packageName")

        return queryStatsForPackageMethod.invoke(manager, null, packageName, 0, "") as StorageStats
    }
}