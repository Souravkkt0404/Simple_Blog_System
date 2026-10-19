import { useState } from 'react';
import useAsync from '../../hooks/useAsync';

/**
 * Shared state for paginated, searchable admin tables.
 */
export default function useAdminList(fetcher, initialFilters = {}) {
  const [page, setPage] = useState(1);
  const [filters, setFiltersState] = useState({ search: '', ...initialFilters });
  const key = JSON.stringify(filters);

  const query = useAsync(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null));
    return fetcher({ ...params, page, limit: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, key]);

  const setFilters = (changes) => {
    setFiltersState((f) => ({ ...f, ...changes }));
    setPage(1);
  };

  return { ...query, page, setPage, filters, setFilters };
}
