import React, { useState, useEffect } from 'react';
import './TextBox.css';


function TextBox() {
  const [dialogueText, setDialogueText] = useState('');

  // Placeholder for backend text
  useEffect(() => {
    const placeholderText = "This is a sample dialogue text from the backend.";
    setDialogueText(placeholderText);
  }, []);

  return (
    <div className='text'>
      <div className='dialogue-box'>
        {dialogueText}
      </div>
    </div>
  );
}

export default TextBox;