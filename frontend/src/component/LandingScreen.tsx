import {ConnectButton} from './ConnectButton.tsx';
const LandingScreen = () => {
  return (
    <div className="landing-container">
      <div className="logo">
      <img src="/img/landingpage.png" alt="RIZZTRAL" className="logo-image" />
      </div>
      <div className="connect-wrapper">
        <ConnectButton />
      </div>
    </div>
  );
};

export default LandingScreen;
