import React from 'react';
import styles from '../styles/KpiCard.module.scss';

export default function KpiCard(props: { title: string; value: string; sub?: string }) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{props.title}</div>
      <div className={styles.value}>{props.value}</div>
      {props.sub ? <div className={styles.sub}>{props.sub}</div> : <div className={styles.sub}>&nbsp;</div>}
    </div>
  );
}