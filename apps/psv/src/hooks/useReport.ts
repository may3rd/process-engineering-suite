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
            
            const response = await fetch(url, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (!response.ok) {
                throw new Error(`Failed to generate report: ${response.statusText}`);
            }

            const blob = await response.blob();
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
            toast.error(error instanceof Error ? error.message : 'Failed to generate report');
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        isGenerating,
        downloadPsvReport
    };
}
