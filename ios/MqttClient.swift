import Foundation
import CocoaMQTT

class MqttClient {
  private let eventEmitter: MqttEventEmitter
  private let options: MqttOptions
  private let client: CocoaMQTT
  private let clientRef: String

  init(_ eventEmitter: MqttEventEmitter, options: MqttOptions, clientRef: String) throws {
    self.clientRef = clientRef
    self.eventEmitter = eventEmitter
    self.options = options
    if options.connProtocol == Protocol.WS || options.connProtocol == Protocol.WSS {
      let socket = CocoaMQTTWebSocket(uri: options.path)
        self.client = CocoaMQTT(clientID: options.clientId, host: options.host, port: options.port, socket: socket)
    } else {
      self.client = CocoaMQTT(clientID: options.clientId, host: options.host, port: options.port)
    }

    self.client.username = options.username
    self.client.password = options.password
    self.client.cleanSession = options.cleanSession
    self.client.willMessage = options.will?.toCocoaMqttMessage()
    self.client.keepAlive = options.keepaliveSec
    self.client.enableSSL = options.tls
    self.client.autoReconnect = options.autoReconnect
    self.client.delegate = self

    if options.tls {
      do {
        try parseCertificate(options: options)
      } catch let error {
        throw error
      }
    }

    var disconnected = false
    self.client.didChangeState = { (_: CocoaMQTT, newState: CocoaMQTTConnState) in
      if newState == CocoaMQTTConnState.disconnected {
        disconnected = true
        self.eventEmitter.sendEvent(event: MqttEvent.CONNECTION_LOST)
      }
      if newState == CocoaMQTTConnState.connected {
        if (disconnected) {
          disconnected = false
          let server_uri = self.options.connProtocol.rawValue + "://" + self.options.host + ":" + String(self.options.port)
          self.eventEmitter.sendEvent(event: MqttEvent.CONNECTION_COMPLETE, params: [
            MqttEventParam.SERVER_URI.rawValue: server_uri,
            MqttEventParam.RECONNECT.rawValue: true
          ])
        }
      }
    }

    self.client.didReceiveMessage = { (_, msg, _) in
      self.eventEmitter.sendEvent(event: MqttEvent.MESSAGE_RECEIVED, params: [
        MqttEventParam.TOPIC.rawValue: msg.topic,
        MqttEventParam.PAYLOAD.rawValue: Data(msg.payload).base64EncodedString()
      ])
    }
  }

  /**
   * Queries the connection status of the MQTT client.
   * @returns A boolean indicating whether or not the client is connected.
   */
  func isConnected() -> Bool {
    return self.client.connState == CocoaMQTTConnState.connected
  }

