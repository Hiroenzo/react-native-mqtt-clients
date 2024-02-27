import Foundation

class MqttEventEmitter {
  public static var shard: RCTEventEmitter!
  private let clientRef: String

  init(_ eventEmitter: RCTEventEmitter, _ clientRef: String) {
    self.clientRef = clientRef
    MqttEventEmitter.shard = eventEmitter
  }

  func forwardException(e: Error) {
    let params: [String: Any] = [
      MqttEventParam.ERR_CODE.rawValue: 0,
      MqttEventParam.ERR_MESSAGE.rawValue: e.localizedDescription,
      MqttEventParam.STACKTRACE.rawValue: ""
    ]
    if Mqtt.hasListener {
      MqttEventEmitter.shard.sendEvent(withName: MqttEvent.EXCEPTION.rawValue, body: params)
    }
  }

  func sendEvent(event: MqttEvent, params: NSMutableDictionary = [:]) {
    if Mqtt.hasListener {
      params.setValue(self.clientRef, forKey: MqttEventParam.CLIENT_REF.rawValue)
      MqttEventEmitter.shard.sendEvent(withName: event.rawValue, body: params)
    }
  }
}
