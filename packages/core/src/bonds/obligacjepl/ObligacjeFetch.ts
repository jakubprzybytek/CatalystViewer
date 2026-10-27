import axios from 'axios';
import { readFixtureText, sourceFixturesDir } from '../../common/Fixtures';

export async function downloadBondDetailsPage(bondName: string): Promise<string> {
    const fixtures = sourceFixturesDir();
    if (fixtures) {
        return readFixtureText(fixtures, 'obligacje', `${bondName}.html`);
    }

    const url = `https://obligacje.pl/pl/obligacja/${bondName}`;

    console.log(`Fetching: ${url}`);

    return await axios({
        method: 'GET',
        url: url
    }).then((response) => response.data);
}
