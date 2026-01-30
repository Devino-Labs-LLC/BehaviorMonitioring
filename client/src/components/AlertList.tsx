    import React from 'react';
import styles from '../styles/AlertList.module.scss';
import type { DashboardAlert } from './dashboardData';

export default function AlertList({ alerts }: { alerts: DashboardAlert[] }) {
  if (!alerts.length) {
    return <div className={styles.empty}>No alerts — data looks stable.</div>;
  }

  return (
    <div className={styles.list}>
      {alerts.map((a) => (
        <div key={a.id} className={`${styles.item} ${a.level === 'high' ? styles.high : a.level === 'med' ? styles.med : styles.low}`}>
          <div className={styles.itemTitle}>{a.title}</div>
          <div className={styles.itemSub}>{a.detail}</div>
        </div>
      ))}
    </div>
  );
}