// Web entry (npx expo start --web): regular DOM canvas.
import { Asset } from 'expo-asset';

export * from '@react-three/fiber';

export const textureSource = (mod: number | string): string =>
  typeof mod === 'string' ? mod : Asset.fromModule(mod).uri;
