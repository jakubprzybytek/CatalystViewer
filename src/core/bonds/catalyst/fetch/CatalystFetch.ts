import axios, { AxiosError } from 'axios';

export async function fetchBondsQuotes(path: string): Promise<string> {
    const url = `https://gpwcatalyst.pl${path}`;

    console.log(`Fetching: ${url}`);

    return await axios({
        method: 'GET',
        url: url,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8,pl;q=0.7',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
        }
    })
        .then(response => response.data)
        .catch(error => {
            if (axios.isAxiosError(error))
                throw Error(`Cannot fetch '${url}': ${(error as AxiosError).code}`);
            else
                throw Error(`Cannot fetch '${url}': ${error}`);
        });
}

export async function fetchCorporateBondsQuotes(): Promise<string> {
    return fetchBondsQuotes('/notowania-obligacji-obligacje-korporacyjne');
}

export async function fetchTreasuryBondsQuotes(): Promise<string> {
    return fetchBondsQuotes('/notowania-obligacji-obligacje-skarbowe');
}

export async function fetchMunicipalBondsQuotes(): Promise<string> {
    return fetchBondsQuotes('/notowania-obligacji-obligacje-komunalne');
}

export async function fetchCooperativeBondsQuotes(): Promise<string> {
    return fetchBondsQuotes('/notowania-obligacji-obligacje-spoldzielcze');
}

export async function fetchBankSecuritiesBondsQuotes(): Promise<string> {
    return fetchBondsQuotes('/notowania-obligacji-bankowe-papiery-wartosciowe');
}

export async function fetchMortgageCoveredBondsQuotes(): Promise<string> {
    return fetchBondsQuotes('/notowania-obligacji-listy-zastawne');
}
