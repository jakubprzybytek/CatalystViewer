import { compileFile } from "pug";
import { formatCurrency, formatCompactCurrency } from '@catalyst-viewer/core/common/Formats';
import { UpdateBondsResult, UpdatedBond } from "src/bonds";

type ModifiedUpdatedBond = Omit<UpdatedBond, 'nominalValue' | 'issueValue'> & {
    nominalValue: string;
    issueValue: string;
}

function prepareForRender(updatedBond: UpdatedBond): ModifiedUpdatedBond {
    return {
        ...updatedBond,
        nominalValue: formatCurrency(updatedBond.nominalValue, updatedBond.currency).replace(' ', ' ').replace('ł', 'l'),
        issueValue: formatCompactCurrency(updatedBond.issueValue, updatedBond.currency).replace('ł', 'l')
    };
}

export function buildEmail(updateBondsResult: UpdateBondsResult) {
    const bondsUpdateReportNotificationTemplate = compileFile('packages/functions/src/emails/bondsUpdateReportNotification.pug', { pretty: true });
    return bondsUpdateReportNotificationTemplate({
        dateTime: new Date(),
        newBonds: updateBondsResult.newBonds.map(prepareForRender),
        bondsDeactivated: updateBondsResult.bondsDeactivated.map(prepareForRender)
    });
}