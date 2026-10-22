import { useRef, useState } from 'react'
import { initials } from '@/lib/format'
import { photoToDataUrl } from '@/lib/photo'
import { Spinner } from './Spinner'

/**
 * The profile photo: the picture (or initials when there is none), a button to
 * choose one, and one to remove it. The file box itself is hidden; a real button
 * opens it, so the control is reached and named like every other button.
 * Changes are only kept when the form is saved, and the status line says so.
 * `stacked` puts the picture above the buttons, for a narrow corner of a page, with
 * no label or help text: just the picture and the buttons.
 */
export function PhotoField({ id, name, value, onChange, stacked = false }: {
  id: string
  /** The applicant's name, for the initials shown without a photo. */
  name: string
  value?: string | null
  onChange: (dataUrl: string | null) => void
  stacked?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const errorId = `${id}-error`

  const choose = async (file: File | undefined) => {
    if (!file) return
    setBusy(true); setError(''); setStatus('')
    try {
      onChange(await photoToDataUrl(file))
      setStatus('Photo added. Save your resume to keep it.')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = '' // choosing the same file again still works
    }
  }

  const remove = () => {
    onChange(null); setError('')
    setStatus('Photo removed. Save your resume to keep this change.')
    // the Remove button disappears with the photo, so focus goes to the choose button
    requestAnimationFrame(() => document.getElementById(id)?.focus())
  }

  return (
    <div className={stacked ? 'flex flex-col items-center text-center gap-3 w-64 max-w-full' : 'flex flex-wrap items-center gap-5'}>
      {value ? (
        <img src={value} alt="Your profile photo" className="w-24 h-24 shrink-0 rounded-full object-cover border border-gray-300" />
      ) : (
        <span aria-hidden="true" className="w-24 h-24 shrink-0 rounded-full bg-[#1a4fa0] text-white text-3xl font-bold grid place-items-center">
          {initials(name || '?')}
        </span>
      )}
      <div className={stacked ? 'w-full' : 'min-w-0 flex-1 basis-60'}>
        {!stacked && (
          <>
            <p id={`${id}-label`} className="field-label">Profile photo <span className="font-normal text-gray-600">(optional)</span></p>
            <p id={`${id}-help`} className="text-sm text-gray-600">
              {value ? 'Employers see this photo when you apply.' : 'No photo yet; your initials are shown instead. Employers see the photo when you apply.'} A JPG or PNG; on a phone you can take one with the camera.
            </p>
          </>
        )}
        <div className={`flex flex-wrap gap-3 ${stacked ? 'justify-center' : 'mt-2'}`}>
          <button type="button" id={id} onClick={() => fileRef.current?.click()} disabled={busy} aria-busy={busy}
            aria-describedby={[stacked ? '' : `${id}-help`, error ? errorId : ''].filter(Boolean).join(' ') || undefined}
            className="min-h-11 px-5 rounded-md border border-[#1a4fa0] text-[#1a4fa0] font-semibold text-sm hover:bg-blue-50 flex items-center gap-2 disabled:opacity-70">
            {busy ? <Spinner label="Preparing the photo" /> : value ? 'Change photo' : 'Upload photo'}
          </button>
          {value && !busy && (
            <button type="button" onClick={remove}
              className="min-h-11 px-5 rounded-md border border-gray-500 text-gray-800 font-semibold text-sm hover:bg-gray-100">
              Remove photo
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" tabIndex={-1} aria-hidden="true" className="hidden"
          onChange={(e) => choose(e.target.files?.[0])} />
        {error && <p id={errorId} role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
        <p role="status" className="mt-2 text-sm text-gray-800 min-h-5">{status}</p>
      </div>
    </div>
  )
}
