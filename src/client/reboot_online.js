function isProtocolObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isRebootStatePayload(value) {
  return isProtocolObject(value)
    && typeof value.runId === 'string'
    && Array.isArray(value.players)
    && isProtocolObject(value.boards)
    && isProtocolObject(value.boards.p1)
    && isProtocolObject(value.boards.p2)
    && isProtocolObject(value.resources)
    && isProtocolObject(value.resources.p1)
    && isProtocolObject(value.resources.p2)
    && isProtocolObject(value.actionState)
    && isProtocolObject(value.actionState.p1)
    && isProtocolObject(value.actionState.p2);
}

export function createRebootOnlineClient({ url, name = '플레이어', profile, onState, onResult, onError, onStatus } = {}) {
  let socket = null;
  return {
    connect() {
      onStatus?.({ state: 'connecting' });
      socket = new WebSocket(url ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      socket.addEventListener('open', () => {
        onStatus?.({ state: 'open' });
        socket.send(JSON.stringify({ type: 'join', name, profile }));
      });
      socket.addEventListener('message', (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          onError?.('온라인 메시지 오류');
          return;
        }
        if (!isProtocolObject(message) || typeof message.type !== 'string') {
          onError?.('온라인 메시지 오류');
          return;
        }
        if (message.type === 'state') {
          if (!isRebootStatePayload(message.state)) {
            onError?.('온라인 메시지 오류');
            return;
          }
          onState?.(message.state, message);
        }
        if (message.type === 'action_result') onResult?.(message.result, message);
        if (message.type === 'error') onError?.(message.reason);
      });
      socket.addEventListener('error', () => onError?.('연결 오류'));
      socket.addEventListener('close', () => {
        onStatus?.({ state: 'closed' });
      });
    },
    send(action) {
      if (socket?.readyState !== WebSocket.OPEN) {
        onError?.('온라인 연결 대기 중');
        return false;
      }
      socket.send(JSON.stringify(action));
      return true;
    },
    close() {
      socket?.close();
      socket = null;
    }
  };
}
