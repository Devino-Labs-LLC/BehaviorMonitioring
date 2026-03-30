export type DateRangeKey = '7d' | '30d' | '90d';

export const RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
];

export type MeasurementType = string;

export type BehaviorEntry = {
    id?: string | number;
    bsID?: string | number;
    clientID?: string | number;

    clientName?: string;
    behaviorName: string;

    sessionDate: string; // "YYYY-MM-DD" recommended
    measurementType: MeasurementType;

    count?: number | null;
    duration?: number | null; // seconds/minutes depending on your system
    trial?: number | null;
};

export type DashboardAlertLevel = 'high' | 'med' | 'low';

export type DashboardAlert = {
    id: string;
    level: DashboardAlertLevel;
    title: string;
    detail: string;
};

function toDayKey(sessionDate: string) {
    // Accepts ISO date or ISO datetime
    return sessionDate.length >= 10 ? sessionDate.slice(0, 10) : sessionDate;
}

function daysBetween(a: string, b: string) {
    // a, b are YYYY-MM-DD
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    const ms = db.getTime() - da.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
}

function enumerateDays(start: string, end: string) {
    const out: string[] = [];
    const d0 = new Date(start + 'T00:00:00');
    const d1 = new Date(end + 'T00:00:00');

    for (let d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) {
        out.push(d.toISOString().slice(0, 10));
    }
    return out;
}

function entryValue(e: BehaviorEntry) {
    // A single numeric value for “daily totals”
    const c = Number(e.count ?? 0);
    const dur = Number(e.duration ?? 0);

    // If duration behavior, use duration; else use count
    if (String(e.measurementType).toLowerCase().includes('duration')) return dur;
    return c;
}

type NormalizedBehaviorEntry = BehaviorEntry & {
    id: string | number;
    sessionDate: string;
    value: number;
};

function normalizeEntries(entries: BehaviorEntry[]) {
    return (entries || []).map((e, idx): NormalizedBehaviorEntry => {
        const day = toDayKey(e.sessionDate);
        return {
            ...e,
            id: e.id ?? `${day}-${e.behaviorName}-${idx}`,
            sessionDate: day,
            value: entryValue(e),
        };
    });
}

function getLastDay(normalized: NormalizedBehaviorEntry[]) {
    let lastDay = '';

    for (const e of normalized) {
        if (!lastDay || e.sessionDate > lastDay) lastDay = e.sessionDate;
    }

    return lastDay;
}

function buildBehaviorTotals(normalized: NormalizedBehaviorEntry[]) {
    const byBehavior = new Map<string, number>();

    for (const e of normalized) {
        byBehavior.set(e.behaviorName, (byBehavior.get(e.behaviorName) ?? 0) + (Number(e.value) || 0));
    }

    return byBehavior;
}

function getTopBehavior(byBehavior: Map<string, number>) {
    let topBehaviorName = '';
    let topBehaviorTotal = 0;

    for (const [k, v] of byBehavior.entries()) {
        if (v > topBehaviorTotal) {
            topBehaviorTotal = v;
            topBehaviorName = k;
        }
    }

    return { topBehaviorName, topBehaviorTotal };
}

