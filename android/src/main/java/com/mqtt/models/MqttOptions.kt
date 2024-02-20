package com.mqtt.models

import com.facebook.react.bridge.ReadableMap
import com.mqtt.utils.TlsHelpers
import com.mqtt.utils.getOr
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import java.util.*

data class MqttOptions(
  val clientId: String,
  val host: String,
  val port: Int,
  val protocol: Protocol,
  val username: String?,
  val password: String?,
  val tls: Boolean,
  val android_caBase64: String?,
  val keyStoreKey: String?,
  val android_certificateBase64: String?,
  val keyStorePassword: String?,
  val keepaliveSec: Int,
  val protocolVersion: Int,
  val cleanSession: Boolean,
  val connectionTimeoutMs: Int,
  val will: Will?,
  val path: String?,
  val autoReconnect: Boolean
) {
  val brokerUri: String = "${protocol.urlPrefix()}$host:$port$path"

  constructor(optionsFromJs: ReadableMap) : this(
    optionsFromJs.getOr<String>("clientId", "quito-android-${UUID.randomUUID()}"),
    optionsFromJs.getOr<String>("host", "test.mosquitto.org"),
    optionsFromJs.getOr<Int>("port", 1883),
    Protocol.valueOf(optionsFromJs.getOr<String>("protocol", "TCP")),
    optionsFromJs.getOr<String?>("username", null),
    optionsFromJs.getOr<String?>("password", null),
    optionsFromJs.getOr<Boolean>("tls", false),
    optionsFromJs.getOr<String?>("android_caBase64", null),
    optionsFromJs.getOr<String?>("keyStoreKey", null),
    optionsFromJs.getOr<String?>("android_certificateBase64", null),
    optionsFromJs.getOr<String?>("keyStorePassword", null),
    optionsFromJs.getOr<Int>("keepaliveSec", 60),
    optionsFromJs.getOr<Int>("protocolVersion", 4),
    optionsFromJs.getOr<Boolean>("clean", true),
    optionsFromJs.getOr<Int>("connectionTimeoutMs", 30000),
    optionsFromJs.getMap("will")?.let { Will(it) },
    optionsFromJs.getOr<String?>("path", ""),
    optionsFromJs.getOr<Boolean>("autoReconnect", false)
  )

  fun toPahoMqttOptions(tlsHelpers: TlsHelpers): MqttConnectOptions = MqttConnectOptions().apply {
    keepAliveInterval = this@MqttOptions.keepaliveSec
    connectionTimeout = this@MqttOptions.connectionTimeoutMs
    isCleanSession = this@MqttOptions.cleanSession
    mqttVersion = this@MqttOptions.protocolVersion
    userName = this@MqttOptions.username
    isAutomaticReconnect = this@MqttOptions.autoReconnect
    if (this@MqttOptions.password != null) {
      password = this@MqttOptions.password.toCharArray()
    }
    if (will != null) {
      setWill(will.topic, will.payload, will.qos.ordinal, will.retain)
    }
    if (this@MqttOptions.tls) {
      if (this@MqttOptions.android_caBase64 == null || this@MqttOptions.android_certificateBase64 == null) {
        socketFactory = null
        isHttpsHostnameVerificationEnabled = false
      } else {
        socketFactory = tlsHelpers.getSocketFactory(
          this@MqttOptions.android_caBase64,
          this@MqttOptions.keyStoreKey,
          this@MqttOptions.android_certificateBase64,
          this@MqttOptions.keyStorePassword
        )
      }
    }
  }
}
