import './Participants.css';

function Participant({ imgSrc, name, heart, isActive }) {
  return (
    <div className={`participant ${isActive ? 'active-participant' : ''}`}>
      <div className="participant-img">
        <img src={imgSrc} alt={`${name}'s avatar`} />
      </div>
      <div className="participant-name">{name}</div>
      <div className="participant-heart">{heart}</div>
    </div>
  );
}

export const Participants = ({ gameState }) => {
  const firstRow = [
    { imgSrc: '/img/marvey.jpg', name: 'Host (AI)', heart: '🎤' },
    { imgSrc: '/img/target.jpg', name: 'Clarissa (AI)', heart: '❤️❤️❤️❤️' },
  ];

  const secondRow = [
    { imgSrc: '/img/brad.jpg', name: 'AI 1', heart: '🤖' },
    { imgSrc: '/img/chad.jpg', name: 'AI 2', heart: '🤖' },
    { imgSrc: '/img/jacques.jpg', name: 'You', heart: '😅' },
  ];

  const hostActiveStages = ['host_intro', 'winner_announcement'];
  const clarissaActiveStages = ['ai_intro', 'round_start', 'question_submission'];

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
              isActive={
                (participant.name === 'Host (AI)' && hostActiveStages.includes(gameState?.stage)) ||
                (participant.name === 'Clarissa (AI)' && clarissaActiveStages.includes(gameState?.stage))
              }
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
              isActive={participant.name === 'You' && gameState?.waitingForUserResponse}
            />
          ))}
        </div>
      </div>
    </div>
  );
};