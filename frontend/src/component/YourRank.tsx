
function YourRank({ name }: { name: string }) {
  // Hardcoding 5 hearts for now
  const hearts = Array(4).fill('/img/big-heart.png'); // Array of heart image paths

  return (
    <div className="rank-container">
      <div className="yourname">Player score:</div>
      <div className="hearts">
        {hearts.map((heart, index) => (
          <img key={index} className="yourheart" src={heart} alt="heart" />
        ))}
      </div>
    </div>
  );
}

export default YourRank;