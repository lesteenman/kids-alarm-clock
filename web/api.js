// The phone page's only way to talk to the clock.
// On the ESP32 it's a normal fetch(); inside the simulator it calls the
// WASM core directly. Use it for every API call:
//   const res = await api('GET', '/api/state');
//   if (res.status === 200) { const state = JSON.parse(res.body); ... }
export async function api(method, path, body = '') {
  const sim = simulator();
  if (sim) return sim.request(method, path, body);
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body || undefined,
  });
  return { status: res.status, contentType: res.headers.get('Content-Type') || '', body: await res.text() };
}

function simulator() {
  try {
    return window.parent !== window ? window.parent.clockSim : undefined;
  } catch {
    return undefined; // parent on another origin: not the simulator
  }
}
