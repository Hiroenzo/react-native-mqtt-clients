package com.mqtt.models

import com.facebook.react.bridge.ReadableMap
import android.util.Base64
import com.mqtt.utils.getOr
import com.mqtt.utils.hexToBytes

data class Will(
  val topic: String,
  val payload: ByteArray,
  val qos: QoS,
  val retain: Boolean,
) {
  @Suppress("UNCHECKED_CAST")
  constructor(willFromJs: ReadableMap): this(
    willFromJs.getOr<String>("topic", ""),
    Base64.decode(willFromJs.getOr<String>("payload", ""), Base64.DEFAULT),
    QoS.values()[willFromJs.getOr<Int>("qos", 0)],
    willFromJs.getOr<Boolean>("retain", false),
  )

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (javaClass != other?.javaClass) return false

    other as Will

    if (topic != other.topic) return false
    if (!payload.contentEquals(other.payload)) return false
    if (qos != other.qos) return false
    if (retain != other.retain) return false

    return true
  }

  override fun hashCode(): Int {
    var result = topic.hashCode()
    result = 31 * result + payload.contentHashCode()
    result = 31 * result + qos.hashCode()
    result = 31 * result + retain.hashCode()
    return result
  }

}