function getTopBehaviors(byBehavior: Map<string, number>) {
    return Array.from(byBehavior.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
}

function buildDayMap(days: string[], topBehaviors: string[], normalized: NormalizedBehaviorEntry[]) {
    const dayMap = new Map<string, Map<string, number>>();

    for (const day of days) dayMap.set(day, new Map());

    for (const e of normalized) {
        if (!dayMap.has(e.sessionDate) || !topBehaviors.includes(e.behaviorName)) {
            continue;
        }

        const dayValues = dayMap.get(e.sessionDate);
        if (!dayValues) {
            continue;
        }

        dayValues.set(e.behaviorName, (dayValues.get(e.behaviorName) ?? 0) + (Number(e.value) || 0));
    }

    return dayMap;
}

function buildTrend(days: string[], topBehaviors: string[], normalized: NormalizedBehaviorEntry[]) {
    const dayMap = buildDayMap(days, topBehaviors, normalized);

    const series = topBehaviors.map((name, i) => ({
        name,
        key: `b${i}`, // recharts series key
    }));

    const timeline = days.map((day) => {
        const m = dayMap.get(day)!;
        const row: Record<string, any> = { date: day };
        series.forEach((s, i) => {
            row[s.key] = m.get(topBehaviors[i]) ?? 0;
        });
        return row;
    });

    return { series, timeline };
}

function buildDailyTotals(days: string[], normalized: NormalizedBehaviorEntry[]) {
    return days.map((day) => {
        const total = normalized
            .filter((e) => e.sessionDate === day)
            .reduce((sum, e) => sum + (Number(e.value) || 0), 0);

        return { date: day, total };
    });
}

function buildAlerts(dataPoints: number, daysSinceLastEntry: number, lastDay: string, dailyTotals: { date: string; total: number }[]) {
    const alerts: DashboardAlert[] = [];

    if (dataPoints === 0) {
        alerts.push({
            id: 'no-data',
            level: 'high',
            title: 'No data in selected range',
            detail: 'No entries were recorded for this client within the selected date range.',
        });
    }

    // Data gap alert (no data in 3+ days)
    if (daysSinceLastEntry >= 3 && dataPoints > 0) {
        alerts.push({
            id: 'gap',
            level: daysSinceLastEntry >= 7 ? 'high' : 'med',
            title: `Data gap: ${daysSinceLastEntry} days`,
            detail: `Last entry was on ${lastDay}. Consider confirming data collection consistency.`,
        });
    }

    // Spike alert: compare last 3 days total vs previous 7-day avg (simple + effective)
    if (dailyTotals.length >= 10) {
        const last3 = dailyTotals.slice(-3).reduce((s, r) => s + r.total, 0);
        const prev7 = dailyTotals.slice(-10, -3);
        const prevAvg = prev7.reduce((s, r) => s + r.total, 0) / Math.max(1, prev7.length);

        if (prevAvg > 0 && last3 > prevAvg * 2.2) {
            alerts.push({
                id: 'spike',
                level: 'med',
                title: 'Possible spike detected',
                detail: `Last 3 days total is noticeably higher than the prior week average.`,
            });
        }
    }

    return alerts;
}

function buildRecentActivity(normalized: NormalizedBehaviorEntry[]) {
    return normalized
        .slice()
        .sort((a, b) => (a.sessionDate < b.sessionDate ? 1 : -1))
        .slice(0, 6)
        .map((e) => ({
            id: String(e.id),
            behaviorName: e.behaviorName,
            sessionDate: e.sessionDate,
            measurementType: e.measurementType,
            valueLabel: String(e.value ?? 0),
        }));
}

function buildDashboardKpis(
    normalized: NormalizedBehaviorEntry[],
    byBehavior: Map<string, number>,
    start: string,
    end: string
) {
    const sessionsLogged = new Set(normalized.map((e) => e.sessionDate)).size;
    const dataPoints = normalized.length;
    const lastDay = getLastDay(normalized);
    const daysSinceLastEntry = lastDay ? Math.max(0, daysBetween(lastDay, end)) : daysBetween(start, end) + 1;
    const { topBehaviorName, topBehaviorTotal } = getTopBehavior(byBehavior);

    return {
        sessionsLogged,
        dataPoints,
        topBehaviorName,
        topBehaviorDetail: topBehaviorName ? `Total: ${topBehaviorTotal}` : '',
        daysSinceLastEntry,
        lastDay,
        lastEntryLabel: lastDay ? `Last: ${lastDay}` : 'No entries yet',
        sessionsDeltaLabel: 'vs previous range (optional)',
    };
}

export function buildDashboardView(entries: BehaviorEntry[], range: { start: string; end: string }) {
    const start = range.start;
    const end = range.end;
    const normalized = normalizeEntries(entries);
    const byBehavior = buildBehaviorTotals(normalized);
    const days = enumerateDays(start, end);
    const topBehaviors = getTopBehaviors(byBehavior);
    const trend = buildTrend(days, topBehaviors, normalized);
    const dailyTotals = buildDailyTotals(days, normalized);
    const kpis = buildDashboardKpis(normalized, byBehavior, start, end);
    const alerts = buildAlerts(kpis.dataPoints, kpis.daysSinceLastEntry, kpis.lastDay, dailyTotals);
    const recent = buildRecentActivity(normalized);

    return {
        meta: { start, end },

        kpis,
        trend,
        dailyTotals,
        alerts,
        recent,
    };
}

export type DashboardView = ReturnType<typeof buildDashboardView>;
