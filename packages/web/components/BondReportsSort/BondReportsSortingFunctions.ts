import { BondReportsSortOrder } from ".";
import { sortByInterestProgress, sortByName, sortByTimeToMaturityAsc } from "../../bonds/statistics";
import { BondReport } from "../../sdk";

export function getBondReportsSortingFunction(sortOrder: BondReportsSortOrder): (list: BondReport[]) => BondReport[] {
  switch (sortOrder) {
    case BondReportsSortOrder.TimeToMaturityAsc:
      return sortByTimeToMaturityAsc;
    case BondReportsSortOrder.InterestProgressAsc:
      return sortByInterestProgress;
  }
  return sortByName;
}
