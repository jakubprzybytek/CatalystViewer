## Install
```
npm install pug-cli -g
```

## Run using CLI
While in `packages/functions` folder:
```
npx pug src\emails\bondsUpdateReportNotification.pug -P -O "{ dateTime: 'Dsfsd', newBonds: [ { name: 'abc123', issuer: 'Koko', interest: 'WIBOR 3M + 1%' }, { name: 'xyz8900', issuer: 'Moko', interest: '4%' } ] }"
```