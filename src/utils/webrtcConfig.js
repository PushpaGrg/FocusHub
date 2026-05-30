/**
 * WebRTC Configuration Module
 * Centralizes ICE server and PeerJS configuration for reliable peer connections
 * across restrictive networks (classrooms, corporate firewalls, etc.)
 */

// PeerJS Server Configuration
const DEFAULT_PEER_HOST = '0.peerjs.com';
const DEFAULT_PEER_PORT = 443;
const DEFAULT_PEER_PATH = '/';

// ICE Transport Policy - determines which candidates are used
// "all" = try direct + relay; "relay" = only TURN servers (restrictive networks)
const DEFAULT_ICE_TRANSPORT_POLICY = 'all';

/**
 * Default ICE Servers (STUN + TURN)
 * STUN: Discovers public IP for direct connections
 * TURN: Relays traffic through servers (fallback for restrictive networks)
 * 
 * Priority: Multiple STUN servers first, then TURN (TCP/TLS preferred for firewalls)
 */
const DEFAULT_ICE_SERVERS = [
  // Primary STUN servers for NAT traversal (discovery only, no relay)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  
  // Primary TURN servers (openrelay.metered.ca) - free, reliable
  // Supports UDP, TCP, and TLS (port 443 for firewalls)
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turns:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  
  // Backup TURN servers for redundancy
  { urls: 'turn:numb.viagenie.ca:3478', username: 'webrtc@live.com', credential: 'muazkh' },
  { urls: 'turn:numb.viagenie.ca:3478?transport=tcp', username: 'webrtc@live.com', credential: 'muazkh' },
  { urls: 'turn:turn.beyondco.de:443?transport=tcp', username: 'homeo', credential: 'homeo' },
  { urls: 'turns:turn.beyondco.de:443', username: 'homeo', credential: 'homeo' },
];

/**
 * Converts string values to boolean
 * Handles environment variable parsing (e.g., "true", "1", "yes")
 */
function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

/**
 * Validates and normalizes ICE server configuration
 * Ensures consistent structure: { urls, username?, credential? }
 */
function normalizeIceServer(server) {
  if (!server || typeof server !== 'object') return null;

  const urls = server.urls || server.url;
  if (!urls) return null;

  return {
    urls,
    ...(server.username && { username: server.username }),
    ...(server.credential && { credential: server.credential }),
  };
}

/**
 * Parses custom ICE servers from JSON environment variable
 * Allows runtime override of default ICE servers
 */
function parseIceServers(rawValue) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeIceServer).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Builds complete ICE server list with environment overrides
 * Priority: env JSON > env TURN URLs > defaults
 */
function buildIceServers() {
  // Check for custom ICE servers via environment
  const fromJson = parseIceServers(import.meta.env.VITE_WEBRTC_ICE_SERVERS_JSON);
  if (fromJson.length > 0) return fromJson;

  // Check for custom TURN server configuration
  const turnUrls = import.meta.env.VITE_WEBRTC_TURN_URLS;
  const turnUsername = import.meta.env.VITE_WEBRTC_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL;

  const customTurn = turnUrls
    ? turnUrls
        .split(',')
        .map(url => url.trim())
        .filter(Boolean)
        .map(urls => ({
          urls,
          ...(turnUsername && { username: turnUsername }),
          ...(turnCredential && { credential: turnCredential }),
        }))
    : [];

  // Return defaults + custom TURN servers (if any)
  return [...DEFAULT_ICE_SERVERS, ...customTurn];
}

/**
 * Generates PeerJS configuration for StudyBuddy room connections
 * Handles restrictive networks by prioritizing TURN relay when needed
 * 
 * @returns {Object} PeerJS options object
 * @example
 * const peer = new Peer(getStudyBuddyPeerOptions());
 */
export function getStudyBuddyPeerOptions() {
  // Read configuration from environment or use defaults
  const peerHost = import.meta.env.VITE_PEER_HOST || DEFAULT_PEER_HOST;
  const peerPort = Number(import.meta.env.VITE_PEER_PORT || DEFAULT_PEER_PORT);
  const peerPath = import.meta.env.VITE_PEER_PATH || DEFAULT_PEER_PATH;
  const peerSecure = toBoolean(import.meta.env.VITE_PEER_SECURE, true);
  const iceTransportPolicy = import.meta.env.VITE_WEBRTC_ICE_TRANSPORT_POLICY || DEFAULT_ICE_TRANSPORT_POLICY;

  return {
    host: peerHost,
    port: Number.isFinite(peerPort) ? peerPort : DEFAULT_PEER_PORT,
    path: peerPath,
    secure: peerSecure,
    config: {
      iceServers: buildIceServers(),
      iceTransportPolicy,
      bundlePolicy: 'max-bundle', // Combine audio/video in single transport
      rtcpMuxPolicy: 'require', // Use multiplexed RTCP
    },
  };
}
