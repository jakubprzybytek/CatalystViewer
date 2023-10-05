import { parseUTCDate } from "bonds";
import { getTime } from "date-fns";
import { getBondInformation } from "./ObligacjeWebsite";

(async () => {
    const bond = await getBondInformation('IPT0627');
    console.log(bond);
    console.log(bond.interestFirstDays);
    console.log(bond.interestFirstDays.map(parseUTCDate).map(getTime));
})();
