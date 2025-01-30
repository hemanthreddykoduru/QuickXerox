import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function OTPVerification() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleOTPSubmit = () => {
    // Simulate the OTP validation and proceed to Customer Dashboard
    if (otp.length === 6) {
      // Simulate OTP validation logic
      navigate('/customerdashboard'); // Redirect to Customer Dashboard
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  return (
    <div className="otp-verification-container">
      <h2>Enter OTP</h2>
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter 6-digit OTP"
        maxLength={6}
      />
      {error && <p className="error-message">{error}</p>}
      <button onClick={handleOTPSubmit}>Submit</button>
    </div>
  );
}

export default OTPVerification;
