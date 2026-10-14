export interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}
export interface PushRegistration {
  installationId: string | null;
  enabled: boolean;
}
export type PushDeviceState =
  | 'loading'
  | 'unsupported'
  | 'unconfigured'
  | 'denied'
  | 'off'
  | 'on'
  | 'busy'
  | 'error';
export interface PushDeviceView {
  state: PushDeviceState;
  error: string;
  onEnable: () => void;
  onDisable: () => void;
  onRetry: () => void;
}
