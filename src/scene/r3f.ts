// Native entry: React Three Fiber on expo-gl.
export * from '@react-three/fiber/native';

/** On native the loader polyfill understands require() asset ids directly. */
export const textureSource = (mod: number | string): string => mod as unknown as string;
