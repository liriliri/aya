package io.liriliri.aya

import android.annotation.SuppressLint
import android.os.IBinder
import android.os.IInterface
import java.lang.reflect.Method

@SuppressLint("PrivateApi")
object ServiceManager {
    val packageManager: PackageManager by lazy {
        PackageManager(getService("package", "android.content.pm.IPackageManager"))
    }
    val storageStatsManager: StorageStatsManager by lazy {
        StorageStatsManager(getService("storagestats", "android.app.usage.IStorageStatsManager"))
    }

    private var GET_SERVICE_METHOD: Method? = null

    init {
        try {
            GET_SERVICE_METHOD = Class.forName("android.os.ServiceManager").getDeclaredMethod(
                "getService",
                String::class.java
            )
        } catch (e: Exception) {
            throw AssertionError(e)
        }
    }

    private fun getService(service: String, type: String): IInterface {
        try {
            val binder = GET_SERVICE_METHOD!!.invoke(null, service) as IBinder
            val asInterfaceMethod = Class.forName("$type\$Stub").getMethod(
                "asInterface",
                IBinder::class.java
            )
            return asInterfaceMethod.invoke(null, binder) as IInterface
        } catch (e: Exception) {
            throw AssertionError(e)
        }
    }
}