const SUBJECT = 'Catalyst Update Report';

// prod gets the plain subject, other stages name themselves in it.
export function reportSubject(stage: string): string {
    return stage === 'prod' ? SUBJECT : `${SUBJECT} (${stage})`;
}
