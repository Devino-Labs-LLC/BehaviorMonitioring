'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Header from '../../components/header';
import { useRouter } from 'next/navigation';
import styles from '../../styles/Dashboard.module.scss';
import KpiCard from '../../components/KpiCard';
import AlertList from '../../components/AlertList';
import EmptyStatePrompt from '../../components/EmptyStatePrompt';
import Loading from '../../components/loading';
import {
    buildDashboardView,
    type BehaviorEntry,
    type DateRangeKey,
    RANGE_OPTIONS,
} from '../../components/dashboardData';
import { useAuth } from '../../hooks/useAuth';
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
import type { GetBehaviorResponse } from '../../dto/modules/behavior/responses/GetBehaviorResponse';
import type { GetBehaviorDataResponse } from '../../dto/modules/behavior/responses/GetBehaviorDataResponse';

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
    const { isReady, isLoggedIn, username } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [clientID, setClientID] = useState<string>('');
    const [range, setRange] = useState<DateRangeKey>('30d');
    const [entries, setEntries] = useState<BehaviorEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string>('');
    const [showNoClientsPrompt, setShowNoClientsPrompt] = useState(false);

    useEffect(() => {
        // Wait for auth to be ready before checking login status
        if (!isReady) return;

        if (!isLoggedIn) {
            const previousUrl = encodeURIComponent(location.pathname);
            navigate.push(`/Login?previousUrl=${previousUrl}`);
            return;
        }

        let mounted = true;

        (async () => {
            try {
                setErr('');
                const data = await api<GetAllClientsResponse>('post', '/aba/getAllClientInfo', { 
                    employeeUsername: username 
                });

                if (!mounted) return;

                if (data.statusCode === 200 && data.clientData) {
                    setClients(data.clientData);
                    // Check if no clients exist
                    if (data.clientData.length === 0) {
                        setShowNoClientsPrompt(true);
                    } else {
                        // auto select first client
                        if (!clientID) {
                            setClientID(String(data.clientData[0].clientID));
                        }
                    }
                } else if (data.statusCode === 401) {
                    // Handle unauthorized - redirect to login or show appropriate message
                    const previousUrl = encodeURIComponent(location.pathname);
                    navigate.push(`/Login?previousUrl=${previousUrl}`);
                } else {
                    throw new Error(data.serverMessage || 'Failed to load clients');
                }
            } catch (e: any) {
                if (!mounted) return;
                // Check if it's an authorization error
                if (e?.response?.status === 401 || e?.response?.data?.serverMessage === 'Unauthorized user') {
                    const previousUrl = encodeURIComponent(location.pathname);
                    navigate.push(`/Login?previousUrl=${previousUrl}`);
                } else {
                    setErr(e?.response?.data?.serverMessage || e?.message || 'Failed to load clients.');
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, [isReady, isLoggedIn, username]);

    useEffect(() => {
        if (!clientID || !username) return;

        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setErr('');

                const { start, end } = getRangeDates(range);
                
                const behaviorListResponse = await api<GetBehaviorResponse>('post', '/aba/getClientTargetBehavior', {
                    clientID,
                    employeeUsername: username
                });

                if (behaviorListResponse.statusCode !== 200) {
                    throw new Error(behaviorListResponse.serverMessage || 'Failed to load behaviors');
                }

                const behaviors = behaviorListResponse.behaviorSkillData || [];

                if (behaviors.length === 0) {
                    if (!mounted) return;
                    setEntries([]);
                    return;
                }

                const behaviorDataResponses = await Promise.all(
                    behaviors.map(async (behavior) => {
                        const behaviorDataResponse = await api<GetBehaviorDataResponse>('post', '/aba/getTargetBehavior', {
                            clientID,
                            behaviorID: behavior.bsID,
                            employeeUsername: username
                        });

                        if (behaviorDataResponse.statusCode !== 200) {
                            return [];
                        }

                        return behaviorDataResponse.behaviorSkillData.map((entry) => ({
                            id: entry.behaviorDataID,
                            bsID: entry.bsID,
                            clientID: entry.clientID,
                            clientName: entry.clientName,
                            behaviorName: behavior.name,
                            sessionDate: entry.sessionDate,
                            measurementType: behavior.measurement,
                            count: entry.count,
                            duration: entry.duration,
                            trial: entry.trial ?? null,
                        }));
                    })
                );

                if (!mounted) return;
                const normalizedEntries = behaviorDataResponses.flat().filter((entry) => {
                    return entry.sessionDate >= start && entry.sessionDate <= end;
                });
                setEntries(normalizedEntries);
            } catch (e: any) {
                if (!mounted) return;
                setEntries([]);
                setErr(e?.response?.data?.serverMessage || e?.message || 'Failed to load behavior entries.');
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

    // Show loading while auth is being checked
    if (!isReady) {
        return (
            <>
                <Header />
                <Head>
                    <title>Dashboard - BMetrics</title>
                </Head>
                <div className={styles.dashboardPage}>
                    <Loading />
                </div>
            </>
        );
    }

    return (
        <>
        <Header />
        <Head>
            <title>Dashboard - BMetrics</title>
        </Head>
        <EmptyStatePrompt
            title="No Clients Found"
            message="You don't have any clients yet. Would you like to add a new client to get started?"
            isVisible={showNoClientsPrompt}
            navigationPath="/Admin/manageClients/add"
            navigationLabel="Add New Client"
            onClose={() => setShowNoClientsPrompt(false)}
        />
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
