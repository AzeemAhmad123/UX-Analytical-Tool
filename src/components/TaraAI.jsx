import React from 'react';
import styles from './TaraAI.module.css';

const TaraAI = () => {
  return (
    <div className={styles.sectionWrapper}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <div className={styles.badge}>
              <span className={styles.comingSoon}>Coming soon</span>
              <span className={styles.subtitle}>YOUR AI ANALYST</span>
            </div>
            <h1 className={styles.heading}>
              Introducing <span className={styles.highlight}>Tara AI</span>
            </h1>
            <button className={styles.learnMoreBtn}>Learn More</button>
          </div>
          <div className={styles.imageContent}>
            <img 
              src="/images/tara-comming-soon.png" 
              alt="Tara AI - Your AI Analyst" 
              className={styles.taraImage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaraAI;
