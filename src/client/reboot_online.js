export function createRebootOnlineClient({ url, onState, onResult, onError } = {}) {
  let socket = null;
  return {
    connect() {
      socket = new WebSocket(url ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'join', name: '플레이어' }));
      });
      socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'state') onState?.(message.state, message);
        if (message.type === 'action_result') onResult?.(message.result, message);
        if (message.type === 'error') onError?.(message.reason);
      });
      socket.addEventListener('error', () => onError?.('연결 오류'));
    },
    send(action) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(action));
    },
    close() {
      socket?.close();
    }
  };
}
