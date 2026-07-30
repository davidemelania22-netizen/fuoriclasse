import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ShopItem } from '@football-life/shared';
import { api, ApiError } from '../api/client';
import { useGameStore } from '../stores/useGameStore';
import { WalletBar } from '../components/WalletBar';
import { ShopArt } from '../components/shop-art/ShopArt';

interface ShopPageProps {
  saveId: string;
}

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Display order, cheapest-minded categories first, luxury last. */
const CATEGORY_ORDER = [
  'EQUIPMENT',
  'WELLNESS',
  'TRAINING',
  'MEDIA',
  'HOME',
  'FAMILY',
  'LIFESTYLE',
  'GADGET',
];

const categoryLabels: Record<string, string> = {
  EQUIPMENT: '🥾 Attrezzatura',
  WELLNESS: '💚 Benessere',
  TRAINING: '🎯 Allenamento',
  MEDIA: '📸 Immagine',
  HOME: '🏠 Casa',
  FAMILY: '👨‍👩‍👦 Famiglia',
  LIFESTYLE: '✨ Stile di vita',
  GADGET: '🎮 Gadget',
};

const effectLabels: Record<string, string> = {
  morale: 'Morale',
  happiness: 'Felicità',
  motivation: 'Motivazione',
  mentalHealth: 'Salute mentale',
  stress: 'Stress',
  popularity: 'Popolarità',
  reputation: 'Fama',
  condition: 'Condizione',
  fatigue: 'Stanchezza',
};

/** Stress and fatigue are the two stats where going UP is bad news. */
const INVERTED_EFFECTS = new Set(['stress', 'fatigue']);

function EffectChips({ effects }: { effects: ShopItem['effects'] }) {
  return (
    <span className="shop-effects">
      {Object.entries(effects).map(([key, value]) => {
        const rising = (value ?? 0) > 0;
        // Less stress and less fatigue are GOOD: colour by benefit, not sign.
        const good = INVERTED_EFFECTS.has(key) ? !rising : rising;
        return (
          <span key={key} className={`shop-effect ${good ? 'up' : 'down'}`}>
            {effectLabels[key] ?? key} {rising ? '+' : ''}
            {value}
          </span>
        );
      })}
    </span>
  );
}

export function ShopPage({ saveId }: ShopPageProps) {
  const queryClient = useQueryClient();
  const closeShop = useGameStore((s) => s.closeOverlay);

  const balanceQuery = useQuery({
    queryKey: ['finance', saveId],
    queryFn: () => api.getBalance(saveId),
  });
  const shopQuery = useQuery({
    queryKey: ['shop', saveId],
    queryFn: () => api.listShop(saveId),
  });

  const buyMutation = useMutation({
    mutationFn: (itemKey: string) => api.buyItem(saveId, itemKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance', saveId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', saveId] });
    },
  });

  const balance = balanceQuery.data?.balance ?? 0;

  const groups = useMemo(() => {
    const items = shopQuery.data ?? [];
    const byCat = new Map<string, ShopItem[]>();
    for (const item of items) {
      const list = byCat.get(item.category) ?? [];
      list.push(item);
      byCat.set(item.category, list);
    }
    // Cheapest first inside a category, and categories in a fixed order so
    // the shop does not reshuffle itself between visits.
    for (const list of byCat.values()) list.sort((a, b) => a.price - b.price);
    return [...byCat.entries()].sort(
      (a, b) =>
        (CATEGORY_ORDER.indexOf(a[0]) + 1 || 99) -
        (CATEGORY_ORDER.indexOf(b[0]) + 1 || 99),
    );
  }, [shopQuery.data]);

  const insufficient =
    buyMutation.isError &&
    buyMutation.error instanceof ApiError &&
    buyMutation.error.status === 409;

  return (
    <div className="page">
      <div className="topbar">
        <button type="button" onClick={closeShop}>
          ← Indietro
        </button>
        <strong>Negozio</strong>
        <WalletBar saveId={saveId} />
      </div>

      <p className="shop-intro">
        Spendi i tuoi soldi in oggetti che danno una spinta una tantum a forma,
        umore e immagine. Ogni acquisto scala il portafoglio.
      </p>

      {insufficient && (
        <p className="error">Fondi insufficienti per questo acquisto.</p>
      )}
      {shopQuery.isLoading && <p className="empty">Caricamento negozio…</p>}

      {groups.map(([category, items]) => (
        <section className="card" key={category}>
          <h2>{categoryLabels[category] ?? category}</h2>
          <ul className="shop-list">
            {items.map((item) => {
              const affordable = balance >= item.price;
              return (
                <li
                  key={item.key}
                  className={`shop-row${affordable ? '' : ' shop-row-locked'}`}
                >
                  <ShopArt
                    itemKey={item.key}
                    category={item.category}
                    name={item.name}
                  />
                  <div className="shop-info">
                    <strong>{item.name}</strong>
                    <span className="shop-desc">{item.description}</span>
                    <EffectChips effects={item.effects} />
                  </div>
                  <div className="shop-buy">
                    <span className="shop-price">
                      {euro.format(item.price)}
                    </span>
                    <button
                      type="button"
                      disabled={!affordable || buyMutation.isPending}
                      onClick={() => buyMutation.mutate(item.key)}
                    >
                      {affordable ? 'Acquista' : 'Troppo caro'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
