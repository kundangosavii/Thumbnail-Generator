import { useEffect, useMemo, useState } from 'react'
import { createJob, subscribeToJob, uploadHeadshot } from './api.js'

const initialStats = [
  { label: 'Conversion-ready layouts', value: '3' },
  { label: 'Streamed updates', value: 'Live' },
  { label: 'Brand palette', value: 'Black + White' },
]

function App() {
  const [prompt, setPrompt] = useState('')
  const [numThumbnails, setNumThumbnails] = useState(3)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [error, setError] = useState('')
  const [jobId, setJobId] = useState('')
  const [headshotUrl, setHeadshotUrl] = useState('')
  const [thumbnails, setThumbnails] = useState([])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const readiness = useMemo(() => {
    const completed = [prompt.trim(), file, numThumbnails].filter(Boolean).length
    return `${completed}/3 ready`
  }, [file, numThumbnails, prompt])

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      setFile(null)
      setPreviewUrl('')
      return
    }

    setFile(selectedFile)
    setPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl)
      }

      return URL.createObjectURL(selectedFile)
    })
    setError('')
  }

  const upsertThumbnail = (nextThumbnail) => {
    setThumbnails((current) => {
      const existingIndex = current.findIndex((item) => item.id === nextThumbnail.id)
      if (existingIndex === -1) {
        return [...current, nextThumbnail]
      }

      return current.map((item) => (item.id === nextThumbnail.id ? { ...item, ...nextThumbnail } : item))
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!prompt.trim() || !file) {
      setError('Add a prompt and headshot before generating.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setStatus('Uploading headshot')
    setThumbnails([])
    setJobId('')
    setHeadshotUrl('')

    try {
      const uploadResponse = await uploadHeadshot(file)
      const uploadedUrl = uploadResponse.url
      setHeadshotUrl(uploadedUrl)
      setStatus('Creating job')

      const jobResponse = await createJob(prompt.trim(), uploadedUrl, numThumbnails)
      setJobId(jobResponse.job_id)
      setStatus('Generating thumbnails')

      await subscribeToJob(
        jobResponse.job_id,
        (data) => {
          upsertThumbnail({
            id: data.id,
            style_name: data.style_name,
            imagekit_url: data.imagekit_url,
            variants: data.variants,
            status: 'uploaded',
          })
          setStatus('Streaming results')
        },
        (data) => {
          upsertThumbnail({
            id: data.id,
            style_name: data.style_name,
            error_message: data.error_message,
            status: 'failed',
          })
          setStatus('Partial result ready')
        },
        () => {
          setStatus('Complete')
        },
        () => {
          setStatus('Connection lost')
          setError('The live stream stopped unexpectedly.')
        },
      )
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.')
      setStatus('Idle')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_30%),linear-gradient(180deg,#050505_0%,#0c0c0c_55%,#111111_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border border-white/10 bg-white/5 px-5 py-4 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/55">Thumbnail Studio</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Minimal SaaS dashboard for AI thumbnails</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
            <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2">Black and white system</span>
            <span className="rounded-full border border-white/10 bg-white px-4 py-2 font-medium text-black">Live streaming build</span>
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="overflow-hidden border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/50">
                <span>Design system</span>
                <span className="h-px w-12 bg-white/20" />
                <span>FastAPI powered</span>
              </div>

              <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                    Drop in a headshot, add a thumbnail brief, and stream back a clean set of variations in a quiet black-and-white workspace.
                  </p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {initialStats.map((item) => (
                      <div key={item.label} className="border border-white/10 bg-black/30 px-4 py-4">
                        <p className="text-2xl font-semibold">{item.value}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.28em] text-white/50">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-white/10 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/45">
                    <span>Preview</span>
                    <span>{readiness}</span>
                  </div>

                  <div className="mt-4 aspect-4/5 overflow-hidden border border-dashed border-white/15 bg-white/5">
                    {file && previewUrl ? (
                      <img src={previewUrl} alt="Headshot preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/45">
                        Upload a portrait to see the working canvas here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['01', 'Upload', 'Send a clean portrait and keep the original file intact.'],
                ['02', 'Generate', 'Create a prompt-driven job and start the stream.'],
                ['03', 'Review', 'Collect uploaded thumbnails and ship the best one.'],
              ].map(([step, title, description]) => (
                <div key={step} className="border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/45">{step}</p>
                  <h2 className="mt-4 text-lg font-medium">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <form onSubmit={handleSubmit} className="border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Control panel</p>
                  <h2 className="mt-2 text-xl font-semibold">Build a thumbnail set</h2>
                </div>

                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/55">
                  {status}
                </span>
              </div>

              <div className="mt-6 space-y-5">
                <div className="block">
                  <span className="text-sm font-medium text-white/80">Headshot</span>
                  <label className="mt-2 flex cursor-pointer flex-col gap-3 border border-dashed border-white/15 bg-black/30 p-4 transition hover:border-white/30 hover:bg-white/5">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                    <span className="text-sm text-white/60">{file ? file.name : 'Click to upload a portrait'}</span>
                    <span className="text-xs uppercase tracking-[0.25em] text-white/35">PNG, JPG, or WebP</span>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-white/80">Prompt</span>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={6}
                    placeholder="Example: bold creator thumbnail, monochrome studio lighting, high contrast, cinematic crop"
                    className="mt-2 w-full resize-none border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-white/80">Thumbnail count</span>
                  <select
                    value={numThumbnails}
                    onChange={(event) => setNumThumbnails(Number(event.target.value))}
                    className="mt-2 w-full border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                  >
                    <option value={1}>1 layout</option>
                    <option value={2}>2 layouts</option>
                    <option value={3}>3 layouts</option>
                  </select>
                </label>

                {error ? <p className="border border-white/10 bg-white px-4 py-3 text-sm text-black">{error}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-3 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Working...' : 'Generate thumbnails'}
                </button>
              </div>

              <div className="mt-6 grid gap-3 text-sm text-white/60">
                <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
                  <span>Job ID</span>
                  <span className="max-w-[60%] truncate text-white">{jobId || 'Pending'}</span>
                </div>
                <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
                  <span>Headshot URL</span>
                  <span className="max-w-[60%] truncate text-white">{headshotUrl || 'Not uploaded'}</span>
                </div>
              </div>
            </form>

            <div className="border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">Live output</p>
                  <h3 className="mt-2 text-lg font-semibold">Rendered thumbnails</h3>
                </div>
                <span className="text-xs uppercase tracking-[0.25em] text-white/40">{thumbnails.length} items</span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {thumbnails.length > 0 ? (
                  thumbnails.map((thumbnail) => (
                    <article key={thumbnail.id} className="border border-white/10 bg-black/25 p-3">
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-white/45">
                        <span>{thumbnail.style_name}</span>
                        <span>{thumbnail.status}</span>
                      </div>

                      <div className="mt-3 aspect-video overflow-hidden bg-white/5">
                        {thumbnail.imagekit_url ? (
                          <img src={thumbnail.imagekit_url} alt={thumbnail.style_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-white/45">
                            {thumbnail.error_message || 'Waiting for image'}
                          </div>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="border border-dashed border-white/15 bg-black/20 p-6 text-sm text-white/45">
                    Your generated layouts will appear here once the stream starts.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default App
