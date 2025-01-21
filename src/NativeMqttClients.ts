import { TurboModuleRegistry } from 'react-native';

import type { TurboModule } from 'react-native';

export enum Protocol {
  TCP = 'TCP',
  TCP_TLS = 'TCP_TLS',
  WS = 'WS',
  WSS = 'WSS',
}

export interface Spec extends TurboModule {
  createClient(options: {
    clientId?: string;
    username?: string;
    password?: string;
    keepaliveSec?: number;
    connectionTimeout?: number;
    will?: {
      topic: string;
      payload: string;
      qos: number;
      retain: boolean;
    };
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
  }): Promise<string>;
  connect(clientRef: string | undefined): Promise<void>;
  disconnect(clientRef: string | undefined): Promise<void>;
  reconnect(clientRef: string | undefined): Promise<void>;
  isConnected(clientRef: string | undefined): Promise<boolean>;
  subscribe(
    topics: {
      topic: string;
      qos: number;
    }[],
    clientRef: string | undefined
  ): Promise<void>;
  unsubscribe(topics: string[], clientRef: string | undefined): Promise<void>;
  publish(
    topic: string,
    payload: string,
    options: {
      qos?: number;
      retain?: boolean;
      isDuplicate?: boolean;
    },
    clientRef: string | undefined
  ): Promise<void>;
  end(clientRef: string | undefined, force: boolean): Promise<void>;

  addListener: (eventType: string) => void;
  removeListeners: (count: number) => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Mqtt');
