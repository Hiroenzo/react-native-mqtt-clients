package com.mqtt.utils

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.mqtt.models.events.MqttEvent
import com.mqtt.models.events.MqttEventParam
import org.eclipse.paho.client.mqttv3.MqttException

class MqttEventEmitter(private val reactContext: ReactContext, private val clientRef: String) {
  /**
   * forwards a raised exception downstream to the RN event emitter.
   * @param e The exception to forward.
   */
  fun forwardException(e: Throwable) {
    val params = Arguments.createMap()
    if (e is MqttException) {
      params.putInt(MqttEventParam.ERR_CODE.name, e.reasonCode)

      if (e.reasonCode == 0 && e.cause != null) return forwardException(e.cause!!)
    }
    params.putString(MqttEventParam.ERR_MESSAGE.name, e.message)
    params.putString(MqttEventParam.STACKTRACE.name, e.stackTrace.joinToString("\n\t") {
      "${it.fileName} - ${it.className}.${it.methodName}:${it.lineNumber}"
    })
    sendEvent(MqttEvent.EXCEPTION, params)
  }

  /**
   * sends an event to the RN event emitter.
   * @param event The event to report.
   * @param params The parameters to send with the event.
   */
  fun sendEvent(event: MqttEvent, params: WritableMap = Arguments.createMap()) {
    if (reactContext.hasActiveReactInstance()) {
      params.putString(MqttEventParam.CLIENT_REF.name, clientRef)
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(event.name, params)
    }
  }
}
