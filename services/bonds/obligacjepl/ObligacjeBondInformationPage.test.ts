import { describe, it, expect } from "vitest";
import { parseObligacjeBondInformationPage } from "./ObligacjeBondInformationPage";

describe("ObligacjeBondInformationPage", () => {
    it("should parse", () => {
        const markup = `<div class="headline">
    <div class="title">
        <h1>KRU0827</h1>
    </div>
    <div class="logo-box-1"><a href="/pl/emitent/kruk-s-a"><img src="/img/emitenci/1/2015_11/r-12.jpg" alt="" title="" /></a></div>
</div>
<div class="search-content-box search-content-box-1">
    <div class="column column-1">
        <table class="table-9">
            <tr>
                <th>Emitent:</th>
                <td><a href="/pl/emitent/kruk-s-a" class="nazwa-emitenta">Kruk S.A.</a></td>
                <!-- <td><a class="btn-3" href="/pl/emitent/kruk-s-a">Kruk S.A.</a></td> -->
            </tr>
            <tr>
                <th>Seria:</th>
                <td>AM4</td>
            </tr>
            <tr>
                <th>ISIN:</th>
                <td>PLKRK0000713</td>
            </tr>
            <tr>
                <th>Rynek:</th>
                <td>GPW RR</td>
            </tr>
            <tr>
                <th>Status:</th>
                <td>Notowane</td>
            </tr>
            <tr>
                <th>Wartość emisji w obrocie:</th>
                <td>60 000 000 PLN</td>
            </tr>
            <tr>
                <th>Wartość nominalna:</th>
                <td>100.00 PLN</td>
            </tr>
            <tr>
                <th>Zabezpieczenie:</th>
                <td>NIE</td>
            </tr>
            <tr>
                <th>Typ oprocentowania:</th>
                <td>zmienne WIBOR 3M +  3.3%</td>
            </tr>
            <tr>
                <th>Oprocentowanie bieżące:</th>
                <td>10.33%</td>
            </tr>
            <tr>
                <th>Rentowność:</th>
                <td><a class="btn-3" href="/pl/narzedzia/kalkulator-rentownosci,symbol-KRU0827">SPRAWDŹ</a></td>
            </tr>
            <tr>
                <th>Dokument informacyjny:</th>
                <td><a href="/pl/d/f5511c039f530b148923094e85090a01" class="link-1">kruk-seria-am4.pdf</a><br /></td>
            </tr>
        </table>`;
    
        const bondInformation = parseObligacjeBondInformationPage(markup);
        expect(bondInformation).toEqual({
            name: 'KRU0827',
            issuer: 'Kruk S.A.',
            market: 'GPW RR',
            emissionValue: 60000000,
            nominalValue: 100,
            interestType: 'zmienne WIBOR 3M + 3.3%',
            currency: 'PLN'
          });
    });
});
