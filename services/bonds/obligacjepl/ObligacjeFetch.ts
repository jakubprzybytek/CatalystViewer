import axios from 'axios';

export async function downloadBondDetailsPage(bondName: string): Promise<string> {
    const url = `https://obligacje.pl/pl/obligacja/${bondName}`;

    console.log(`Fetching: ${url}`);

    return await axios({
        method: 'GET',
        url: url
    }).then((response) => response.data);
}
