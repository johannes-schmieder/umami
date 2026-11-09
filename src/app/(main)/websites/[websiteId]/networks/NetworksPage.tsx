'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi, useDateParameters } from '@/components/hooks';
import { WebsiteControls } from '../WebsiteControls';
import styles from './NetworksPage.module.css';

export function NetworksPage({ websiteId }: { websiteId: string }) {
  const { get } = useApi();
  const { startAt, endAt } = useDateParameters();
  const [search, setSearch] = useState('');
  const [pageState, setPage] = useState({ key: '', page: 1 });
  const key = `${startAt}:${endAt}:${search}`;
  const page = pageState.key === key ? pageState.page : 1;
  const { data, isPending, error } = useQuery({
    queryKey: ['networks', websiteId, startAt, endAt, search, page],
    queryFn: () => get(`/websites/${websiteId}/networks`, { startAt, endAt, search, page }),
  });
  return (
    <section className={styles.page}>
      <WebsiteControls websiteId={websiteId} allowFilter={false} />
      <h2>Visitor networks</h2>
      <p>
        IP addresses and network organizations recorded from November 9, 2026. Organizations
        identify the network operator, which may be a university, ISP, hosting company, or VPN. They
        do not establish a visitor’s identity or employer.
      </p>
      <label className={styles.search}>
        Find an IP address, organization, or AS number
        <input
          type="search"
          value={search}
          maxLength={255}
          onChange={e => setSearch(e.target.value)}
          placeholder="e.g. Boston University"
        />
      </label>
      {error ? (
        <p role="alert">
          Network data could not be loaded. Access requires the website owner or an administrator.
        </p>
      ) : isPending ? (
        <p>Loading networks…</p>
      ) : (
        <>
          <p>
            {data.count} network {data.count === 1 ? 'entry' : 'entries'} in this period
          </p>
          <div className={styles.scroll}>
            <table>
              <thead>
                <tr>
                  <th>IP address</th>
                  <th>Network organization</th>
                  <th>ASN</th>
                  <th>Sessions</th>
                  <th>Pageviews</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(row => (
                  <tr key={`${row.ipAddress}:${row.asn}:${row.organization}`}>
                    <td>
                      <code>{row.ipAddress}</code>
                    </td>
                    <td>{row.organization || 'Unknown'}</td>
                    <td>{row.asn || '—'}</td>
                    <td>{row.sessions}</td>
                    <td>{row.pageviews}</td>
                    <td>{new Date(row.lastSeen).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.count && <p>No recorded networks match this period and search.</p>}
          <div className={styles.paging}>
            <button disabled={page === 1} onClick={() => setPage({ key, page: page - 1 })}>
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(data.count / 50))}
            </span>
            <button
              disabled={page * 50 >= data.count}
              onClick={() => setPage({ key, page: page + 1 })}
            >
              Next
            </button>
          </div>
        </>
      )}
      <p className={styles.note}>
        Network data:{' '}
        <a href="https://db-ip.com" target="_blank" rel="noreferrer">
          IP Geolocation by DB-IP
        </a>{' '}
        ·{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        . Organization lookups run on this server. Historical visits without a saved IP are
        excluded.
      </p>
    </section>
  );
}
