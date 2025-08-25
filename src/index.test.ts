import { config } from './config';

test('config prefix is !', () => {
  expect(config.prefix).toBe('!');
});