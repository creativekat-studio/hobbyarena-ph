import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Window a filtered/sorted list for end-of-scroll lazy loading.
 * Filters stay on the full `items` array; only rendering is paginated.
 *
 * Attach `rootRef` to the overflow scroll container and `sentinelRef` to a
 * node at the end of the list (IntersectionObserver root).
 *
 * The visible window resets when the filtered id sequence changes (filters,
 * sort, archive, etc.), not when row fields update in place.
 */
export function useInfiniteScroll(items, { pageSize = 40, observeKey } = {}) {
  const list = Array.isArray(items) ? items : [];
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const rootRef = useRef(null);
  const sentinelRef = useRef(null);

  const idsKey = useMemo(
    () => list.map((item) => String(item?.id ?? item?.uid ?? item?.email ?? "")).join("\0"),
    [list],
  );

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [idsKey, pageSize]);

  const capped = Math.min(visibleCount, list.length);
  const hasMore = capped < list.length;
  const visibleItems = useMemo(() => list.slice(0, capped), [list, capped]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return undefined;

    const root = rootRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisibleCount((current) => Math.min(current + pageSize, list.length));
      },
      {
        root: root instanceof Element ? root : null,
        rootMargin: "160px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, list.length, pageSize, capped, observeKey]);

  return {
    visibleItems,
    rootRef,
    sentinelRef,
    hasMore,
    visibleCount: capped,
    totalCount: list.length,
  };
}
