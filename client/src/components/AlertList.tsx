import React from 'react';
import styles from '../styles/AlertList.module.scss';
import type { DashboardAlert } from './dashboardData';

type AlertListProps = {
  readonly alerts: DashboardAlert[];
};

const AlertList: React.FC<AlertListProps> = ({ alerts }) => {
  if (!alerts.length) {
    return <div className={styles.empty}>No alerts — data looks stable.</div>;
  }

  return (
    <div className={styles.list}>
      {alerts.map((a) => {
        let levelClass = styles.low;
        if (a.level === 'high') {
          levelClass = styles.high;
        } else if (a.level === 'med') {
          levelClass = styles.med;
        }

        return (
          <div key={a.id} className={`${styles.item} ${levelClass}`}>
            <div className={styles.itemTitle}>{a.title}</div>
            <div className={styles.itemSub}>{a.detail}</div>
          </div>
        );
      })}
    </div>
  );
};

export default AlertList;