  /**
   * connects to the MQTT broker according to the
   * previously defined MqttConnectOptions
   * @param resolve resolve block of the JS promise to forward the result of the connection attempt
   * @param reject reject block of the JS promise to forward the result of the connection attempt
   */
  func connect(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      self.client.connect(timeout: self.options.connectionTimeout)
      self.client.didConnectAck = { (_, ack) in
        self.eventEmitter.sendEvent(event: MqttEvent.CONNECTED)
        resolve(self.clientRef)
        self.client.didConnectAck = { _, _ in }
      }
      eventEmitter.sendEvent(event: MqttEvent.CONNECTING)
    } catch {
      eventEmitter.forwardException(e: error)
      reject("", error.localizedDescription, nil)
    }
  }

  /**
   * Subscribes to one or more topics with the given
   * quality of service.
   *
   * @param topics one or more [MqttSubscription]s to subscribe to
   * @param resolve resolve block of the JS promise to forward the result of the subscription attempt
   * @param reject reject block of the JS promise to forward the result of the subscription attempt
   */
  func subscribe(topics: Array<MqttSubscription>, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      self.client.subscribe(topics.map { ($0.topic, $0.qos.cocoaQos()) })
      self.client.didSubscribeTopics = { (_, success, failed) in
        if failed.count != topics.count {
          self.eventEmitter.sendEvent(event: MqttEvent.SUBSCRIBED, params: [
              MqttEventParam.TOPIC.rawValue: success.allKeys
          ])
          resolve(self.clientRef)
        } else {
          reject("", "Failed to subscribe to topics: \(failed.joined(separator: ", "))", nil)
        }
        if failed.count > 0 {
          self.eventEmitter.forwardException(e: NSError(domain: "Mqtt", code: 0, userInfo: ["topics": failed]) )
        }
        self.client.didSubscribeTopics = { _, _, _ in }
      }
    } catch {
      eventEmitter.forwardException(e: error)
      reject("", error.localizedDescription, nil)
    }
  }

  /**
   * Unsubscribes from one or more topics
   *
   * @param topics one or more topic ids to unsubscribe from
   * @param resolve resolve block of the JS promise to forward the result of the unsubscription attempt
   * @param reject reject block of the JS promise to forward the result of the unsubscription attempt
   */
  func unsubscribe(topics: Array<String>, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      self.client.unsubscribe(topics)
      self.client.didUnsubscribeTopics = { (_, unsubscribed) in
        self.eventEmitter.sendEvent(event: MqttEvent.UNSUBSCRIBED, params: [
          MqttEventParam.TOPIC.rawValue: unsubscribed
        ])
        if unsubscribed.count == topics.count {
          resolve(self.clientRef)
        } else {
          let failed = topics.filter { t in return !unsubscribed.contains(t) }
          reject("", "Failed to unsubscribe from topics: \(failed.joined(separator: ", "))", nil)
        }
        self.client.didUnsubscribeTopics =  { _, _ in }
      }
    } catch {
      eventEmitter.forwardException(e: error)
      reject("", error.localizedDescription, nil)
    }
  }

  /**
   * Publishes a message to a topic.
   *
   * @param topic The topic to publish to.
   * @param payloadBase64 The message to publish.
   * @param resolve resolve block of the JS promise to forward the result of the publishing attempt
   * @param reject reject block of the JS promise to forward the result of the publishing attempt
   */
  func publish(topic: String, payloadBase64: String, options: PublishOptions, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let payload = Data(base64Encoded: payloadBase64)!
      let message = CocoaMQTTMessage(topic: topic, payload: [UInt8](payload), qos: options.qos.cocoaQos(), retained: options.retain)
      message.duplicated = options.isDuplicate
      self.client.didPublishMessage = { (_, msg, _) in
        self.eventEmitter.sendEvent(event: MqttEvent.MESSAGE_PUBLISHED, params: [
          MqttEventParam.TOPIC.rawValue: topic,
          MqttEventParam.PAYLOAD.rawValue: payloadBase64
        ])
        resolve(self.clientRef)
        self.client.didPublishMessage = { _, _, _ in }
      }
      self.client.publish(message)
    } catch {
      eventEmitter.forwardException(e: error)
      reject("", error.localizedDescription, nil)
    }
  }

  /**
   * Disconcts the client from the MQTT broker
   *
   * @param resolve resolve block of the JS promise to forward the result of the disconnect attempt
   * @param reject reject block of the JS promise to forward the result of the disconnect attempt
   */
  func disconnect(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      self.client.didDisconnect = { (_, err: Error?) in
        if let error = err {
          self.eventEmitter.forwardException(e: error)
          reject("", error.localizedDescription, nil)
        } else {
          self.eventEmitter.sendEvent(event: MqttEvent.DISCONNECTED)
          resolve(self.clientRef)
        }
        self.client.didDisconnect = { _, _ in }
      }
    } catch {
      eventEmitter.forwardException(e: error)
      reject("", error.localizedDescription, nil)
    }
  }

  func isConnected(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let isConnected = self.client.connState == CocoaMQTTConnState.connected
      resolve(isConnected)
    } catch {
      eventEmitter.forwardException(e: error)
      reject("", error.localizedDescription, nil)
    }
  }

  private func parseCertificate(options: MqttOptions) throws {
    guard let certKey = options.ios_certKeyP12Base64 else {
      self.client.allowUntrustCACertificate = true
      return
    }

    guard let keystorePw = options.keyStorePassword else {
      throw MqttError.certificateError("A keystore password for the p12 certificate must be provided.")
    }

    let opts: NSDictionary = [kSecImportExportPassphrase: keystorePw]
    var items: CFArray?

    guard let p12Data = NSData(base64Encoded: certKey, options: .ignoreUnknownCharacters) else {
      throw MqttError.certificateError("Failed to read p12 certificate")
    }
    let securityError = SecPKCS12Import(p12Data, opts, &items)

    guard securityError == errSecSuccess else {
      if securityError == errSecAuthFailed {
        throw MqttError.certificateError("SecPKCS12Import returned errSecAuthFailed. A possible reason might be that you provided an incorrect password.")
      } else {
        throw MqttError.certificateError("Failed to read p12 certificate. Reason code: \(securityError)")
      }
    }

    guard let certArray = items, CFArrayGetCount(certArray) > 0 else {
      throw MqttError.certificateError("Failed to read p12 certificate")
    }

    let dictionary = (certArray as NSArray).object(at: 0)
    guard let identity = (dictionary as AnyObject).value(forKey: kSecImportItemIdentity as String) else {
      throw MqttError.certificateError("Failed to read p12 certificate")
    }

    var sslSettings: [String: NSObject] = [:]

    sslSettings["kCFStreamSSLIsServer"] = NSNumber(value: false)
    sslSettings["kCFStreamSSLCertificates"] = [identity] as CFArray
    self.client.sslSettings = sslSettings
  }
}

extension MqttClient: CocoaMQTTDelegate {
  func mqtt(_ mqtt: CocoaMQTT, didReceive trust: SecTrust, completionHandler: @escaping (Bool) -> Void) {
    completionHandler(true)
  }

  func mqtt(_ mqtt: CocoaMQTT, didConnectAck ack: CocoaMQTTConnAck) {
  }

  func mqtt(_ mqtt: CocoaMQTT, didPublishMessage message: CocoaMQTTMessage, id: UInt16) {
  }

  func mqtt(_ mqtt: CocoaMQTT, didPublishAck id: UInt16) {
  }

  func mqtt(_ mqtt: CocoaMQTT, didReceiveMessage message: CocoaMQTTMessage, id: UInt16) {
  }

  func mqtt(_ mqtt: CocoaMQTT, didSubscribeTopics success: NSDictionary, failed: [String]) {
  }

  func mqtt(_ mqtt: CocoaMQTT, didUnsubscribeTopics topics: [String]) {
  }

  func mqttDidPing(_ mqtt: CocoaMQTT) {
  }

  func mqttDidReceivePong(_ mqtt: CocoaMQTT) {
  }

  func mqttDidDisconnect(_ mqtt: CocoaMQTT, withError err: Error?) {
  }
}

