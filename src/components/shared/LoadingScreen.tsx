import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <DotLottieReact
          src="/animations/animation.lottie"
          loop
          autoplay
          style={{ width: 200, height: 200 }}
        />
        <p style={styles.message}>{message}</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position:       'fixed',
    inset:          0,
    background:     'rgba(10, 14, 30, 0.93)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         9999,
    backdropFilter: 'blur(6px)',
  },
  box: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            '8px',
  },
  message: {
    color:      '#a0aec0',
    fontSize:   '15px',
    fontWeight: 500,
    margin:     0,
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.3px',
  },
};