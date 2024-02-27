import CocoaMQTT

struct Will {
  let topic: String
  let payload: String
  let qos: QoS
  let retain: Bool

  init(fromJsWill willFromJs: NSDictionary) {
    self.topic = Helpers.getOrDefault(dict: willFromJs, key: "topic", defaultValue: "last/will/and/testament")
    self.payload = Helpers.getOrDefault(dict: willFromJs, key: "payload", defaultValue: "Mozart!")
    self.qos = QoS(rawValue: Helpers.getOrDefault(dict: willFromJs, key: "qos", defaultValue: 0))!
    self.retain = Helpers.getOrDefault(dict: willFromJs, key: "retain", defaultValue: false)
  }

  func toCocoaMqttMessage() -> CocoaMQTTMessage {
    return CocoaMQTTMessage(topic: self.topic, payload: [UInt8](self.payload.utf8), qos: self.qos.cocoaQos(), retained: self.retain)
  }
}
