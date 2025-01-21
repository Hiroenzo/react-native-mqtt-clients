import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { Spec } from './NativeMqttClients';

const LINKING_ERROR =
  `The package 'react-native-mqtt-clients' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// @ts-expect-error
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const Module = isTurboModuleEnabled
  ? require('./NativeMqttClients').default
  : NativeModules.Mqtt;

const NativeMqttClientsModule = Module
  ? Module
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export const MqttEventEmitter = () => new NativeEventEmitter(Module);

export default NativeMqttClientsModule as Spec;
