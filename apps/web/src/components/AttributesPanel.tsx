import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AttributeCategory } from '@football-life/shared';
import { api } from '../api/client';
import { attributeCategoryLabels, attributeLabels, label } from '../i18n';
import { to20 } from '../utils/scale';
import { ratingTone, ratingWord } from '../utils/words';

interface AttributesPanelProps {
  saveId: string;
}

const VISIBLE_CATEGORIES = [
  AttributeCategory.Technical,
  AttributeCategory.Physical,
  AttributeCategory.Mental,
] as const;

/**
 * The player's self-assessment, FM-style: visible attributes as quality
 * words ("Discreto"), not raw numbers. Hidden attributes stay hidden here —
 * only the admin editor shows those.
 */
export function AttributesPanel({ saveId }: AttributesPanelProps) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['editable-player', saveId],
    queryFn: () => api.getEditablePlayer(saveId),
    enabled: open,
  });

  return (
    <section className="card">
      <button
        type="button"
        className="attr-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <h2>🎯 I tuoi attributi</h2>
        <span className="attr-chevron">{open ? '▴' : '▾'}</span>
      </button>

      {open && query.isLoading && <p className="empty">Caricamento…</p>}
      {open && query.isError && (
        <p className="error">Impossibile caricare gli attributi.</p>
      )}
      {open && query.data && (
        <div className="attr-groups">
          {VISIBLE_CATEGORIES.map((category) => {
            const rows = query.data.attributes.filter(
              (a) => a.category === category,
            );
            if (rows.length === 0) return null;
            const mean =
              rows.reduce((sum, a) => sum + to20(a.value), 0) / rows.length;
            return (
              <div key={category} className="attr-group">
                <h3 className="attr-group-title">
                  {label(attributeCategoryLabels, category)}
                  <span className={`attr-word ${ratingTone(mean)}`}>
                    {ratingWord(mean)}
                  </span>
                </h3>
                <ul className="attr-list">
                  {rows.map((a) => (
                    <li
                      key={a.key}
                      className="attr-row"
                      title={`${label(attributeLabels, a.key)}: ${to20(a.value)}/20`}
                    >
                      <span className="attr-name">
                        {label(attributeLabels, a.key)}
                      </span>
                      <span
                        className={`attr-word ${ratingTone(to20(a.value))}`}
                      >
                        {ratingWord(to20(a.value))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
