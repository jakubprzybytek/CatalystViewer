type ClassificationConfig = {
  classificationsCap?: number;
  forceClassification?: boolean;
};

type UpdatedBond = {
  name: string;
};

type UpdateBondsResultLike = {
  bondsUpdated?: number;
  newBonds?: UpdatedBond[];
  bondsDeactivated?: UpdatedBond[];
  bondsFailed?: string[];
};

type ClassifyIssuerResultLike = {
  success: boolean;
};

type SelectIssuersInputLike = {
  issuers?: string[];
  count?: number;
};

type AnalyzeIssuerResultLike = {
  success: boolean;
};

export function buildBondsInputSummary(input: ClassificationConfig & { updateBonds?: boolean }): Record<string, unknown> {
  return {
    updateBonds: input.updateBonds ?? true,
    classificationsCap: input.classificationsCap ?? 10,
    forceClassification: input.forceClassification ?? false,
  };
}

export function buildBondsOutputSummary(result: UpdateBondsResultLike & { classificationResults?: ClassifyIssuerResultLike[] }): Record<string, unknown> {
  const classificationResults = result.classificationResults ?? [];
  const classified = classificationResults.filter(r => r.success).length;
  const failed = classificationResults.filter(r => !r.success).length;

  return {
    bondsUpdated: result.bondsUpdated ?? 0,
    newBondsCount: result.newBonds?.length ?? 0,
    bondsDeactivatedCount: result.bondsDeactivated?.length ?? 0,
    bondsFailedCount: result.bondsFailed?.length ?? 0,
    classifiedIssuersCount: classified,
    failedClassificationsCount: failed,
  };
}

export function buildAnalysisInputSummary(input: SelectIssuersInputLike): Record<string, unknown> {
  return {
    issuers: input.issuers,
    count: input.count ?? 2,
  };
}

export function buildAnalysisOutputSummary(results: AnalyzeIssuerResultLike[]): Record<string, unknown> {
  const success = results.filter(r => r.success).length;
  const failed = results.length - success;

  return {
    selectedIssuersCount: results.length,
    analyzedIssuersCount: success,
    failedIssuersCount: failed,
  };
}

export function buildErrorSummary(error: unknown, stage?: string): { stage?: string; errorType?: string; message?: string } {
  if (error instanceof Error) {
    return {
      stage,
      errorType: error.name,
      message: error.message,
    };
  }

  if (typeof error === 'string') {
    return {
      stage,
      message: error,
    };
  }

  return {
    stage,
    message: JSON.stringify(error),
  };
}
