import { Test } from '@nestjs/testing';
import { ResilienceService } from './resilience.service';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('ResilienceService', () => {
  let service: ResilienceService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ResilienceService],
    }).compile();
    service = moduleRef.get(ResilienceService);
  });

  describe('withRetry', () => {
    it('retorna el resultado al primer intento', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      await expect(service.withRetry(fn, { attempts: 3 })).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('reintenta y finalmente lanza el último error', async () => {
      const error = new Error('boom');
      const fn = jest.fn().mockRejectedValue(error);
      await expect(service.withRetry(fn, { attempts: 3 })).rejects.toBe(error);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('se recupera tras un fallo transitorio', async () => {
      let calls = 0;
      const fn = jest.fn().mockImplementation(() => {
        calls += 1;
        if (calls === 1) throw new Error('transitorio');
        return Promise.resolve('recuperado');
      });
      await expect(service.withRetry(fn, { attempts: 3 })).resolves.toBe(
        'recuperado',
      );
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('createBreaker', () => {
    it('abre el circuito tras el umbral de fallos consecutivos', async () => {
      const breaker = service.createBreaker('sunat', {
        failureThreshold: 2,
        resetTimeoutMs: 60_000,
      });
      const failing = jest.fn().mockRejectedValue(new Error('down'));

      await expect(breaker.call(failing)).rejects.toThrow('down');
      await expect(breaker.call(failing)).rejects.toThrow('down');
      await expect(breaker.call(failing)).rejects.toThrow(
        'no disponible temporalmente',
      );
      expect(failing).toHaveBeenCalledTimes(2);
    });

    it('resetea el contador con un éxito', async () => {
      const breaker = service.createBreaker('cavali', {
        failureThreshold: 2,
        resetTimeoutMs: 60_000,
      });
      const flaky = jest
        .fn()
        .mockRejectedValueOnce(new Error('x'))
        .mockResolvedValueOnce('ok')
        .mockRejectedValueOnce(new Error('y'))
        .mockResolvedValue('ok');

      await expect(breaker.call(flaky)).rejects.toThrow('x');
      await expect(breaker.call(flaky)).resolves.toBe('ok');
      await expect(breaker.call(flaky)).rejects.toThrow('y');
      await expect(breaker.call(flaky)).resolves.toBe('ok');
    });

    it('pasa a half-open y se cierra cuando el servicio responde', async () => {
      const breaker = service.createBreaker('sunat', {
        failureThreshold: 1,
        resetTimeoutMs: 30,
      });
      const down = jest.fn().mockRejectedValue(new Error('down'));

      await expect(breaker.call(down)).rejects.toThrow('down');
      await expect(breaker.call(down)).rejects.toThrow(
        'no disponible temporalmente',
      );

      await delay(40);

      const up = jest.fn().mockResolvedValue('up');
      await expect(breaker.call(up)).resolves.toBe('up');
      await expect(breaker.call(up)).resolves.toBe('up');
    });
  });
});
