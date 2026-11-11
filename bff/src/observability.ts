/**
 * مقاييس بسيطة بصيغة Prometheus — في الذاكرة لكل نسخة من الخدمة.
 * تُستخدم لمراقبة الطلبات والأخطاء والزمن، وتُقرأ من /metrics.
 */
type RouteMetric = {
  count: number;
  durationMs: number;
  errors: number;
};

const startedAt = Date.now();
const routes = new Map<string, RouteMetric>();

function label(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function recordRequest(input: {
  method: string;
  route: string;
  status: number;
  durationMs: number;
}): void {
  const key = `${input.method}|${input.route}|${input.status}`;
  const current = routes.get(key) ?? { count: 0, durationMs: 0, errors: 0 };
  current.count += 1;
  current.durationMs += input.durationMs;
  if (input.status >= 500) current.errors += 1;
  routes.set(key, current);
}

export function metricsText(): string {
  const lines: string[] = [
    '# HELP sharik_bff_uptime_seconds مدة تشغيل خدمة BFF بالثواني.',
    '# TYPE sharik_bff_uptime_seconds gauge',
    `sharik_bff_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
    '# HELP sharik_bff_requests_total عدد الطلبات حسب المسار والحالة.',
    '# TYPE sharik_bff_requests_total counter',
  ];

  for (const [key, metric] of routes.entries()) {
    const [method, route, status] = key.split('|');
    lines.push(
      `sharik_bff_requests_total{method="${label(method)}",route="${label(route)}",status="${label(status)}"} ${metric.count}`,
    );
  }

  lines.push(
    '# HELP sharik_bff_request_duration_ms_sum مجموع زمن الطلبات بالمللي ثانية.',
    '# TYPE sharik_bff_request_duration_ms_sum counter',
  );
  for (const [key, metric] of routes.entries()) {
    const [method, route, status] = key.split('|');
    lines.push(
      `sharik_bff_request_duration_ms_sum{method="${label(method)}",route="${label(route)}",status="${label(status)}"} ${Math.round(metric.durationMs)}`,
    );
  }

  lines.push(
    '# HELP sharik_bff_request_duration_ms_count عدد قياسات الزمن.',
    '# TYPE sharik_bff_request_duration_ms_count counter',
  );
  for (const [key, metric] of routes.entries()) {
    const [method, route, status] = key.split('|');
    lines.push(
      `sharik_bff_request_duration_ms_count{method="${label(method)}",route="${label(route)}",status="${label(status)}"} ${metric.count}`,
    );
  }

  lines.push(
    '# HELP sharik_bff_errors_total عدد أخطاء الخادم 5xx.',
    '# TYPE sharik_bff_errors_total counter',
    `sharik_bff_errors_total ${Array.from(routes.values()).reduce((sum, metric) => sum + metric.errors, 0)}`,
  );

  return `${lines.join('\n')}\n`;
}
