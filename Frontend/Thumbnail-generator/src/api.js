const API_BASE= 'http://localhost:8000/api';

export async function uploadHeadshot(file){
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/upload-headshot`, {
        method: 'POST',
        body: form
    });
    if(!res.ok){
        throw new Error(`Failed to upload headshot: ${res.statusText}`);
    }
    return res.json();
}

export async function createJob(prompt, headshotUrl, numThumbnails){
    const res = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            prompt, 
            headshot_url: headshotUrl, 
            num_thumbnails: numThumbnails
         
        })
    });
    if(!res.ok){
        throw new Error(`Failed to create job: ${res.statusText}`);
    }
    return res.json();
}

export async function subscribeToJob(jobId, onThumbnailReady, onThumbnailFailed, onJobComplete, onError){
    const eventSource = new EventSource(`${API_BASE}/jobs/${jobId}/stream`);

    eventSource.addEventListener('thumbnail_ready', (event) => {
        const data = JSON.parse(event.data);
        onThumbnailReady(data);
    });
    eventSource.addEventListener('thumbnail_failed', (event) => {
        const data = JSON.parse(event.data);
        onThumbnailFailed(data);
    });
    eventSource.addEventListener('job_complete', (event) => {
        const data = JSON.parse(event.data);
        onJobComplete(data);
    });
    eventSource.onerror = (err) => {
        console.error('EventSource failed:', err);
        onError(err);
        eventSource.close();
    };
}