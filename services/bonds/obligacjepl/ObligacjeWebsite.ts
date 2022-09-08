import { parseObligacjeBondInformationPage } from "./ObligacjeBondInformationPage";
import { downloadBondDetailsPage } from "./ObligacjeFetch";
import { ObligacjeBondInformation } from ".";

export async function getBondInformation(bondName: string): Promise<ObligacjeBondInformation> {
    const bondPageMarkup = await downloadBondDetailsPage(bondName);
    return parseObligacjeBondInformationPage(bondPageMarkup);
}
