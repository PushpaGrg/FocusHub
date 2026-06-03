export function getStudyBuddyPeerOptions() {
  return {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    debug: 2,
    config: {
      iceTransportPolicy: 'all',
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:turn.cloudflare.com:3478',
          username: 'anonymous',
          credential: 'anonymous',
        },
        {
          urls: 'turns:turn.cloudflare.com:5349',
          username: 'anonymous',
          credential: 'anonymous',
        },
      ],
    },
  };
}