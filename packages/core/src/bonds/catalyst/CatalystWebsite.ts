import { downloadLatestCatalystDailyStatisticsFile, fetchBankSecuritiesBondsQuotes, fetchCooperativeBondsQuotes, fetchCorporateBondsQuotes, fetchMortgageCoveredBondsQuotes, fetchMunicipalBondsQuotes, fetchTreasuryBondsQuotes } from "./fetch";
import { readCatalystDailyStatisticsXlsFile, parseBondsQuotesPage, CatalystBondQuery, CatalystDailyStatisticsBondDetails } from "./sources";

export async function getLatestCatalystDailyStatistics(): Promise<CatalystDailyStatisticsBondDetails[]> {
    const catalystDailyStatisticsFileName = await downloadLatestCatalystDailyStatisticsFile();
    return readCatalystDailyStatisticsXlsFile(catalystDailyStatisticsFileName);
};

export async function getCurrentCatalystBondsQuotes(): Promise<CatalystBondQuery[]> {
    const corporateBondsQuotesMarkup = await fetchCorporateBondsQuotes();
    const corporatePLNBondQuotes = parseBondsQuotesPage(corporateBondsQuotesMarkup, 'Obligacje przedsiębiorstw', 'PLN');
    const corporateEURBondQuotes = parseBondsQuotesPage(corporateBondsQuotesMarkup, 'przedsiębiorstw', 'EUR');

    console.log(`Fetched and parsed ${corporatePLNBondQuotes.length} PLN and ${corporateEURBondQuotes.length} EUR coroporate bonds' quotes.`);

    const treasuryBondsQuotesMarkup = await fetchTreasuryBondsQuotes();
    const treasuryPLNBondQuotes = parseBondsQuotesPage(treasuryBondsQuotesMarkup, 'Obligacje skarbowe', 'PLN');
    const treasuryEURBondQuotes = parseBondsQuotesPage(treasuryBondsQuotesMarkup, 'Obligacje skarbowe', 'EUR');

    console.log(`Fetched and parsed ${treasuryPLNBondQuotes.length} PLN and ${treasuryEURBondQuotes.length} EUR treasury bonds' quotes.`);

    const municipalBondsQuotesMarkup = await fetchMunicipalBondsQuotes();
    const municipalPLNBondQuotes = parseBondsQuotesPage(municipalBondsQuotesMarkup, 'Obligacje komunalne', 'PLN');

    console.log(`Fetched and parsed ${municipalPLNBondQuotes.length} PLN municipal bonds' quotes.`);

    const cooperativeBondsQuotesMarkup = await fetchCooperativeBondsQuotes();
    const cooperativePLNBondQuotes = parseBondsQuotesPage(cooperativeBondsQuotesMarkup, 'Obligacje Banków Spółdzielczych', 'PLN');

    console.log(`Fetched and parsed ${cooperativePLNBondQuotes.length} PLN co-operative bonds' quotes.`);

    const bankSecuritiesBondsQuotesMarkup = await fetchBankSecuritiesBondsQuotes();
    const bankSecuritiesPLNBondQuotes = parseBondsQuotesPage(bankSecuritiesBondsQuotesMarkup, 'Bankowe Papiery Wartościowe', 'PLN');

    console.log(`Fetched and parsed ${bankSecuritiesPLNBondQuotes.length} PLN bank securities bonds' quotes.`);

    const mortgageCoveredBondsQuotesMarkup = await fetchMortgageCoveredBondsQuotes();
    const mortgageCoveredPLNBondQuotes = parseBondsQuotesPage(mortgageCoveredBondsQuotesMarkup, 'Listy zastawne', 'PLN');
    const mortgageCoveredEURBondQuotes = parseBondsQuotesPage(mortgageCoveredBondsQuotesMarkup, 'Listy zastawne', 'EUR');

    console.log(`Fetched and parsed ${mortgageCoveredPLNBondQuotes.length} PLN and ${mortgageCoveredEURBondQuotes.length} EUR mortgage covered bonds' quotes.`);

    return corporatePLNBondQuotes
        .concat(corporateEURBondQuotes)
        .concat(treasuryPLNBondQuotes)
        .concat(treasuryEURBondQuotes)
        .concat(municipalPLNBondQuotes)
        .concat(cooperativePLNBondQuotes)
        .concat(bankSecuritiesPLNBondQuotes)
        .concat(mortgageCoveredPLNBondQuotes)
        .concat(mortgageCoveredEURBondQuotes);
};
