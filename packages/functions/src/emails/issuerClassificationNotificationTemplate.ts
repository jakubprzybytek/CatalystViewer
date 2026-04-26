export const issuerClassificationNotificationTemplate = `
html
  head
    title Issuer Classification Report
    meta(charset="utf-8")
    style(type="text/css").
      body {
        background-color: #fff8f0;
        font-family: sans-serif;
        -webkit-font-smoothing: antialiased;
        font-size: 14px;
        line-height: 1.4;
        margin: 0;
        padding: 8px;
        -ms-text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%;
      }
      h1, h2, h3 {
        margin: 0px;
        padding: 8px 0 0 0;
      }
      main {
        max-width: 600px;
        margin: auto;
        padding: 0 16px 16px 16px;
        background-color: #ffe0b3;
        border: 1px solid brown;
        border-radius: 16px;
      }
      .header {
        text-align: center;
      }
      .section {
        margin-top: 12px;
      }
      .classified-list {
        margin-top: 8px;
      }
      .classified-item {
        background-color: #fff3df;
        border: 1px solid #e4b26f;
        border-radius: 10px;
        padding: 8px 10px;
        margin-top: 8px;
      }
      .row {
        display: block;
        margin-top: 4px;
      }
      .row:first-child {
        margin-top: 0;
      }
      .label {
        color: #6a3f1f;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.2px;
        text-transform: uppercase;
      }
      .value {
        color: #2f1f12;
        font-weight: 500;
      }
      .summary-value {
        color: #4f3728;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }
      th {
        text-align: left;
        border-bottom: 2px solid brown;
        padding: 4px 8px;
        background-color: #ffcc80;
      }
      td {
        padding: 4px 8px;
        border-bottom: 1px solid #ffcc80;
        vertical-align: top;
      }
      @media (max-width: 540px) {
        body {
          font-size: 13px;
          padding: 4px;
        }
        main {
          padding: 0 10px 12px 10px;
          border-radius: 12px;
        }
        .classified-item {
          padding: 8px;
        }
        .label {
          font-size: 11px;
        }
      }
      .error {
        color: #b71c1c;
      }
  body
    main
      div(class="header")
        h1 Issuer Classification Report
        p Date: #{dateTime.toLocaleString("pl-PL")}
      if classifiedIssuers.length > 0
        div(class="section")
          h2 Classified (#{classifiedIssuers.length})
          div(class="classified-list")
            each issuer in classifiedIssuers
              div(class="classified-item")
                div(class="row")
                  span(class="label") Issuer:
                  | 
                  span(class="value") #{issuer.issuerName}
                div(class="row")
                  span(class="label") Industry:
                  | 
                  span(class="value") #{issuer.industry}
                div(class="row")
                  span(class="label") Summary:
                div(class="row summary-value") #{issuer.businessSummary}
      if failedIssuers.length > 0
        div(class="section")
          h2 Failed (#{failedIssuers.length})
          table
            thead
              tr
                th Issuer
                th Error
            tbody
              each issuer in failedIssuers
                tr
                  td #{issuer.issuerName}
                  td(class="error") #{issuer.errorReason}
`;