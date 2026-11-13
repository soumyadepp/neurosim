import { evaluate, sweepCoupling, type EvaluateResult, type ModelSpec, type SweepResult } from './experiment';

export type WholeBrainRequest =
  | { kind: 'evaluate'; spec: ModelSpec; empirical: number[] }
  | { kind: 'sweep'; spec: ModelSpec; empirical: number[]; couplings: number[] };

export type WholeBrainResponse =
  | { kind: 'evaluate'; result: EvaluateResult }
  | { kind: 'sweep'; result: SweepResult };

/**
 * The single place requests are executed, shared by the worker and the inline client.
 */
export function handleRequest(req: WholeBrainRequest): WholeBrainResponse {
  if (req.kind === 'evaluate') return { kind: 'evaluate', result: evaluate(req.spec, req.empirical) };
  return { kind: 'sweep', result: sweepCoupling(req.spec, req.empirical, req.couplings) };
}

export interface WholeBrainClient {
  evaluate(spec: ModelSpec, empirical: number[]): Promise<EvaluateResult>;
  sweep(spec: ModelSpec, empirical: number[], couplings: number[]): Promise<SweepResult>;
  dispose(): void;
}

/**
 * Runs on the calling thread. Used in tests and as a fallback where workers are unavailable.
 */
export class InlineWholeBrainClient implements WholeBrainClient {
  async evaluate(spec: ModelSpec, empirical: number[]): Promise<EvaluateResult> {
    return evaluate(spec, empirical);
  }

  async sweep(spec: ModelSpec, empirical: number[], couplings: number[]): Promise<SweepResult> {
    return sweepCoupling(spec, empirical, couplings);
  }

  dispose(): void {}
}

interface Envelope<T> {
  id: number;
  payload: T;
  error?: string;
}

/**
 * Adapts a dedicated worker to the promise-based client interface, matching replies by request id.
 */
export class WorkerWholeBrainClient implements WholeBrainClient {
  private nextId = 0;
  private readonly pending = new Map<number, { resolve: (r: WholeBrainResponse) => void; reject: (e: Error) => void }>();

  constructor(private readonly worker: Worker) {
    worker.onmessage = (e: MessageEvent<Envelope<WholeBrainResponse>>) => {
      const entry = this.pending.get(e.data.id);
      if (!entry) return;
      this.pending.delete(e.data.id);
      if (e.data.error) entry.reject(new Error(e.data.error));
      else entry.resolve(e.data.payload);
    };
  }

  private send(req: WholeBrainRequest): Promise<WholeBrainResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, payload: req } satisfies Envelope<WholeBrainRequest>);
    });
  }

  async evaluate(spec: ModelSpec, empirical: number[]): Promise<EvaluateResult> {
    const res = await this.send({ kind: 'evaluate', spec, empirical });
    if (res.kind !== 'evaluate') throw new Error('Unexpected response');
    return res.result;
  }

  async sweep(spec: ModelSpec, empirical: number[], couplings: number[]): Promise<SweepResult> {
    const res = await this.send({ kind: 'sweep', spec, empirical, couplings });
    if (res.kind !== 'sweep') throw new Error('Unexpected response');
    return res.result;
  }

  dispose(): void {
    this.worker.terminate();
    for (const { reject } of this.pending.values()) reject(new Error('Client disposed'));
    this.pending.clear();
  }
}
