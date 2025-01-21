import { toByteArray, fromByteArray } from 'base64-js';

import MqttNative, { MqttEventEmitter } from './module';

import { MqttEvent } from './models/events/MqttEvent';
import { MqttEventParam } from './models/events/MqttEventParam';

import type { MqttOptions } from './models/MqttOptions';
import type { MqttSubscription } from './models/MqttSubscription';
import type { PublishOptions } from './models/PublishOptions';

export * from './models/events/MqttEvent';
export * from './models/Protocol';
export * from './models/MqttOptions';

/**
 * MqttClient is a Typescript wrapper for native MQTT clients
 *
 * @param options configuration options for the client
 */
export class MqttClient {
  private readonly _options: MqttOptions;
  private _clientRef?: string;
  private _eventHandler: any = {};
  private _eventEmitter;

  constructor(options: MqttOptions) {
    this._options = options;
    this._eventEmitter = MqttEventEmitter();
  }

  async init(): Promise<void> {
    this._clientRef = await MqttNative.createClient(this._options);
    this._setupEventListeners();
  }

  public on(event: MqttEvent.CONNECTED, cb: () => void): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(event: MqttEvent.CONNECTING, cb: () => void): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(
    event: MqttEvent.CONNECTION_LOST,
    cb: (errorMsg?: string, errorCode?: number, stackTrace?: string) => void
  ): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(event: MqttEvent.SUBSCRIBED, cb: (topic: string) => void): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(event: MqttEvent.UNSUBSCRIBED, cb: (topic: string) => void): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(
    event: MqttEvent.MESSAGE_RECEIVED,
    cb: (topic: string, payload: Uint8Array) => void
  ): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(
    event: MqttEvent.MESSAGE_PUBLISHED,
    cb: (topic: string, payload: Uint8Array) => void
  ): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(event: MqttEvent.DISCONNECTED, cb: () => void): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(
    event: MqttEvent.EXCEPTION,
    cb: (errorMsg?: string, errorCode?: number, stackTrace?: string) => void
  ): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(event: MqttEvent.CLOSED, cb: () => void): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(
    event: MqttEvent.CONNECTION_COMPLETE,
    cb: (serverURI: string, reconnect: boolean) => void
  ): this;
  // eslint-disable-next-line no-dupe-class-members
  public on(event: string, cb: Function): this {
    this._eventHandler[event] = cb;
    return this;
  }

  connect(): void {
    MqttNative.connect(this._clientRef);
  }

  async connectAsync(): Promise<void> {
    await MqttNative.connect(this._clientRef);
  }

  disconnect(): void {
    MqttNative.disconnect(this._clientRef);
  }

  async disconnectAsync(): Promise<void> {
    await MqttNative.disconnect(this._clientRef);
  }

  subscribe(...topics: MqttSubscription[]): void {
    MqttNative.subscribe([...topics], this._clientRef);
  }

  async subscribeAsync(...topics: MqttSubscription[]): Promise<void> {
    await MqttNative.subscribe([...topics], this._clientRef);
  }

  unsubscribe(topic: string | string[]): void {
    const readableTopics = Array.from([topic].flat());
    MqttNative.unsubscribe(readableTopics, this._clientRef);
  }

  async unsubscribeAsync(topic: string | string[]): Promise<void> {
    const readableTopics = Array.from([topic].flat());
    await MqttNative.unsubscribe(readableTopics, this._clientRef);
  }

  publish(
    topic: string,
    payload: Uint8Array,
    options: PublishOptions = {}
  ): void {
    MqttNative.publish(topic, fromByteArray(payload), options, this._clientRef);
  }

  async publishAsync(
    topic: string,
    payload: Uint8Array,
    options: PublishOptions = {}
  ): Promise<void> {
    MqttNative.publish(topic, fromByteArray(payload), options, this._clientRef);
  }

