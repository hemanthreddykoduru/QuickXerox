import { useState, useEffect, useCallback } from 'react';
import { OTP_CONFIG } from '../config/constants';

export const useOTPTimer = () => {
  const [timer, setTimer] = useState(OTP_CONFIG.RESEND_DELAY);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const startTimer = useCallback(() => {
    setTimer(OTP_CONFIG.RESEND_DELAY);
  }, []);

  return {
    timer,
    startTimer,
    canResend: timer === 0
  };
};