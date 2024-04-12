import { UpdateBondsResult } from "../bonds";
import { buildEmail } from './sendNotification';

const updateBondsResult: UpdateBondsResult = {
  bondsUpdated: 2,
  newBonds: [{
    name: "ABC1234",
    issuer: "Bond IIssuer",
    type: "Corporate bond",
    interestVariable: "WIBOR3M",
    interestConst: 2,
    nominalValue: 1000,
    currency: "PLN",
    issueValue: 1000000
  }],
  bondsDeactivated: [],
  bondsFailed: [ "Bndnd1" ]
};

const emailBody = buildEmail(updateBondsResult); 

console.log(emailBody);
