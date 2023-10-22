import { useState, createContext, useContext } from "react";
import { useArrayLocalStorage, useLocalStorage } from "../../common/UseStorage";
import { BondReport } from "../../sdk/GetBonds";
import { filterBy, isBondType, isInterestBaseType, isOnMarkets, nominalValueLessThan } from "../../bonds/statistics";

export type BondsFilterType = {
  bondTypeFilterString: string;
  setBondTypeFilterString: (bondType: string) => void;

  issuersFilterStrings: string[];
  addIssuerFilterString: (issuer: string) => void;
  removeIssuerFilterString: (issuer: string) => void;
  removeAllIssuersFilterStrings: () => void;

  maxNominalValueFilterNumber: number;
  setMaxNominalValueFilterNumber: (maxNominalValue: number) => void;

  marketsFilterStrings: string[];
  addMarketFilter: (market: string) => void;
  removeMarketFilter: (market: string) => void;

  interestBaseTypeFilterStrings: string[];
  addInterestBaseTypeFilterString: (interestBaseType: string) => void;
  removeInterestBaseTypeFilterString: (interestBaseType: string) => void;

  count: number;
  setCount: (value: number) => void;
}

const DEFAULT_ISSUERS: string[] = [];

const DEFAULT_MARKETS = ['GPW RR', 'GPW ASO'];

const DEFAULT_INTEREST_BASE_TYPES: string[] = [];

const DEFAULT_BONDS_FILTERS_CONTEXT: BondsFilterType = {
  bondTypeFilterString: '',
  setBondTypeFilterString: () => { return; },
  issuersFilterStrings: DEFAULT_ISSUERS,
  addIssuerFilterString: () => { return; },
  removeIssuerFilterString: () => { return; },
  removeAllIssuersFilterStrings: () => { return; },
  maxNominalValueFilterNumber: 0,
  setMaxNominalValueFilterNumber: () => { return; },
  marketsFilterStrings: DEFAULT_MARKETS,
  addMarketFilter: () => { return; },
  removeMarketFilter: () => { return; },
  interestBaseTypeFilterStrings: DEFAULT_INTEREST_BASE_TYPES,
  addInterestBaseTypeFilterString: () => { return; },
  removeInterestBaseTypeFilterString: () => { return; },
  count: 0,
  setCount: () => { return; }
}

const BondFiltersContext = createContext<BondsFilterType>(DEFAULT_BONDS_FILTERS_CONTEXT);

type BondFiltersProviderPropsType = {
  children: React.ReactNode;
}

export function BondsFiltersProvider({ children }: BondFiltersProviderPropsType) {
  const [bondTypeFilterString, setBondTypeFilterString] = useLocalStorage<string>('filter.bondType', 'Corporate bonds');
  const [issuersFilterStrings, addIssuerFilterString, removeIssuerFilterString, removeAllIssuersFilterStrings] = useArrayLocalStorage('filter.issuer', DEFAULT_ISSUERS);
  const [maxNominalValueFilterNumber, setMaxNominalValueFilterNumber] = useLocalStorage<number>('filter.maxNominalValue', 10000);
  const [marketsFilterStrings, addMarketFilter, removeMarketFilter] = useArrayLocalStorage<string>('filter.market', DEFAULT_MARKETS);
  const [interestBaseTypeFilterStrings, addInterestBaseTypeFilterString, removeInterestBaseTypeFilterString] = useArrayLocalStorage<string>('filter.interestBaseType', DEFAULT_INTEREST_BASE_TYPES);

  const [count, setCount] = useState(0);

  const value: BondsFilterType = {
    bondTypeFilterString, setBondTypeFilterString,
    issuersFilterStrings, addIssuerFilterString, removeIssuerFilterString, removeAllIssuersFilterStrings,
    maxNominalValueFilterNumber, setMaxNominalValueFilterNumber,
    marketsFilterStrings, addMarketFilter, removeMarketFilter,
    interestBaseTypeFilterStrings, addInterestBaseTypeFilterString, removeInterestBaseTypeFilterString,
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
    throw new Error('Component must be wrapped in the CountContextProvider');
  }

  return context;
}

export function useBondReportsFilterFuntion(): (bondReports: BondReport[]) => BondReport[] {
  const { bondTypeFilterString, maxNominalValueFilterNumber, marketsFilterStrings, interestBaseTypeFilterStrings } = useBondsFilters();
  return filterBy([
    isBondType(bondTypeFilterString),
    nominalValueLessThan(maxNominalValueFilterNumber),
    isOnMarkets(marketsFilterStrings),
    isInterestBaseType(interestBaseTypeFilterStrings)
  ]);
}
