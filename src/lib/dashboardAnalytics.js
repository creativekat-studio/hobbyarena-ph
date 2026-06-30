const PERIOD_DAYS = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
};

function parseDateOnly(value, endOfDay = false) {
  if (!value) return null;
  const parsed = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRangeLabel(start, end) {
  const opts = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function resolvePeriodWindow(period, now = new Date()) {
  if (typeof period === "object" && period?.start && period?.end) {
    const start = parseDateOnly(period.start, false);
    const end = parseDateOnly(period.end, true);
    if (!start || !end || start > end) {
      return resolvePeriodWindow("1M", now);
    }
    const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days + 1);
    prevStart.setHours(0, 0, 0, 0);
    return {
      start,
      end,
      prevStart,
      prevEnd,
      periodKey: "custom",
      periodLabel: formatRangeLabel(start, end),
      rangeDays: days,
    };
  }

  const periodKey = PERIOD_DAYS[period] ? period : "1M";
  const days = PERIOD_DAYS[periodKey];
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  const prevEnd = new Date(start);
  prevEnd.setMilliseconds(-1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);
  prevStart.setHours(0, 0, 0, 0);

  const periodLabel = { "1D": "today", "1W": "7 days", "1M": "30 days", "3M": "90 days", "1Y": "year" }[periodKey];

  return { start, end, prevStart, prevEnd, periodKey, periodLabel, rangeDays: days };
}

const LINE_COLORS = {
  "Pokémon TCG": "#7c3aed",
  "One Piece Card Game": "#06b6d4",
  "One Piece CG": "#06b6d4",
  Accessories: "#f59e0b",
};

function parseOrderDate(order) {
  const raw = order.date || order.createdAt;
  if (!raw) return null;
  const parsed = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

import { migratePaymentStatus } from "../data/orderWorkflow.js";

function orderRevenue(order) {
  const payment = migratePaymentStatus(order.payment);
  if (payment === "Fully Paid") return order.fullSubtotal ?? order.total ?? 0;
  if (payment === "DP Paid") return order.total ?? 0;
  return 0;
}

function filterOrdersByRange(orders, start, end) {
  return orders.filter((order) => {
    const date = parseOrderDate(order);
    if (!date) return false;
    return date >= start && date <= end;
  });
}

function pctDelta(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10) / 10;
}

function uniqueCustomers(orderList) {
  return new Set(orderList.map((o) => (o.email || o.customer || "").toLowerCase()).filter(Boolean)).size;
}

function aggregateLineItems(orders) {
  const byProduct = new Map();
  const byLine = new Map();

  for (const order of orders) {
    if (orderRevenue(order) <= 0) continue;
    const items = order.lineItems?.length
      ? order.lineItems
      : [{ name: order.items || "Unknown", quantity: order.qty || 1, price: order.total, line: "Other" }];

    for (const item of items) {
      const revenue = (item.price ?? 0) * (item.quantity ?? 1);
      const key = item.id || item.name;
      const existing = byProduct.get(key) || { name: item.name, units: 0, revenue: 0 };
      existing.units += item.quantity ?? 1;
      existing.revenue += revenue;
      byProduct.set(key, existing);

      const line = item.line || "Other";
      byLine.set(line, (byLine.get(line) || 0) + revenue);
    }
  }

  return { byProduct, byLine };
}

function buildTrendBuckets(orders, period, window, now = new Date()) {
  if (window?.start && window?.end) {
    const { start, end } = window;
    const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
    const buckets = [];

    if (days <= 1) {
      for (let h = 0; h < 24; h += 1) {
        buckets.push({ key: h, label: `${String(h).padStart(2, "0")}:00`, revenue: 0, orders: 0, start: null, end: null });
      }
      for (const order of orders) {
        const date = parseOrderDate(order);
        if (!date || date < start || date > end) continue;
        const bucket = buckets[date.getHours()];
        if (bucket) {
          bucket.revenue += orderRevenue(order);
          bucket.orders += 1;
        }
      }
    } else if (days <= 31) {
      for (let i = 0; i < days; i += 1) {
        const bucketStart = new Date(start);
        bucketStart.setDate(bucketStart.getDate() + i);
        bucketStart.setHours(0, 0, 0, 0);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setHours(23, 59, 59, 999);
        buckets.push({
          key: bucketStart.toISOString().slice(0, 10),
          label: bucketStart.toLocaleString("en-US", { month: "short", day: "numeric" }),
          revenue: 0,
          orders: 0,
          start: bucketStart,
          end: bucketEnd,
        });
      }
      for (const order of orders) {
        const date = parseOrderDate(order);
        if (!date) continue;
        const bucket = buckets.find((b) => date >= b.start && date <= b.end);
        if (bucket) {
          bucket.revenue += orderRevenue(order);
          bucket.orders += 1;
        }
      }
    } else if (days <= 120) {
      const bucketCount = Math.min(12, Math.max(4, Math.ceil(days / 7)));
      const stepDays = Math.max(1, Math.floor(days / bucketCount));
      for (let i = 0; i < bucketCount; i += 1) {
        const bucketStart = new Date(start);
        bucketStart.setDate(bucketStart.getDate() + i * stepDays);
        bucketStart.setHours(0, 0, 0, 0);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(bucketEnd.getDate() + stepDays - 1);
        bucketEnd.setHours(23, 59, 59, 999);
        if (bucketEnd > end) bucketEnd.setTime(end.getTime());
        buckets.push({
          key: bucketStart.toISOString().slice(0, 10),
          label: bucketStart.toLocaleString("en-US", { month: "short", day: "numeric" }),
          revenue: 0,
          orders: 0,
          start: bucketStart,
          end: bucketEnd,
        });
      }
      for (const order of orders) {
        const date = parseOrderDate(order);
        if (!date) continue;
        const bucket = buckets.find((b) => date >= b.start && date <= b.end);
        if (bucket) {
          bucket.revenue += orderRevenue(order);
          bucket.orders += 1;
        }
      }
    } else {
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        const bucketStart = new Date(cursor);
        const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
        buckets.push({
          key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
          label: cursor.toLocaleString("en-US", { month: "short" }),
          revenue: 0,
          orders: 0,
          start: bucketStart,
          end: bucketEnd,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      for (const order of orders) {
        const date = parseOrderDate(order);
        if (!date) continue;
        const bucket = buckets.find((b) => date >= b.start && date <= b.end);
        if (bucket) {
          bucket.revenue += orderRevenue(order);
          bucket.orders += 1;
        }
      }
    }

    return buckets.map(({ label, revenue, orders: orderCount }) => ({
      month: label,
      revenue: Math.round(revenue),
      orders: orderCount,
    }));
  }

  const days = PERIOD_DAYS[period] ?? 30;
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  const buckets = [];

  if (period === "1D") {
    for (let h = 0; h < 24; h += 1) {
      buckets.push({ key: h, label: `${String(h).padStart(2, "0")}:00`, revenue: 0, orders: 0 });
    }
    for (const order of orders) {
      const date = parseOrderDate(order);
      if (!date || date < start || date > end) continue;
      const bucket = buckets[date.getHours()];
      if (bucket) {
        bucket.revenue += orderRevenue(order);
        bucket.orders += 1;
      }
    }
  } else if (period === "1Y") {
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("en-US", { month: "short" }),
        revenue: 0,
        orders: 0,
        start: d,
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      });
    }
    for (const order of orders) {
      const date = parseOrderDate(order);
      if (!date) continue;
      const bucket = buckets.find((b) => date >= b.start && date <= b.end);
      if (bucket) {
        bucket.revenue += orderRevenue(order);
        bucket.orders += 1;
      }
    }
  } else {
    const bucketCount = period === "1W" ? 7 : period === "1M" ? 6 : 12;
    const stepDays = Math.max(1, Math.floor(days / bucketCount));
    for (let i = bucketCount - 1; i >= 0; i -= 1) {
      const bucketEnd = new Date(end);
      bucketEnd.setDate(bucketEnd.getDate() - i * stepDays);
      const bucketStart = new Date(bucketEnd);
      bucketStart.setDate(bucketStart.getDate() - stepDays + 1);
      bucketStart.setHours(0, 0, 0, 0);
      buckets.push({
        key: bucketStart.toISOString().slice(0, 10),
        label: bucketStart.toLocaleString("en-US", { month: "short", day: "numeric" }),
        revenue: 0,
        orders: 0,
        start: bucketStart,
        end: bucketEnd,
      });
    }
    for (const order of orders) {
      const date = parseOrderDate(order);
      if (!date) continue;
      const bucket = buckets.find((b) => date >= b.start && date <= b.end);
      if (bucket) {
        bucket.revenue += orderRevenue(order);
        bucket.orders += 1;
      }
    }
  }

  return buckets.map(({ label, revenue, orders: orderCount }) => ({
    month: label,
    revenue: Math.round(revenue),
    orders: orderCount,
  }));
}

