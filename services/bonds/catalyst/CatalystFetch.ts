import axios from 'axios';

export async function downloadCorporateBondsQuotes(): Promise<string> {
    const url = 'https://gpwcatalyst.pl/notowania-obligacji-obligacje-korporacyjne';

    console.log(`Fetching: ${url}`);

    return await axios({
        method: 'GET',
        url: url
    }).then((response) => response.data);
}
