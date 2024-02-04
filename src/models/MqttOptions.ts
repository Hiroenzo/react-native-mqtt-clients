import { Protocol } from './Protocol';
import type { Will } from './Will';
import type { Buffer } from 'buffer';
import { parseBrokerUrl } from '../utils/helpers';

export type MqttOptions = {
  clientId?: string;
  username?: string;
  password?: string;
  keepaliveSec?: number;
  connectTimeoutMs?: number;
  will?: Will;
  tls?: boolean;
  ios_certKeyP12Base64?: string;
  android_caBase64?: string;
  android_certificateBase64?: string;
  android_privateKeyBase64?: string;
  keyStoreKey?: string;
  keyStorePassword?: string;
  cleanSession?: boolean;
  protocol?: Protocol;
  protocolVersion?: number;
  reconnectPeriod?: number;
  host?: string;
  port?: number;
  autoReconnect?: boolean;
  path?: string;
};

/**
 * This class serves to create an options object for the MQTT client.
 */
export class MqttOptionsBuilder {
  private _options: MqttOptions = {};

  public peek(field: string): any {
    return (this._options as any)[field];
  }
  public uri(uri: string): MqttOptionsBuilder;
  // eslint-disable-next-line no-dupe-class-members
  public uri(
    host: string,
    port: number,
    protocol: Protocol
  ): MqttOptionsBuilder;
  // eslint-disable-next-line no-dupe-class-members
  public uri(
    hostOrUri: string,
    port?: number,
    protocol?: Protocol
  ): MqttOptionsBuilder {
    if (port === undefined || hostOrUri.includes(':')) {
      const uri = hostOrUri;
      const { host, port, protocol, tls } = parseBrokerUrl(uri);
      this._options.host = host;
      this._options.port = port;
      this._options.protocol = protocol;
      this._options.tls = tls;
    } else {
      if (protocol === undefined) {
        throw new Error('Missing protocol prefix in broker url');
      }
      this._options.host = hostOrUri;
      this._options.port = port;
      this._options.protocol = protocol;

      this._options.tls =
        protocol === Protocol.TCP_TLS || protocol === Protocol.WSS;
    }

    return this;
  }

  public clientId(clientId: string): MqttOptionsBuilder {
    this._options.clientId = clientId;
    return this;
  }

  public username(username: string): MqttOptionsBuilder {
    this._options.username = username;
    return this;
  }

  public password(password: string): MqttOptionsBuilder {
    this._options.password = password;
    return this;
  }

  public keepalive(keepalive: number): MqttOptionsBuilder {
    this._options.keepaliveSec = keepalive;
    return this;
  }

  public connectTimeoutMs(connectTimeoutMs: number): MqttOptionsBuilder {
    this._options.connectTimeoutMs = connectTimeoutMs;
    return this;
  }

  public will(will: Will): MqttOptionsBuilder {
    this._options.will = will;
    return this;
  }

  public tls(tls: boolean): MqttOptionsBuilder {
    if (this._options.tls !== undefined && this._options.tls !== tls) {
      throw new Error('TLS is required by the chosen protocol.');
    }
    if (this._options.protocol === Protocol.TCP && tls) {
      this._options.protocol = Protocol.TCP_TLS;
    }
    this._options.tls = tls;
    return this;
  }

  public ca(ca: Buffer): MqttOptionsBuilder {
    this._options.android_caBase64 = ca.toString('base64');
    return this;
  }

  public android_caBase64(android_caBase64: string): MqttOptionsBuilder {
    this._options.android_caBase64 = android_caBase64;
    return this;
  }

  public clientCertificate(
    certificateDer: Buffer,
    keyRsaDer: Buffer,
    keyStorePassword: string
  ): MqttOptionsBuilder {
    this._options.android_certificateBase64 = certificateDer.toString('base64');
    this._options.android_privateKeyBase64 = keyRsaDer.toString('base64');
    this._options.keyStorePassword = keyStorePassword;
    return this;
  }

  public certificate(certificate: Buffer): MqttOptionsBuilder {
    this._options.android_certificateBase64 = certificate.toString('base64');
    return this;
  }

  public android_certificateBase64(
    android_certificateBase64: string
  ): MqttOptionsBuilder {
    this._options.android_certificateBase64 = android_certificateBase64;
    return this;
  }

  public keyStoreKey(keyStoreKey: string): MqttOptionsBuilder {
    this._options.android_privateKeyBase64 = keyStoreKey;
    return this;
  }

  public keyStorePassword(keyStorePassword: string): MqttOptionsBuilder {
    this._options.keyStorePassword = keyStorePassword;
    return this;
  }

  public cleanSession(cleanSession: boolean): MqttOptionsBuilder {
    this._options.cleanSession = cleanSession;
    return this;
  }

  public protocolVersion(protocolVersion: number): MqttOptionsBuilder {
    this._options.protocolVersion = protocolVersion;
    return this;
  }

  public reconnectPeriod(reconnectPeriod: number): MqttOptionsBuilder {
    this._options.reconnectPeriod = reconnectPeriod;
    return this;
  }

  public autoReconnect(autoReconnect: boolean): MqttOptionsBuilder {
    this._options.autoReconnect = autoReconnect;
    return this;
  }

  public path(path: string): MqttOptionsBuilder {
    this._options.path = path;
    return this;
  }

  public build(): MqttOptions {
    if (this._options.host === undefined) {
      throw new Error('Please provide a broker url to connect to.');
    }
    return this._options;
  }
}
