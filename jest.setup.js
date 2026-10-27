// Unit tests run the game logic without a device: storage in memory, sounds silent.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('./src/audio/sfx', () => ({
  playJump: jest.fn(), playUnlock: jest.fn(), playExplosion: jest.fn(), playStageComplete: jest.fn(), setMotionSound: jest.fn(),
}));
