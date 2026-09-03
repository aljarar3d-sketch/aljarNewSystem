'use client';

import { useEffect, useMemo, useState } from 'react';

export interface ClientOption {
  id: string;
  name: string;
}

export interface ClientPickerProps {
  adminSecret: string;
  value: string;
  onChange: (clientId: string) => void;
  label?: string;
}

export function ClientPicker({ adminSecret, value, onChange, label = 'Client' }: ClientPickerProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!adminSecret) return;
    let cancelled = false;

    fetch('/api/clients', { headers: { Authorization: `Bearer ${adminSecret}` } })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: ClientOption[]) => {
        if (!cancelled) setClients(data);
      })
      .catch(() => {
        if (!cancelled) setClients([]);
      });

    return () => {
      cancelled = true;
    };
  }, [adminSecret]);

  // Once a client is selected, show its name instead of whatever partial query found it.
  const selectedClient = clients.find((client) => client.id === value);
  const displayValue = selectedClient ? selectedClient.name : query;

  const filteredClients = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return clients;
    return clients.filter((client) => client.name.toLowerCase().startsWith(search));
  }, [clients, query]);

  function selectClient(client: ClientOption) {
    onChange(client.id);
    setQuery(client.name);
    setDropdownOpen(false);
  }

  return (
    <label className="relative flex flex-col gap-1.5 text-sm">
      <span className="text-dim">{label}</span>
      <input
        type="text"
        placeholder="Start typing a client name…"
        value={displayValue}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange('');
          setDropdownOpen(true);
        }}
        onFocus={() => setDropdownOpen(true)}
        onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
        required
        className="rounded-md border border-line bg-panel px-3 py-2 text-paper outline-none transition placeholder:text-dim/60 focus:border-scan"
      />
      {dropdownOpen && filteredClients.length > 0 && (
        <ul className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-line bg-panel-raised text-sm shadow-lg">
          {filteredClients.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectClient(client)}
                className="block w-full px-3 py-2 text-left text-paper transition hover:bg-line"
              >
                {client.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query && !value && <span className="text-xs text-dim">Pick a client from the list to continue.</span>}
    </label>
  );
}