  reconnect(): void {
    MqttNative.reconnect(this._clientRef);
  }

  async isConnected(): Promise<boolean> {
    return await MqttNative.isConnected(this._clientRef);
  }

  end(force: boolean = false): void {
    MqttNative.end(this._clientRef, force);
    this._removeEventListeners();
  }

  async endAsync(force: boolean = false): Promise<void> {
    await MqttNative.end(this._clientRef, force);
    this._removeEventListeners();
  }

  close = this.end;
  closeAsync = this.endAsync;

  private _removeEventListeners(): void {
    this._eventEmitter.removeAllListeners(MqttEvent.CLIENT_REF_UNKNOWN);
    this._eventEmitter.removeAllListeners(MqttEvent.CONNECTED);
    this._eventEmitter.removeAllListeners(MqttEvent.CONNECTING);
    this._eventEmitter.removeAllListeners(MqttEvent.CONNECTION_LOST);
    this._eventEmitter.removeAllListeners(MqttEvent.CLOSED);
    this._eventEmitter.removeAllListeners(MqttEvent.DELIVERY_COMPLETE);
    this._eventEmitter.removeAllListeners(MqttEvent.DISCONNECTED);
    this._eventEmitter.removeAllListeners(MqttEvent.EXCEPTION);
    this._eventEmitter.removeAllListeners(MqttEvent.MESSAGE_RECEIVED);
    this._eventEmitter.removeAllListeners(MqttEvent.RECONNECT);
    this._eventEmitter.removeAllListeners(MqttEvent.CONNECTION_COMPLETE);
    this._eventEmitter.removeAllListeners(MqttEvent.SUBSCRIBED);
    this._eventEmitter.removeAllListeners(MqttEvent.UNSUBSCRIBED);
  }

  private _setupEventListeners(): void {
    this._addEventListener(MqttEvent.CONNECTING);
    this._addEventListener(MqttEvent.CONNECTED);
    this._addEventListener(MqttEvent.CLOSED);
    this._addEventListener(
      MqttEvent.CONNECTION_LOST,
      MqttEventParam.ERR_MESSAGE,
      MqttEventParam.ERR_CODE,
      MqttEventParam.STACKTRACE
    );
    this._addEventListener(
      MqttEvent.EXCEPTION,
      MqttEventParam.ERR_MESSAGE,
      MqttEventParam.ERR_CODE,
      MqttEventParam.STACKTRACE
    );
    this._addEventListener(MqttEvent.SUBSCRIBED, MqttEventParam.TOPIC);
    this._addEventListener(MqttEvent.UNSUBSCRIBED, MqttEventParam.TOPIC);
    this._addEventListener(MqttEvent.DISCONNECTED);
    this._addEventListener(
      MqttEvent.MESSAGE_RECEIVED,
      MqttEventParam.TOPIC,
      MqttEventParam.PAYLOAD
    );
    this._addEventListener(
      MqttEvent.MESSAGE_PUBLISHED,
      MqttEventParam.TOPIC,
      MqttEventParam.PAYLOAD
    );
    this._addEventListener(
      MqttEvent.CONNECTION_COMPLETE,
      MqttEventParam.SERVER_URI,
      MqttEventParam.RECONNECT
    );
  }

  private _addEventListener(
    eventType: MqttEvent,
    ...eventParams: MqttEventParam[]
  ): void {
    this._eventEmitter.addListener(eventType, (event) => {
      if (event[MqttEventParam.CLIENT_REF] !== this._clientRef) return;

      if (
        eventType === MqttEvent.MESSAGE_PUBLISHED ||
        eventType === MqttEvent.MESSAGE_RECEIVED
      ) {
        event[MqttEventParam.PAYLOAD] = toByteArray(
          event[MqttEventParam.PAYLOAD]
        );
      }

      this._eventHandler[eventType]?.call(
        this,
        ...eventParams.map((e) => event[e])
      );
    });
  }
}