function channelSplit(orders) {
  const counts = { Sealed: 0, "Pre-order": 0, Mixed: 0 };
  for (const order of orders) {
    const type = order.type === "In-stock" ? "Sealed" : order.type;
    if (counts[type] != null) counts[type] += 1;
    else counts.Sealed += 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return [
    { channel: "Sealed", value: Math.round((counts.Sealed / total) * 100) },
    { channel: "Pre-order", value: Math.round((counts["Pre-order"] / total) * 100) },
    { channel: "Mixed", value: Math.round((counts.Mixed / total) * 100) },
  ].filter((entry) => entry.value > 0);
}

export function computeDashboardAnalytics(orders, period = "1M", now = new Date()) {
  const { start, end, prevStart, prevEnd, periodKey, periodLabel } = resolvePeriodWindow(period, now);
  const customWindow = periodKey === "custom" ? { start, end } : null;

  const current = filterOrdersByRange(orders, start, end);
  const previous = filterOrdersByRange(orders, prevStart, prevEnd);

  const currentRevenue = current.reduce((sum, o) => sum + orderRevenue(o), 0);
  const previousRevenue = previous.reduce((sum, o) => sum + orderRevenue(o), 0);
  const currentCustomers = uniqueCustomers(current);
  const previousCustomers = uniqueCustomers(previous);
  const avgOrder = current.length ? Math.round(currentRevenue / current.length) : 0;
  const prevAvgOrder = previous.length ? Math.round(previousRevenue / previous.length) : 0;

  const { byProduct, byLine } = aggregateLineItems(current);
  const lineTotal = [...byLine.values()].reduce((a, b) => a + b, 0) || 1;
  const salesByLine = [...byLine.entries()]
    .map(([name, revenue]) => ({
      name: name.replace("One Piece Card Game", "One Piece CG"),
      value: Math.round((revenue / lineTotal) * 100),
      color: LINE_COLORS[name] || "#94a3b8",
    }))
    .sort((a, b) => b.value - a.value);

  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const recentOrders = [...orders]
    .sort((a, b) => {
      const da = parseOrderDate(a)?.getTime() ?? 0;
      const db = parseOrderDate(b)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      customer: o.customer,
      total: o.total,
      status: o.status,
      date: o.date,
    }));

  return {
    kpis: {
      revenue: currentRevenue,
      revenueDelta: pctDelta(currentRevenue, previousRevenue),
      orders: current.length,
      ordersDelta: pctDelta(current.length, previous.length),
      customers: currentCustomers,
      customersDelta: pctDelta(currentCustomers, previousCustomers),
      avgOrder,
      avgOrderDelta: pctDelta(avgOrder, prevAvgOrder),
    },
    revenueTrend: buildTrendBuckets(orders, periodKey, customWindow, now),
    salesByLine: salesByLine.length ? salesByLine : [{ name: "No paid orders", value: 100, color: "#94a3b8" }],
    channelSplit: channelSplit(current),
    topProducts,
    recentOrders,
    periodLabel,
    periodKey,
  };
}
