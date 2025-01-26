import { useRTVIClient, useRTVIClientTransportState } from 'realtime-ai-react';

export function Speaker() {
  const client = useRTVIClient();
  const transportState = useRTVIClientTransportState();
  const isConnected = ['connected', 'ready'].includes(transportState);

  const handleMicClick = async () => {
    if (!client) {
      console.error('RTVI client is not initialized');
      return;
    }

    try {
      if (isConnected) {
        await client.disconnect();
        console.log('Disconnected via mic button');
      } else {
        await client.connect();
        console.log('Connected via mic button');
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  return (
    <div className="speaker-container">
      <img
        className="volume"
        src="pipecat-demo/react/src/img/volume.svg"
        alt="Volume Icon"
      />
      <img
        className={`mic ${isConnected ? 'connected' : 'disconnected'}`}
        src="pipecat-demo/react/src/img/mic.svg"
        alt="Mic Icon"
        onClick={handleMicClick}
        style={{ cursor: 'pointer' }} // Makes the mic icon clickable
      />
    </div>
  );
}

export default Speaker;