package io.liriliri.aya

import android.content.pm.PackageInfo
import android.os.Build
import android.os.IInterface
import android.util.Log
import java.lang.reflect.Method

class PackageManager(private val manager: IInterface) {
    companion object {
        private const val TAG = "Aya.PackageManager"
    }

    private val getPackageInfoMethod: Method by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) manager.javaClass.getMethod(
            "getPackageInfo",
            String::class.java, java.lang.Long.TYPE, Integer.TYPE
        ) else manager.javaClass.getMethod(
            "getPackageInfo",
            String::class.java, Integer.TYPE, Integer.TYPE
        )
    }

    fun getPackageInfo(packageName: String, flags: Int): PackageInfo {
        Log.i(TAG, "Get package info: $packageName")

        return getPackageInfoMethod.invoke(manager, packageName, flags, 0) as PackageInfo
    }
}