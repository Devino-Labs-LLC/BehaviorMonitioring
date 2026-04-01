import { debounce, debounceAsync } from '../../../src/function/debounce';

describe('debounce utilities', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('debounce only invokes the latest call after the wait period', () => {
    const callback = jest.fn();
    const debounced = debounce(callback, 250);

    debounced('first');
    debounced('second');

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(249);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second');
  });

  it('debounceAsync resolves the latest call and cancels the previous one', async () => {
    const callback = jest.fn(async (value: string) => `processed:${value}`);
    const debounced = debounceAsync(callback, 200);

    const firstCall = debounced('first');
    const secondCall = debounced('second');

    jest.advanceTimersByTime(200);

    await expect(firstCall).rejects.toThrow('Debounced call cancelled');
    await expect(secondCall).resolves.toBe('processed:second');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second');
  });

  it('debounceAsync rejects when the wrapped function throws', async () => {
    const error = new Error('boom');
    const callback = jest.fn(async () => {
      throw error;
    });
    const debounced = debounceAsync(callback, 100);

    const promise = debounced();
    jest.advanceTimersByTime(100);

    await expect(promise).rejects.toBe(error);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
