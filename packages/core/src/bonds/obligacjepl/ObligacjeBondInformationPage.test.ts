import { describe, it, expect } from "vitest";
import { parseObligacjeBondInformationPage, parseInterestType } from "./ObligacjeBondInformationPage";

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
        </table>
        <div class="content-txt">
            <hr />
            <h3>Ważne informacje</h3>
            <p>Obligacje wemitowano w ramach VIII programu emisji o wartości do 700 mln zł.</p>
            <p>Emitent ma prawo do przedterminowego wykupu obligacji, nie wcześniej jednak niż sześć miesięcy po dacie emisji. Jeśli skorzysta z tego prawa, posiadacze obligacji otrzymają premię w wysokości 0,05 proc. nominału za każde 30 dni pozostające do daty wykupu, ale nie więcej niż 0,5 proc.</p>
        </div>
    </div>
    <div class="column column-2">
        <h3>Obligacje KRU0827 w portfelach funduszy<br></h3>
        <div class="nikt-nie-ma"><p>Brak danych dla tej serii.</p></div>
        <hr style="height: 1px; background: #898989; border: 0px;">
        <h3>Ważne daty</h3>
        <div class="note-content">
            <h4>Pierwsze dni okresów odsetkowych</h4>
            <div class="txt">
                <ul><li>2022-08-12</li><li>2022-11-12</li><li>2023-02-12</li><li>2023-05-12</li><li>2023-08-12</li><li>2023-11-12</li><li>2024-02-12</li><li>2024-05-12</li><li>2024-08-12</li><li>2024-11-12</li><li>2025-02-12</li><li>2025-05-12</li><li>2025-08-12</li><li>2025-11-12</li><li>2026-02-12</li><li>2026-05-12</li><li>2026-08-12</li><li>2026-11-12</li><li>2027-02-12</li><li>2027-05-12</li></ul>
            </div>
            <h4>Dni ustalenia prawa do odsetek</h4>
            <div class="txt">
                <ul><li>2022-11-03</li><li>2023-02-03</li><li>2023-05-04</li><li>2023-08-04</li><li>2023-11-03</li><li>2024-02-02</li><li>2024-05-02</li><li>2024-08-02</li><li>2024-10-31</li><li>2025-02-04</li><li>2025-05-02</li><li>2025-08-04</li><li>2025-11-03</li><li>2026-02-04</li><li>2026-05-04</li><li>2026-08-04</li><li>2026-11-03</li><li>2027-02-04</li><li>2027-05-04</li><li>2027-08-04</li></ul>
            </div>
            <h4>Dni wypłaty odsetek</h4>
            <div class="txt">
                <ul><li>2022-11-12</li><li>2023-02-12</li><li>2023-05-12</li><li>2023-08-12</li><li>2023-11-12</li><li>2024-02-12</li><li>2024-05-12</li><li>2024-08-12</li><li>2024-11-12</li><li>2025-02-12</li><li>2025-05-12</li><li>2025-08-12</li><li>2025-11-12</li><li>2026-02-12</li><li>2026-05-12</li><li>2026-08-12</li><li>2026-11-12</li><li>2027-02-12</li><li>2027-05-12</li><li>2027-08-12</li></ul>
            </div>
            <h4>Dzień wykupu</h4>
            <div class="txt">
                <ul>
                    <li>2027-08-04</li>
                </ul>
            </div>
        </div>
        <div class="note-3"><a href="/pl/emitent/kruk-s-a" class="btn-7 btn-7a btn-7-1">INFORMACJE POWIĄZANE Z EMITENTEM</a></div>`;

        const bondInformation = parseObligacjeBondInformationPage(markup);
        expect(bondInformation).toEqual({
            name: 'KRU0827',
            issuer: 'Kruk S.A.',
            market: 'GPW RR',
            issueValue: 60000000,
            nominalValue: 100,
            interestType: 'zmienne WIBOR 3M + 3.3%',
            interestVariable: 'WIBOR 3M',
            interestConst: 3.3,
            currency: 'PLN',
            interestFirstDays: [
                '2022-08-12', '2022-11-12',
                '2023-02-12', '2023-05-12', '2023-08-12', '2023-11-12',
                '2024-02-12', '2024-05-12', '2024-08-12', '2024-11-12',
                '2025-02-12', '2025-05-12', '2025-08-12', '2025-11-12',
                '2026-02-12', '2026-05-12', '2026-08-12', '2026-11-12',
                '2027-02-12', '2027-05-12'
            ],
            interestRightsDays: [
                '2022-11-03',
                '2023-02-03', '2023-05-04', '2023-08-04', '2023-11-03',
                '2024-02-02', '2024-05-02', '2024-08-02', '2024-10-31',
                '2025-02-04', '2025-05-02', '2025-08-04', '2025-11-03',
                '2026-02-04', '2026-05-04', '2026-08-04', '2026-11-03',
                '2027-02-04', '2027-05-04', '2027-08-04'
            ],
            interestPayoffDays: [
                '2022-11-12',
                '2023-02-12', '2023-05-12', '2023-08-12', '2023-11-12',
                '2024-02-12', '2024-05-12', '2024-08-12', '2024-11-12',
                '2025-02-12', '2025-05-12', '2025-08-12', '2025-11-12',
                '2026-02-12', '2026-05-12', '2026-08-12', '2026-11-12',
                '2027-02-12', '2027-05-12', '2027-08-12'
            ],
            interestPeriods: [{
                firstDay: '2022-08-12',
                rightsDay: '2022-11-03',
                payoffDay: '2022-11-12'
            }, {
                firstDay: '2022-11-12',
                rightsDay: '2023-02-03',
                payoffDay: '2023-02-12'
            }, {
                firstDay: '2023-02-12',
                rightsDay: '2023-05-04',
                payoffDay: '2023-05-12'
            }, {
                firstDay: '2023-05-12',
                rightsDay: '2023-08-04',
                payoffDay: '2023-08-12'
            }, {
                firstDay: '2023-08-12',
                rightsDay: '2023-11-03',
                payoffDay: '2023-11-12'
            }, {
                firstDay: '2023-11-12',
                rightsDay: '2024-02-02',
                payoffDay: '2024-02-12'
            }, {
                firstDay: '2024-02-12',
                rightsDay: '2024-05-02',
                payoffDay: '2024-05-12'
            }, {
                firstDay: '2024-05-12',
                rightsDay: '2024-08-02',
                payoffDay: '2024-08-12'
            }, {
                firstDay: '2024-08-12',
                rightsDay: '2024-10-31',
                payoffDay: '2024-11-12'
            }, {
                firstDay: '2024-11-12',
                rightsDay: '2025-02-04',
                payoffDay: '2025-02-12'
            }, {
                firstDay: '2025-02-12',
                rightsDay: '2025-05-02',
                payoffDay: '2025-05-12'
            }, {
                firstDay: '2025-05-12',
                rightsDay: '2025-08-04',
                payoffDay: '2025-08-12'
            }, {
                firstDay: '2025-08-12',
                rightsDay: '2025-11-03',
                payoffDay: '2025-11-12'
            }, {
                firstDay: '2025-11-12',
                rightsDay: '2026-02-04',
                payoffDay: '2026-02-12'
            }, {
                firstDay: '2026-02-12',
                rightsDay: '2026-05-04',
                payoffDay: '2026-05-12'
            }, {
                firstDay: '2026-05-12',
                rightsDay: '2026-08-04',
                payoffDay: '2026-08-12'
            }, {
                firstDay: '2026-08-12',
                rightsDay: '2026-11-03',
                payoffDay: '2026-11-12'
            }, {
                firstDay: '2026-11-12',
                rightsDay: '2027-02-04',
                payoffDay: '2027-02-12'
            }, {
                firstDay: '2027-02-12',
                rightsDay: '2027-05-04',
                payoffDay: '2027-05-12'
            }, {
                firstDay: '2027-05-12',
                rightsDay: '2027-08-04',
                payoffDay: '2027-08-12'
            }]
        });
    });
});


describe("ObligacjeBondInformationPage", () => {
    it("should parse", () => {
        expect(parseInterestType('zmienne WIBOR 3M +  3.3%')).toEqual({
            variable: 'WIBOR 3M',
            const: 3.3
        });

        expect(parseInterestType('zmienne WIBOR 6M +  1%')).toEqual({
            variable: 'WIBOR 6M',
            const: 1
        });

        expect(parseInterestType('stałe 1.123%')).toEqual({
            variable: undefined,
            const: 1.123
        });

        expect(parseInterestType('obligacje zerokuponowe + 0%')).toEqual({
            variable: undefined,
            const: 0
        });
    });
});
