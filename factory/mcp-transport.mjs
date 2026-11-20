import { once } from 'node:events';

const frameLimit = 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const parseError = { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } };

export async function* readMcpFrames(input) {
  let storage;
  let used = 0;
  for await (const chunk of input) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    let offset = 0;
    while (offset < bytes.length) {
      const end = bytes.indexOf(10, offset);
      const piece = bytes.subarray(offset, end === -1 ? bytes.length : end);
      if (used + piece.length > frameLimit) throw Error('MCP input limit exceeded');
      if (end === -1 || used) {
        storage ??= Buffer.allocUnsafe(frameLimit);
        piece.copy(storage, used);
        used += piece.length;
      }
      if (end === -1) break;
      const frame = used ? storage.subarray(0, used) : piece;
      used = 0;
      offset = end + 1;
      let message;
      try {
        const line = decoder.decode(frame);
        if (!line.trim()) continue;
        message = JSON.parse(line);
      } catch {
        yield { error: parseError };
        continue;
      }
      yield { message };
    }
  }
  if (used) throw Error('Incomplete MCP message');
}

export async function writeMcpFrame(output, value) {
  if (!value) return;
  if (output.destroyed || output.writableEnded) throw Error('MCP output is closed');
  if (output.write(JSON.stringify(value) + '\n')) return;
  const abort = new AbortController();
  try {
    await Promise.race([
      once(output, 'drain', { signal: abort.signal }),
      once(output, 'close', { signal: abort.signal }).then(() => { throw Error('MCP output is closed'); }),
    ]);
  } finally {
    abort.abort();
  }
}
