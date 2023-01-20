import { useState, createContext, useContext } from "react";
import { useArrayLocalStorage, useLocalStorage } from "../../common/UseStorage";

export type BondsFilterType = {
  bondTypeFilterString: string;
  setBondTypeFilterString: (bondType: string) => void;

  issuersFilterStrings: string[];
  addIssuerFilterString: (issuer: string) => void;
  removeIssuerFilterString: (issuer: string) => void;

  maxNominalValueFilterNumber: number;
  setMaxNominalValueFilterNumber: (maxNominalValue: number) => void;

  marketsFilterStrings: string[];
  addMarketFilter: (market: string) => void;
  removeMarketFilter: (market: string) => void;

  count: number;
  setCount: (value: number) => void;
}

const DEFAULT_ISSUERS: string[] = [];

const DEFAULT_MARKETS = ['GPW RR', 'GPW ASO'];

const DEFAULT_BONDS_FILTERS_CONTEXT: BondsFilterType = {
  bondTypeFilterString: '',
  setBondTypeFilterString: (bondType: string) => { return; },
  issuersFilterStrings: DEFAULT_ISSUERS,
  addIssuerFilterString: (issuer: string) => { return; },
  removeIssuerFilterString: (issuer: string) => { return; },
  maxNominalValueFilterNumber: 0,
  setMaxNominalValueFilterNumber: (maxNominalValue: number) => { return; },
  marketsFilterStrings: DEFAULT_MARKETS,
  addMarketFilter: (market: string) => { return; },
  removeMarketFilter: (market: string) => { return; },
  count: 0,
  setCount: (value: number) => { return; }
}

const BondFiltersContext = createContext<BondsFilterType>(DEFAULT_BONDS_FILTERS_CONTEXT);

type BondFiltersProviderPropsType = {
  children: React.ReactNode;
}

export function BondsFiltersProvider({ children }: BondFiltersProviderPropsType) {
  const [bondTypeFilterString, setBondTypeFilterString] = useLocalStorage<string>('filter.bondType', 'Corporate bonds');
  const [issuersFilterStrings, addIssuerFilterString, removeIssuerFilterString] = useArrayLocalStorage('filter.issuer', DEFAULT_ISSUERS);
  const [maxNominalValueFilterNumber, setMaxNominalValueFilterNumber] = useLocalStorage<number>('filter.maxNominalValue', 10000);
  const [marketsFilterStrings, addMarketFilter, removeMarketFilter] = useArrayLocalStorage<string>('filter.market', DEFAULT_MARKETS);

  const [count, setCount] = useState(0);

  const value = {
    bondTypeFilterString, setBondTypeFilterString,
    issuersFilterStrings, addIssuerFilterString, removeIssuerFilterString,
    maxNominalValueFilterNumber, setMaxNominalValueFilterNumber,
    marketsFilterStrings, addMarketFilter, removeMarketFilter,
    count, setCount
  };

  return (
    <BondFiltersContext.Provider value={value}>
      {children}
    </BondFiltersContext.Provider>
  );
}

export const useBondsFilters = () => {
  const context = useContext(BondFiltersContext);
  if (!context) {
    throw new Error(`Component must be wrapped in the CountContextProvider`)
  }

  return context;
}
