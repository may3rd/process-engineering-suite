import { useState } from 'react';
import { getDataService, API_BASE_URL } from '@/lib/api';
import { toast } from '@/lib/toast';

export function useReport() {
    const [isGenerating, setIsGenerating] = useState(false);

    const downloadPsvReport = async (psvId: string, tag: string) => {
        setIsGenerating(true);
        const dataService = getDataService();
        
        try {
            // For the API client, we use fetch to ensure the Authorization header is included
            // and then create a blob for download.
            const url = `${API_BASE_URL}/psv/${psvId}/report`;
            const token = localStorage.getItem('accessToken');
            
            // Add a timeout to the request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(url, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(errorData.detail || `Failed to generate report (HTTP ${response.status})`);
            }

            const blob = await response.blob();
            if (blob.size === 0) {
                throw new Error('Received an empty report from the server');
            }

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `PSV_Report_${tag}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            
            toast.success('Report downloaded successfully');
        } catch (error) {
            console.error('Report generation error:', error);
            if (error instanceof Error && error.name === 'AbortError') {
                toast.error('Report generation timed out. Please try again.');
            } else {
                toast.error(error instanceof Error ? error.message : 'Failed to generate report');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        isGenerating,
        downloadPsvReport
    };
}
