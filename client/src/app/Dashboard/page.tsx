'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Header from '../../components/header';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Dashboard.module.scss';
import KpiCard from '../../components/KpiCard';
import AlertList from '../../components/AlertList';
import {
    buildDashboardView,
    type BehaviorEntry,
    type DateRangeKey,
    RANGE_OPTIONS,
} from '../../components/dashboardData';
import { GetLoggedInUserStatus, GetLoggedInUser } from '../../function/VerificationCheck';
import { api } from '../../lib/Api';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    BarChart,
    Bar,
} from 'recharts';
import type { Client } from '../../dto/common/entities/Client';
import type { GetAllClientsResponse } from '../../dto/modules/client/GetAllClientsResponse';

function isoDateOnly(d: Date) {
    return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}

function getRangeDates(range: DateRangeKey) {
    const end = new Date(); // today
    const start = new Date();
    if (range === '7d') start.setDate(start.getDate() - 6);
    if (range === '30d') start.setDate(start.getDate() - 29);
    if (range === '90d') start.setDate(start.getDate() - 89);
    return { start: isoDateOnly(start), end: isoDateOnly(end) };
}

export default function DashboardClient() {
    const navigate = useRouter();
    const userLoggedIn = GetLoggedInUserStatus();
    const loggedInUser = GetLoggedInUser();
    const [clients, setClients] = useState<Client[]>([]);
    const [clientID, setClientID] = useState<string>('');
    const [range, setRange] = useState<DateRangeKey>('30d');
    const [entries, setEntries] = useState<BehaviorEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string>('');

    useEffect(() => {
        if (!userLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
            return;
        }

        let mounted = true;

        (async () => {
            try {
                setErr('');
                const data = await api<GetAllClientsResponse>('post', '/aba/getAllClientInfo', { 
                    employeeUsername: loggedInUser 
                });

                if (!mounted) return;

                if (data.statusCode === 200 && data.clientData) {
                    setClients(data.clientData);
                    // auto select first client
                    if (data.clientData.length > 0 && !clientID) {
                        setClientID(String(data.clientData[0].clientID));
                    }
                } else {
                    throw new Error(data.serverMessage || 'Failed to load clients');
                }
            } catch (e: any) {
                if (!mounted) return;
                setErr(e?.message || 'Failed to load clients.');
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!clientID) return;

        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setErr('');

                const { start, end } = getRangeDates(range);
                
                const data = await api<BehaviorEntry[]>('post', '/aba/getTargetBehavior', {
                    clientID,
                    startDate: start,
                    endDate: end,
                    employeeUsername: loggedInUser
                });

                if (!mounted) return;
                setEntries(Array.isArray(data) ? data : []);
            } catch (e: any) {
                if (!mounted) return;
                setEntries([]);
                setErr(e?.message || 'Failed to load behavior entries.');
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [clientID, range]);

    const view = useMemo(() => {
        const { start, end } = getRangeDates(range);
        return buildDashboardView(entries, { start, end });
    }, [entries, range]);

    return (
        <>
        <Header />
        <Head>
            <title>Dashboard - BMetrics</title>
        </Head>
        <div className={styles.dashboardPage}>
            {/* Sticky filter bar */}
            <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                    <label className={styles.label}>Client</label>
                    <select
                        className={styles.select}
                        value={clientID}
                        onChange={(e) => setClientID(e.target.value)}
                    >
                        {clients.map((c) => (
                            <option key={String(c.clientID)} value={String(c.clientID)}>
                                {c.fullName || `${c.fName} ${c.lName}`}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.label}>Range</label>
                    <select className={styles.select} value={range} onChange={(e) => setRange(e.target.value as DateRangeKey)}>
                        {RANGE_OPTIONS.map((r) => (
                            <option key={r.key} value={r.key}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterSpacer} />

                <button className={styles.primaryButton} type="button">
                    + Add Data Entry
                </button>
            </div>

            {/* Status row */}
            <div className={styles.statusRow}>
                {loading && <span className={styles.statusPill}>Loading dashboard…</span>}
                {!loading && err && <span className={`${styles.statusPill} ${styles.statusPillError}`}>{err}</span>}
                {!loading && !err && (
                    <span className={styles.statusPill}>
                        Showing <b>{view.meta.start}</b> → <b>{view.meta.end}</b>
                    </span>
                )}
            </div>

            {/* KPI cards */}
            <div className={styles.kpiGrid}>
                <KpiCard title="Sessions Logged" value={String(view.kpis.sessionsLogged)} sub={view.kpis.sessionsDeltaLabel} />
                <KpiCard title="Data Points" value={String(view.kpis.dataPoints)} sub="Total recorded entries" />
                <KpiCard title="Top Behavior" value={view.kpis.topBehaviorName || '—'} sub={view.kpis.topBehaviorDetail || ''} />
                <KpiCard title="Days Since Last Entry" value={String(view.kpis.daysSinceLastEntry)} sub={view.kpis.lastEntryLabel} />
            </div>

            {/* Main grid */}
            <div className={styles.mainGrid}>
                {/* Trend chart */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div>
                            <h2 className={styles.cardTitle}>Behavior Trends</h2>
                            <p className={styles.cardSub}>Top behaviors over time (filled missing days)</p>
                        </div>
                    </div>

                    {view.trend.series.length === 0 ? (
                        <div className={styles.emptyState}>No data available within range.</div>
                    ) : (
                        <div className={styles.chartWrap}>
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={view.trend.timeline}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tickMargin={8} />
                                    <YAxis tickMargin={8} />
                                    <Tooltip />
                                    {view.trend.series.map((s) => (
                                        <Line
                                            key={s.key}
                                            type="monotone"
                                            dataKey={s.key}
                                            dot={false}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Alerts */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div>
                            <h2 className={styles.cardTitle}>Needs Attention</h2>
                            <p className={styles.cardSub}>Quick clinical flags & data-quality signals</p>
                        </div>
                    </div>

                    <AlertList alerts={view.alerts} />
                </div>
            </div>

            {/* Secondary charts */}
            <div className={styles.bottomGrid}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div>
                            <h2 className={styles.cardTitle}>Daily Totals</h2>
                            <p className={styles.cardSub}>Total recorded value per day (summed)</p>
                        </div>
                    </div>

                    {view.dailyTotals.length === 0 ? (
                        <div className={styles.emptyState}>No data available within range.</div>
                    ) : (
                        <div className={styles.chartWrap}>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={view.dailyTotals}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tickMargin={8} />
                                    <YAxis tickMargin={8} />
                                    <Tooltip />
                                    <Bar dataKey="total" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div>
                            <h2 className={styles.cardTitle}>Recent Activity</h2>
                            <p className={styles.cardSub}>Latest entries (quick view)</p>
                        </div>
                    </div>

                    {view.recent.length === 0 ? (
                        <div className={styles.emptyState}>No recent entries.</div>
                    ) : (
                        <div className={styles.recentList}>
                            {view.recent.map((r) => (
                                <div key={r.id} className={styles.recentRow}>
                                    <div className={styles.recentLeft}>
                                        <div className={styles.recentTitle}>{r.behaviorName}</div>
                                        <div className={styles.recentMeta}>
                                            {r.sessionDate} • {r.measurementType}
                                        </div>
                                    </div>
                                    <div className={styles.recentValue}>{r.valueLabel}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}