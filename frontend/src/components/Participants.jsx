import './Participants.css';

function Participant({ imgSrc, name, heart }) {
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

export const Participants = () => {
  const firstRow = [
    { imgSrc: '/img/marvey.jpg', name: 'Host', heart: '❤️❤️❤️❤️' },
    { imgSrc: '/img/target.jpg', name: 'Clarissa', heart: '❤️❤️❤️❤️' },
  ];

  const secondRow = [
    { imgSrc: '/img/brad.jpg', name: 'AI 1', heart: '❤️❤️❤️❤️' },
    { imgSrc: '/img/chad.jpg', name: 'AI 2', heart: '❤️❤️❤️❤️' },
    { imgSrc: '/img/jacques.jpg', name: 'You', heart: '❤️❤️❤️❤️' },
  ];

  return (
    <div className="participants-container">
      <div className="logo">
          <img src="/img/logo.png" alt="Rizztral 2.0 Logo" />
      </div>
      <div className="container2">
        <div className="row">
          {firstRow.map((participant, index) => (
            <Participant
              key={`row1-${index}`}
              imgSrc={participant.imgSrc}
              name={participant.name}
              heart={participant.heart}
            />
          ))}
        </div>
        <div className="row">
          {secondRow.map((participant, index) => (
            <Participant
              key={`row2-${index}`}
              imgSrc={participant.imgSrc}
              name={participant.name}
              heart={participant.heart}
            />
          ))}
        </div>
      </div>
    </div>
  );
};