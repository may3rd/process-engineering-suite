import React from 'react';
import type { VesselCalculationInput, VesselCalculationOutput } from '../types/calculation';
import type { VesselCalculationMetadata } from '../types/persistence';

export interface ExportPdfOptions {
  name: string;
  metadata: VesselCalculationMetadata;
  input: VesselCalculationInput;
  result: VesselCalculationOutput | null;
  fileName?: string;
  generatedAt?: string;
}

export async function exportCalculationPdf({
  name,
  metadata,
  input,
  result,
  fileName,
  generatedAt,
}: ExportPdfOptions): Promise<void> {
  const [{ pdf }, { CalculationReport }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../components/CalculationReport'),
  ]);

  const blob = await pdf(
    <CalculationReport
      name={name}
      metadata={metadata}
      input={input}
      result={result}
      generatedAt={generatedAt}
    />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName ?? `${name || 'vessel-calculation'}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
