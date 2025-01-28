import './Participants.css';
import { participantData } from './participantData';

interface ParticipantProps {
  imgSrc: string;
  name: string;
  heart: string;
  isTarget?: boolean;
  isHost?: boolean;
  isSpeaking?: boolean;
}

function Participant({ imgSrc, name, heart, isTarget, isHost, isSpeaking }: ParticipantProps) {
  const classNames = [
    'participant',
    isTarget ? 'target-participant' : '',
    isHost ? 'host-participant' : '',
    isSpeaking ? 'speaking-participant' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <div className="participant-img">
        <img src={imgSrc} alt={`${name}'s avatar`} />
      </div>
      <div className="participant-name">{name}</div>
      <div className="participant-heart">{heart}</div>
    </div>
  );
}

const Participants = ({ currentSpeaker }: { currentSpeaker: number }) => {
  const { host: hostParticipant, target: targetParticipant, participants } = participantData;

  return (
    <div className="participants-container">
      <div className='participants-layout'>
        <div className="top-row">
          <div className="target-container">
            <Participant
              {...targetParticipant}
              isTarget={true}
              isSpeaking={currentSpeaker === 0}
            />
          </div>
          <div className="host-container">
            <Participant
              {...hostParticipant}
              isHost={true}
              isSpeaking={currentSpeaker === -1}
            />
          </div>
        </div>
        <div className='bottom-row'>
          {participants.map((participant, index) => (
            <Participant
              key={index}
              imgSrc={participant.imgSrc}
              name={participant.name}
              heart={participant.heart}
              isSpeaking={currentSpeaker === index + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Participants;