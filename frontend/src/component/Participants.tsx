import './Participants.css';

// Define type for the props 
interface ParticipantProps {
  imgSrc: string;
  name: string;
  heart: string;
}

function Participant({ imgSrc, name, heart }: ParticipantProps) {
  return (
    <div className="participant">
      <div className="participant-img">
        <img src={imgSrc} alt={`${name}'s avatar`} />
      </div>
      <div className="participant-name">{name}</div>
      <div className="participant-heart">{heart}</div>
    </div>
  );
}

const Participants = () => {
  const participants = [
    { imgSrc: './src/img/target.jpeg', name: 'Participant 1', heart: '❤️❤️❤️❤️' },
    { imgSrc: './src/img/target.jpeg', name: 'Participant 2', heart: '❤️❤️❤️❤️' },
    { imgSrc: './src/img/target.jpeg', name: 'Participant 3', heart: '❤️❤️❤️❤️' },
  ];

  return (
    <div className="participants-container">
        <div className="rizzler">Rizztral 2.0</div>
        <div className='container2'>
            {participants.map((participant, index) => (
                <Participant
                key={index}
                imgSrc={participant.imgSrc}
                name={participant.name}
                heart={participant.heart}
                />
            ))}
        </div>
    </div>
  );
};

export default Participants;

