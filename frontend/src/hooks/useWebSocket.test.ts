import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWebSocket } from "./useWebSocket";

// WebSocket falso: guarda as instâncias criadas e deixa o teste disparar os eventos.
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
    this.onclose?.();
  }

  // Helpers só dos testes
  open() {
    this.onopen?.();
  }
  drop() {
    this.onclose?.();
  }
  receive(data: string) {
    this.onmessage?.({ data });
  }
}

const URL = "ws://exemplo.test/ws/notifications?token=abc";

function setup(extra: { onReconnect?: () => void } = {}) {
  const onMessage = vi.fn();
  const view = renderHook(() => useWebSocket(URL, { onMessage, onReconnect: extra.onReconnect }));
  return { onMessage, ...view };
}

describe("useWebSocket", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0); // sem jitter, para tempos determinísticos
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("conecta na URL informada e fica 'open' ao abrir", () => {
    const { result } = setup();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe(URL);
    expect(result.current).toBe("connecting");

    act(() => FakeWebSocket.instances[0].open());
    expect(result.current).toBe("open");
  });

  it("entrega mensagens JSON e ignora frames que não são JSON", () => {
    const { onMessage } = setup();
    const ws = FakeWebSocket.instances[0];
    act(() => ws.open());

    act(() => ws.receive(JSON.stringify({ event: "notification.new", data: { id: "n1" } })));
    act(() => ws.receive("ping")); // não-JSON: ignorado sem quebrar

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({ event: "notification.new", data: { id: "n1" } });
  });

  it("chama onReconnect a cada conexão aberta (para recuperar o que foi perdido via REST)", () => {
    const onReconnect = vi.fn();
    setup({ onReconnect });

    act(() => FakeWebSocket.instances[0].open());
    expect(onReconnect).toHaveBeenCalledTimes(1);

    act(() => FakeWebSocket.instances[0].drop());
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => FakeWebSocket.instances[1].open());
    expect(onReconnect).toHaveBeenCalledTimes(2);
  });

  it("reconecta depois de uma queda", () => {
    const { result } = setup();
    act(() => FakeWebSocket.instances[0].open());

    act(() => FakeWebSocket.instances[0].drop());
    expect(result.current).toBe("closed");
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("aumenta o intervalo a cada falha seguida (backoff exponencial)", () => {
    setup();
    // 1ª queda: espera 500 * 2^1 = 1000 ms
    act(() => FakeWebSocket.instances[0].drop());
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);

    // 2ª queda sem ter aberto: espera 500 * 2^2 = 2000 ms
    act(() => FakeWebSocket.instances[1].drop());
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("zera o backoff depois de uma conexão bem-sucedida", () => {
    setup();
    act(() => FakeWebSocket.instances[0].drop());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => FakeWebSocket.instances[1].drop());
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => FakeWebSocket.instances[2].open()); // conectou: contador volta a zero

    act(() => FakeWebSocket.instances[2].drop());
    act(() => {
      vi.advanceTimersByTime(1000); // volta a ser o intervalo inicial
    });
    expect(FakeWebSocket.instances).toHaveLength(4);
  });

  it("não reconecta depois de desmontar o componente", () => {
    const { unmount } = setup();
    act(() => FakeWebSocket.instances[0].open());

    unmount();
    expect(FakeWebSocket.instances[0].closed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("não conecta quando a URL é nula", () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket(null, { onMessage }));
    expect(FakeWebSocket.instances).toHaveLength(0);
  });
});
