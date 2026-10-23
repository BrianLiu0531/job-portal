import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import JobCard from '../components/JobCard';
import JobFilters, { type Filters } from '../components/JobFilters';
import Pagination from '../components/Pagination';
import { api, toQuery } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useMeta } from '../lib/meta';
import type { JobListItem, Paged } from '../types';

const FILTER_KEYS = ['country', 'region', 'category', 'workType', 'workplace', 'minSalary', 'sponsorship'] as const;
const PAGE_SIZE = 10;

export default function JobSearchPage() {
  const { user } = useAuth();
  const { data: meta } = useMeta();
  // Search state lives in the URL so results are shareable and survive refresh
  const [params, setParams] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get('q') ?? '');

  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ''])) as unknown as Filters;
  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page') ?? 1);

  function update(patch: Partial<Record<string, string>>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  }

  const query = { q, ...filters, sort, page, pageSize: PAGE_SIZE };
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['jobs', query, user?.id],
    queryFn: () => api<Paged<JobListItem>>(`/jobs${toQuery(query)}`),
    placeholderData: keepPreviousData,
  });

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    update({ q: keyword.trim() });
  }

  const hasFilters = !!q || FILTER_KEYS.some((k) => filters[k]);

  return (
    <div className="stack">
      <section className="hero">
        <h1>Find your next role in Australia &amp; New Zealand</h1>
        <p className="muted">Filter by location, salary and visa sponsorship — built with working-holiday makers and new arrivals in mind.</p>
        <form className="search-bar" onSubmit={submitSearch} role="search">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Job title, keyword or company"
            aria-label="Keyword"
          />
          <button className="btn btn-primary">Search</button>
        </form>
      </section>

      <div className="search-layout">
        {meta && <JobFilters meta={meta} value={filters} onChange={update} />}

        <section className="stack results" aria-busy={isFetching}>
          <div className="results-head">
            <span className="muted">
              {data ? `${data.total} job${data.total === 1 ? '' : 's'}` : ' '}
              {hasFilters && (
                <button
                  className="link-button"
                  onClick={() => {
                    setKeyword('');
                    setParams({});
                  }}
                >
                  Clear all
                </button>
              )}
            </span>
            <select value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })} aria-label="Sort by">
              <option value="newest">Newest first</option>
              <option value="salary">Highest salary</option>
            </select>
          </div>

          {isError && <p className="error">Couldn’t load jobs. Please try again.</p>}
          {isLoading && <p className="muted">Loading jobs…</p>}
          {data && meta && data.items.length === 0 && (
            <div className="card empty">
              <p>No jobs match your search.</p>
              <p className="muted small">Try removing a filter or searching for a broader keyword.</p>
            </div>
          )}
          {data &&
            meta &&
            data.items.map((job) => <JobCard key={job.id} job={job} meta={meta} canSave={user?.role === 'SEEKER'} />)}
          {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={(p) => update({ page: String(p) })} />}
        </section>
      </div>
    </div>
  );
}
