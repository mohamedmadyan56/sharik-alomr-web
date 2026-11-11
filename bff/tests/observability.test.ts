import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { metricsText, recordRequest } from '../src/observability';

describe('metricsText', () => {
  it('exports Prometheus gauges and counters', () => {
    recordRequest({ method: 'GET', route: '/health', status: 200, durationMs: 12 });
    recordRequest({ method: 'GET', route: '/health', status: 500, durationMs: 40 });

    const output = metricsText();
    assert.match(output, /# TYPE sharik_bff_uptime_seconds gauge/);
    assert.match(output, /sharik_bff_uptime_seconds \d+/);
    assert.match(output, /# TYPE sharik_bff_requests_total counter/);
    assert.match(output, /sharik_bff_requests_total\{[^}]*route="\/health"[^}]*status="200"[^}]*\} 1/);
    assert.match(output, /# TYPE sharik_bff_errors_total counter/);
  });
});
