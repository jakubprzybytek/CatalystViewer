import { parseObligacjeBondInformationPage } from "./ObligacjeBondInformationPage";
import { downloadBondDetailsPage } from "./ObligacjeFetch";
import { ObligacjeBondInformation } from ".";

export async function getBondInformation(bondName: string): Promise<ObligacjeBondInformation> {
    const bondPageMarkup = await downloadBondDetailsPage(bondName);
    const bondInformation = parseObligacjeBondInformationPage(bondPageMarkup);

    console.log(`Parsed: ${JSON.stringify(bondInformation)}`);

    return bondInformation;
}
